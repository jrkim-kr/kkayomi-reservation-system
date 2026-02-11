import { formatDate, formatTime, formatPrice } from "@/lib/utils";
import type { NotificationType } from "@/types";

interface TemplateParams {
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

/** 알림톡 템플릿 메시지 생성 */
export function buildMessage(
  type: NotificationType,
  params: TemplateParams
): string {
  const date = formatDate(params.date);
  const time = formatTime(params.time);
  const price = formatPrice(params.price);

  switch (type) {
    case "approval":
      return [
        `[까요미 공방] 예약 접수 및 입금 안내`,
        ``,
        `${params.customerName}님, 예약이 접수되었습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 일시: ${date} ${time}`,
        `■ 금액: ${price}`,
        ``,
        params.bankInfo
          ? `▶ 입금 계좌: ${params.bankInfo}`
          : `▶ 입금 계좌 안내는 별도 연락드립니다.`,
        params.depositDeadlineHours
          ? `▶ ${params.depositDeadlineHours}시간 이내 입금 부탁드립니다.`
          : `▶ 빠른 시일 내 입금 부탁드립니다.`,
        ``,
        `입금 확인 후 확정 안내를 드립니다.`,
      ].join("\n");

    case "confirmation":
      return [
        `[까요미 공방] 예약 확정 안내`,
        ``,
        `${params.customerName}님, 입금이 확인되어 예약이 확정되었습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 일시: ${date} ${time}`,
        `■ 금액: ${price}`,
        ``,
        `일정 변경이 필요하신 경우 아래 링크를 이용해 주세요.`,
        params.changeToken
          ? `▶ ${process.env.NEXT_PUBLIC_BASE_URL}/booking/change/${params.changeToken}`
          : "",
        ``,
        `감사합니다. 까요미 공방에서 뵙겠습니다!`,
      ].join("\n");

    case "rejection":
      return [
        `[까요미 공방] 예약 반려 안내`,
        ``,
        `${params.customerName}님, 죄송합니다.`,
        `요청하신 예약이 반려되었습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 일시: ${date} ${time}`,
        params.rejectReason ? `■ 사유: ${params.rejectReason}` : "",
        ``,
        `다른 일정으로 다시 예약해 주시면 감사하겠습니다.`,
      ].join("\n");

    case "cancellation":
      return [
        `[까요미 공방] 예약 취소 안내`,
        ``,
        `${params.customerName}님, 예약이 취소되었습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 일시: ${date} ${time}`,
        ``,
        `문의사항은 카카오톡 채널로 연락 부탁드립니다.`,
      ].join("\n");

    case "change_approved":
      return [
        `[까요미 공방] 일정 변경 승인 안내`,
        ``,
        `${params.customerName}님, 일정 변경이 승인되었습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 변경 전: ${date} ${time}`,
        params.requestedDate && params.requestedTime
          ? `■ 변경 후: ${formatDate(params.requestedDate)} ${formatTime(params.requestedTime)}`
          : "",
        ``,
        `변경된 일정으로 뵙겠습니다!`,
      ].join("\n");

    case "change_rejected":
      return [
        `[까요미 공방] 일정 변경 거절 안내`,
        ``,
        `${params.customerName}님, 죄송합니다.`,
        `요청하신 일정 변경이 승인되지 않았습니다.`,
        ``,
        `■ 수업: ${params.className}`,
        `■ 현재 일정: ${date} ${time}`,
        params.rejectReason ? `■ 사유: ${params.rejectReason}` : "",
        ``,
        `기존 일정 그대로 진행됩니다.`,
      ].join("\n");

    default:
      return "";
  }
}
