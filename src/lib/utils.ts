/** 전화번호 자동 포맷 (010-XXXX-XXXX) */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 가격 포맷 (원) */
export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

/** 날짜 포맷 (YYYY.MM.DD) */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 시간 포맷 (HH:MM) */
export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/** 오늘 날짜 (YYYY-MM-DD) */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 30분 단위 시간 목록 생성 */
export function generateTimeSlots(
  startHour = 10,
  endHour = 20
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

/** 예약 상태 한글 라벨 */
export const STATUS_LABELS: Record<string, string> = {
  pending: "입금 대기",
  confirmed: "확정(입금 완료)",
  rejected: "반려",
  cancelled: "취소",
};
