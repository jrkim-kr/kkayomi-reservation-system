import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google/calendar";
import { appendReservationRow, deleteReservationRow } from "@/lib/google/sheets";
import { sendNotification } from "@/lib/notifications/send";
import type { NotificationType } from "@/types";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["cancelled"],
};

/** 상태 변경 → 알림 유형 매핑 */
const STATUS_TO_NOTIFICATION: Record<string, NotificationType> = {
  confirmed: "confirmation",
  rejected: "rejection",
  cancelled: "cancellation",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await request.json();
  const { status, admin_memo, reject_reason, cancel_reason } = body;

  // 현재 예약 + 수업 정보 조회 (외부 연동에 필요)
  const { data: reservation, error: findError } = await supabase
    .from("reservation_details")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !reservation) {
    return NextResponse.json(
      { error: "예약을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 업데이트할 필드 구성
  const updateData: Record<string, unknown> = {};

  // 상태 변경 요청이 있는 경우 유효성 검증
  if (status) {
    const allowedTransitions = VALID_TRANSITIONS[reservation.status];

    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `'${reservation.status}' 상태에서 '${status}' 상태로 변경할 수 없습니다.`,
        },
        { status: 400 }
      );
    }

    updateData.status = status;
  }

  if (admin_memo !== undefined) {
    updateData.admin_memo = admin_memo;
  }

  if (reject_reason !== undefined && status === "rejected") {
    updateData.reject_reason = reject_reason;
  }

  // 취소 요청 반려: cancel_reason 클리어 + reject_reason에 반려 사유 저장
  if (cancel_reason === null) {
    updateData.cancel_reason = null;
    updateData.reject_reason = reject_reason || "취소 요청이 반려되었습니다.";
  }

  // 취소 승인 시 이전 취소 반려 사유 클리어
  if (reject_reason === null) {
    updateData.reject_reason = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 }
    );
  }

  // --- DB 업데이트 ---
  const { data, error } = await supabase
    .from("reservations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "예약 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // --- 외부 연동 (실패해도 예약 상태 변경은 유지) ---
  if (status) {
    const settingsMap = await getSettingsMap(supabase);

    // confirmed → Google Calendar 이벤트 생성 + Google Sheets 행 추가
    if (status === "confirmed") {
      const calendarId = (settingsMap.google_calendar_id as string) || process.env.GOOGLE_CALENDAR_ID || "";
      const eventId = await createCalendarEvent({
        calendarId,
        reservationId: id,
        className: reservation.class_name,
        customerName: reservation.customer_name,
        customerPhone: reservation.customer_phone,
        date: reservation.desired_date,
        time: reservation.desired_time,
        durationMinutes: reservation.duration_minutes,
        numPeople: reservation.num_people ?? 1,
        memo: reservation.customer_memo,
        calendarPrefix: settingsMap.calendar_event_prefix as string | undefined,
      });

      if (eventId) {
        await supabase
          .from("reservations")
          .update({ google_calendar_event_id: eventId })
          .eq("id", id);
      }

      const sheetsId = (settingsMap.google_sheets_spreadsheet_id as string) || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
      const rowNumber = await appendReservationRow(sheetsId, {
        createdAt: reservation.created_at,
        confirmedAt: new Date().toISOString(),
        className: reservation.class_name,
        customerName: reservation.customer_name,
        customerPhone: reservation.customer_phone,
        numPeople: reservation.num_people ?? 1,
        date: reservation.desired_date,
        time: reservation.desired_time,
        price: reservation.price,
        status: "확정",
        memo: reservation.admin_memo,
      });

      if (rowNumber) {
        await supabase
          .from("reservations")
          .update({ google_sheets_row: rowNumber })
          .eq("id", id);
      }
    }

    // cancelled → Google Calendar 이벤트 삭제 + Google Sheets 행 삭제 + 대기 중인 변경 요청 자동 거절
    if (status === "cancelled") {
      // reservation_details 뷰에 google_calendar_event_id, google_sheets_row가 없으므로 직접 조회
      const { data: resRow } = await supabase
        .from("reservations")
        .select("google_calendar_event_id, google_sheets_row")
        .eq("id", id)
        .single();

      if (resRow?.google_calendar_event_id) {
        const calendarId = (settingsMap.google_calendar_id as string) || process.env.GOOGLE_CALENDAR_ID || "";
        await deleteCalendarEvent(calendarId, resRow.google_calendar_event_id);
      }

      if (resRow?.google_sheets_row) {
        const sheetsIdForCancel = (settingsMap.google_sheets_spreadsheet_id as string) || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
        const deleted = await deleteReservationRow(sheetsIdForCancel, resRow.google_sheets_row);

        if (deleted) {
          const deletedRow = resRow.google_sheets_row;

          // 현재 예약의 google_sheets_row 초기화
          await supabase
            .from("reservations")
            .update({ google_sheets_row: null })
            .eq("id", id);

          // 삭제된 행 아래에 있던 예약들의 row 번호를 1씩 감소
          const { data: affected } = await supabase
            .from("reservations")
            .select("id, google_sheets_row")
            .gt("google_sheets_row", deletedRow);

          if (affected) {
            await Promise.all(
              affected.map((r) =>
                supabase
                  .from("reservations")
                  .update({ google_sheets_row: r.google_sheets_row - 1 })
                  .eq("id", r.id)
              )
            );
          }
        }
      }

      // 대기 중인 변경 요청이 있으면 자동 거절 처리
      await supabase
        .from("change_requests")
        .update({
          status: "rejected",
          reject_reason: "예약이 취소되어 자동 거절되었습니다.",
        })
        .eq("reservation_id", id)
        .eq("status", "pending");
    }

    // 알림톡 발송
    const notificationType = STATUS_TO_NOTIFICATION[status];
    if (notificationType) {
      await sendNotification({
        reservationId: id,
        type: notificationType,
        recipientPhone: reservation.customer_phone,
        customerName: reservation.customer_name,
        className: reservation.class_name,
        date: reservation.desired_date,
        time: reservation.desired_time,
        price: reservation.price,
        rejectReason: reject_reason,
        bankInfo: settingsMap.bank_info as string | null,
        depositDeadlineHours: settingsMap.deposit_deadline_hours as number | null,
        changeToken: data.change_token,
        storeName: settingsMap.notification_sender_name as string | undefined,
      });
    }
  }

  return NextResponse.json(data);
}

/** admin_settings에서 설정값 조회 */
async function getSettingsMap(
  supabase: Awaited<ReturnType<typeof createAdminClient>>
) {
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["bank_info", "deposit_deadline_hours", "notification_sender_name", "calendar_event_prefix", "google_calendar_id", "google_sheets_spreadsheet_id"]);

  return Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value])
  );
}
