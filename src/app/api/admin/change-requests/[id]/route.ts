import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateCalendarEvent } from "@/lib/google/calendar";
import { updateReservationRow } from "@/lib/google/sheets";
import { sendNotification } from "@/lib/notifications/send";

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
  const { status, reject_reason } = body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "유효하지 않은 상태입니다. 'approved' 또는 'rejected'만 가능합니다." },
      { status: 400 }
    );
  }

  // 변경 요청 조회
  const { data: changeRequest, error: findError } = await supabase
    .from("change_requests")
    .select("id, status, reservation_id, schedule_id, requested_date, requested_time")
    .eq("id", id)
    .single();

  if (findError || !changeRequest) {
    return NextResponse.json(
      { error: "변경 요청을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (changeRequest.status !== "pending") {
    return NextResponse.json(
      { error: "이미 처리된 변경 요청입니다." },
      { status: 400 }
    );
  }

  // 예약 + 수업 정보 조회 (알림/캘린더 연동에 필요)
  const [{ data: reservation }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("reservation_details")
      .select("*")
      .eq("id", changeRequest.reservation_id)
      .single(),
    supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["notification_sender_name", "google_calendar_id", "google_sheets_spreadsheet_id"]),
  ]);

  const settingsMap = Object.fromEntries(
    (settingsRows ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value])
  );

  if (status === "approved") {
    // 변경 요청 승인 처리
    const { error: updateRequestError } = await supabase
      .from("change_requests")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateRequestError) {
      return NextResponse.json(
        { error: "변경 요청 승인 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 예약의 날짜/시간/스케줄 업데이트
    const reservationUpdate: Record<string, unknown> = {
      desired_date: changeRequest.requested_date,
      desired_time: changeRequest.requested_time,
    };
    if (changeRequest.schedule_id) {
      reservationUpdate.schedule_id = changeRequest.schedule_id;
    }
    const { error: updateReservationError } = await supabase
      .from("reservations")
      .update(reservationUpdate)
      .eq("id", changeRequest.reservation_id);

    if (updateReservationError) {
      return NextResponse.json(
        { error: "예약 날짜/시간 변경 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // Google 연동 정보 조회 (reservation_details 뷰에 포함되지 않으므로 직접 조회)
    const { data: resRow } = await supabase
      .from("reservations")
      .select("google_calendar_event_id, google_sheets_row")
      .eq("id", changeRequest.reservation_id)
      .single();

    // Google Calendar 이벤트 일시 업데이트
    if (resRow?.google_calendar_event_id) {
      const calendarId = (settingsMap.google_calendar_id as string) || process.env.GOOGLE_CALENDAR_ID || "";
      await updateCalendarEvent({
        calendarId,
        eventId: resRow.google_calendar_event_id,
        date: changeRequest.requested_date,
        time: changeRequest.requested_time,
        durationMinutes: reservation?.duration_minutes,
      });
    }

    // Google Sheets 날짜/시간 업데이트
    if (resRow?.google_sheets_row) {
      const sheetsId = (settingsMap.google_sheets_spreadsheet_id as string) || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
      await updateReservationRow(sheetsId, resRow.google_sheets_row, {
        date: changeRequest.requested_date,
        time: changeRequest.requested_time,
      });
    }

    // 변경 승인 알림톡 발송
    if (reservation) {
      await sendNotification({
        reservationId: changeRequest.reservation_id,
        type: "change_approved",
        recipientPhone: reservation.customer_phone,
        customerName: reservation.customer_name,
        className: reservation.class_name,
        date: reservation.desired_date,
        time: reservation.desired_time,
        price: reservation.price,
        requestedDate: changeRequest.requested_date,
        requestedTime: changeRequest.requested_time,
        storeName: settingsMap.notification_sender_name as string | undefined,
      });
    }
  } else {
    // 변경 요청 거절 처리
    const { error: updateError } = await supabase
      .from("change_requests")
      .update({
        status: "rejected",
        reject_reason: reject_reason || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "변경 요청 거절 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 변경 거절 알림톡 발송
    if (reservation) {
      await sendNotification({
        reservationId: changeRequest.reservation_id,
        type: "change_rejected",
        recipientPhone: reservation.customer_phone,
        customerName: reservation.customer_name,
        className: reservation.class_name,
        date: reservation.desired_date,
        time: reservation.desired_time,
        price: reservation.price,
        rejectReason: reject_reason,
        storeName: settingsMap.notification_sender_name as string | undefined,
      });
    }
  }

  // 처리 후 최신 데이터 반환
  const { data: updated, error: fetchError } = await supabase
    .from("change_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: "처리된 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
}
