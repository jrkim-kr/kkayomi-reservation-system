import { createAdminClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { syncAllReservationRows } from "@/lib/google/sheets";
import { createCalendarEvent } from "@/lib/google/calendar";

// ---------------------------------------------------------------------------
// GET  – 전체 설정 조회
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createAdminClient();

  // 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .order("key");

  if (error) {
    return NextResponse.json(
      { error: "설정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// PATCH – 설정 일괄 업데이트 (upsert) + Google Sheets/Calendar 재동기화
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // body: { settings: Array<{ key: string; value: unknown }> }
    const settings: { key: string; value: unknown }[] = body.settings;

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { error: "변경할 설정이 없습니다." },
        { status: 400 }
      );
    }

    // 허용된 키 목록
    const ALLOWED_KEYS = [
      "store_name",
      "store_description",
      "booking_button_label",
      "booking_page_title",
      "booking_step1_label",
      "notification_sender_name",
      "calendar_event_prefix",
      "bank_info",
      "deposit_deadline_hours",
      "workshop_address",
      "instagram_handle",
      "kakao_channel_id",
      "sms_sender_number",
      "kakao_enabled",
      "google_calendar_id",
      "google_sheets_spreadsheet_id",
      "aligo_api_key",
      "aligo_user_id",
      "aligo_sender_key",
    ];

    const invalidKeys = settings
      .map((s) => s.key)
      .filter((k) => !ALLOWED_KEYS.includes(k));

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `허용되지 않는 설정 키: ${invalidKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // 관리자 권한 확인 (service role로 RLS 우회)
    const serviceClient = await createServiceClient();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // upsert 전에 기존 값 조회 (변경 감지용)
    const { data: prevSettings } = await serviceClient
      .from("admin_settings")
      .select("key, value")
      .in("key", ["google_sheets_spreadsheet_id", "google_calendar_id"]);
    const prevMap = Object.fromEntries(
      (prevSettings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value])
    );

    const { data, error } = await serviceClient
      .from("admin_settings")
      .upsert(
        settings.map((s) => ({
          key: s.key,
          value: s.value,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "key" }
      )
      .select();

    if (error) {
      console.error("[PATCH /api/admin/settings] Supabase error:", error);
      return NextResponse.json(
        { error: `설정 저장 중 오류가 발생했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    // --- Google Sheets / Calendar 동기화 ---
    const settingsMap = Object.fromEntries(
      settings.map((s) => [s.key, s.value])
    );
    const sheetsId = (settingsMap.google_sheets_spreadsheet_id as string) || "";
    const calendarId = (settingsMap.google_calendar_id as string) || "";
    const calendarPrefix = (settingsMap.calendar_event_prefix as string) || "";

    const prevSheetsId = (prevMap.google_sheets_spreadsheet_id as string) || "";
    const sheetsChanged = sheetsId && sheetsId !== prevSheetsId;

    const sync = { sheets: 0, calendar: 0 };

    if (sheetsChanged || calendarId) {
      // confirmed 예약 + 수업 정보 조회
      const { data: reservations } = await serviceClient
        .from("reservation_details")
        .select("*")
        .eq("status", "confirmed")
        .order("desired_date", { ascending: true });

      // num_people, google_calendar_event_id 보완
      const ids = (reservations ?? []).map((r: { id: string }) => r.id);
      let extraMap: Record<string, { num_people: number; google_calendar_event_id: string | null }> = {};
      if (ids.length > 0) {
        const { data: extraRows } = await serviceClient
          .from("reservations")
          .select("id, num_people, confirmed_at, google_calendar_event_id")
          .in("id", ids);
        if (extraRows) {
          extraMap = Object.fromEntries(
            extraRows.map((r: { id: string; num_people: number; google_calendar_event_id: string | null }) => [
              r.id,
              { num_people: r.num_people, google_calendar_event_id: r.google_calendar_event_id },
            ])
          );
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const confirmed: any[] = (reservations ?? []).map((r: any) => ({
        ...r,
        num_people: extraMap[r.id]?.num_people ?? 1,
        google_calendar_event_id: extraMap[r.id]?.google_calendar_event_id ?? null,
      }));

      // Google Sheets 동기화 (ID가 변경됐을 때만: clear → 전체 재추가)
      if (sheetsChanged) {
        try {
          const rowResults = await syncAllReservationRows(
            sheetsId,
            confirmed.map((r) => ({
              reservationId: r.id,
              createdAt: r.created_at,
              confirmedAt: r.confirmed_at || r.created_at,
              className: r.class_name,
              customerName: r.customer_name,
              customerPhone: r.customer_phone,
              numPeople: r.num_people,
              date: r.desired_date,
              time: r.desired_time,
              price: r.price,
              status: "확정",
              memo: r.admin_memo || null,
            }))
          );

          for (const { reservationId, row } of rowResults) {
            await serviceClient
              .from("reservations")
              .update({ google_sheets_row: row })
              .eq("id", reservationId);
          }
          sync.sheets = rowResults.length;
        } catch (err) {
          console.error("[Settings] Sheets 동기화 실패:", err);
        }
      }

      // Google Calendar 동기화 (이벤트가 없는 예약만 새로 생성 → 중복 방지)
      if (calendarId) {
        const needsEvent = confirmed.filter((r) => !r.google_calendar_event_id);
        if (needsEvent.length > 0) {
          try {
            const results = await Promise.allSettled(
              needsEvent.map(async (r) => {
                const eventId = await createCalendarEvent({
                  calendarId,
                  reservationId: r.id,
                  className: r.class_name,
                  customerName: r.customer_name,
                  customerPhone: r.customer_phone,
                  date: r.desired_date,
                  time: r.desired_time,
                  durationMinutes: r.duration_minutes,
                  numPeople: r.num_people,
                  memo: r.customer_memo,
                  calendarPrefix: calendarPrefix || undefined,
                });
                if (eventId) {
                  await serviceClient
                    .from("reservations")
                    .update({ google_calendar_event_id: eventId })
                    .eq("id", r.id);
                }
                return eventId;
              })
            );
            sync.calendar = results.filter(
              (r) => r.status === "fulfilled" && r.value
            ).length;
          } catch (err) {
            console.error("[Settings] Calendar 동기화 실패:", err);
          }
        }
      }
    }

    return NextResponse.json({ settings: data, sync });
  } catch (err) {
    console.error("[PATCH /api/admin/settings] Unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
