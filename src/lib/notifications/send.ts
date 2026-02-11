import { createServiceClient } from "@/lib/supabase/server";
import { sendKakaoAlimtalk, TEMPLATE_CODES } from "./kakao";
import { sendSms } from "./sms";
import { buildMessage } from "./templates";
import type { NotificationType } from "@/types";

interface SendNotificationParams {
  reservationId: string;
  type: NotificationType;
  recipientPhone: string;
  customerName: string;
  className: string;
  date: string;
  time: string;
  price: number;
  rejectReason?: string | null;
  bankInfo?: string | null;
  depositDeadlineHours?: number | null;
  changeToken?: string | null;
  requestedDate?: string | null;
  requestedTime?: string | null;
}

interface SendNotificationResult {
  success: boolean;
  channel: "kakao" | "sms";
  error?: string;
}

/** 알림 발송 (카카오 알림톡 → SMS fallback) + DB 기록 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const supabase = await createServiceClient();

  // kakao_enabled 설정 확인
  const { data: setting } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "kakao_enabled")
    .single();

  const kakaoEnabled = setting?.value === true;

  if (!kakaoEnabled) {
    return { success: true, channel: "kakao" };
  }

  const message = buildMessage(params.type, {
    customerName: params.customerName,
    className: params.className,
    date: params.date,
    time: params.time,
    price: params.price,
    rejectReason: params.rejectReason,
    bankInfo: params.bankInfo,
    depositDeadlineHours: params.depositDeadlineHours,
    changeToken: params.changeToken,
    requestedDate: params.requestedDate,
    requestedTime: params.requestedTime,
  });

  // 1) 카카오 알림톡 시도
  const templateCode = TEMPLATE_CODES[params.type] ?? params.type;
  const kakaoResult = await sendKakaoAlimtalk({
    recipientPhone: params.recipientPhone,
    templateCode,
    message,
  });

  if (kakaoResult.success) {
    await logNotification(supabase, {
      reservationId: params.reservationId,
      type: params.type,
      channel: "kakao",
      recipientPhone: params.recipientPhone,
      message,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    return { success: true, channel: "kakao" };
  }

  // 2) 카카오 실패 → SMS fallback
  console.warn(
    `[Notification] 카카오 알림톡 실패 (${kakaoResult.error}), SMS 대체 발송 시도`
  );

  const smsResult = await sendSms({
    recipientPhone: params.recipientPhone,
    message,
  });

  if (smsResult.success) {
    await logNotification(supabase, {
      reservationId: params.reservationId,
      type: params.type,
      channel: "sms",
      recipientPhone: params.recipientPhone,
      message,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    return { success: true, channel: "sms" };
  }

  // 3) 둘 다 실패
  const errorMsg = `카카오: ${kakaoResult.error} / SMS: ${smsResult.error}`;
  await logNotification(supabase, {
    reservationId: params.reservationId,
    type: params.type,
    channel: "kakao",
    recipientPhone: params.recipientPhone,
    message,
    status: "failed",
    errorMessage: errorMsg,
  });

  return { success: false, channel: "kakao", error: errorMsg };
}

/** 알림 발송 기록 저장 */
async function logNotification(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  data: {
    reservationId: string;
    type: string;
    channel: "kakao" | "sms";
    recipientPhone: string;
    message: string;
    status: "sent" | "failed";
    sentAt?: string;
    errorMessage?: string;
  }
) {
  const { error } = await supabase.from("notifications").insert({
    reservation_id: data.reservationId,
    type: data.type,
    channel: data.channel,
    recipient_phone: data.recipientPhone,
    message: data.message,
    status: data.status,
    sent_at: data.sentAt ?? null,
    error_message: data.errorMessage ?? null,
  });

  if (error) {
    console.error("[Notification] DB 기록 실패:", error);
  }
}

/** 기존 알림 재발송 (notifications 테이블의 id 기반) */
export async function resendNotification(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServiceClient();

  // 기존 알림 조회
  const { data: notification, error: findError } = await supabase
    .from("notifications")
    .select("*, reservations(customer_name, customer_phone, class_id, desired_date, desired_time, change_token, classes(name, price))")
    .eq("id", notificationId)
    .single();

  if (findError || !notification) {
    return { success: false, error: "알림을 찾을 수 없습니다." };
  }

  const reservation = notification.reservations;
  if (!reservation) {
    return { success: false, error: "예약 정보를 찾을 수 없습니다." };
  }

  // 카카오 알림톡 재시도
  const templateCode = TEMPLATE_CODES[notification.type] ?? notification.type;
  const kakaoResult = await sendKakaoAlimtalk({
    recipientPhone: notification.recipient_phone,
    templateCode,
    message: notification.message,
  });

  if (kakaoResult.success) {
    // 기존 레코드 상태 업데이트
    await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", notificationId);
    return { success: true };
  }

  // SMS fallback
  const smsResult = await sendSms({
    recipientPhone: notification.recipient_phone,
    message: notification.message,
  });

  if (smsResult.success) {
    await supabase
      .from("notifications")
      .update({
        channel: "sms",
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", notificationId);
    return { success: true };
  }

  // 실패
  const errorMsg = `카카오: ${kakaoResult.error} / SMS: ${smsResult.error}`;
  await supabase
    .from("notifications")
    .update({ error_message: errorMsg })
    .eq("id", notificationId);

  return { success: false, error: errorMsg };
}
