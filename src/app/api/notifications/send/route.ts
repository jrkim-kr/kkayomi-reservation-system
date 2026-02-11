import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications/send";
import { NextRequest, NextResponse } from "next/server";
import type { NotificationType } from "@/types";

/**
 * POST /api/notifications/send
 * 알림톡 수동 발송 API (관리자 전용)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { reservationId, type } = body as {
    reservationId: string;
    type: NotificationType;
  };

  if (!reservationId || !type) {
    return NextResponse.json(
      { error: "reservationId와 type은 필수입니다." },
      { status: 400 }
    );
  }

  // 예약 + 수업 정보 조회
  const { data: reservation, error: findError } = await supabase
    .from("reservation_details")
    .select("*")
    .eq("id", reservationId)
    .single();

  if (findError || !reservation) {
    return NextResponse.json(
      { error: "예약을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 설정에서 입금 정보 가져오기
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["bank_info", "deposit_deadline_hours"]);

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value])
  );

  const result = await sendNotification({
    reservationId: reservation.id,
    type,
    recipientPhone: reservation.customer_phone,
    customerName: reservation.customer_name,
    className: reservation.class_name,
    date: reservation.desired_date,
    time: reservation.desired_time,
    price: reservation.price,
    rejectReason: reservation.reject_reason,
    bankInfo: settingsMap.bank_info as string | null,
    depositDeadlineHours: settingsMap.deposit_deadline_hours as number | null,
    changeToken: reservation.change_token,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "알림 발송에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    channel: result.channel,
  });
}
