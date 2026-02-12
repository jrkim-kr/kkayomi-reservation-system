// 예약 상태
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled";

// 알림 채널
export type NotificationChannel = "kakao" | "sms";

// 알림 발송 상태
export type NotificationStatus = "pending" | "sent" | "failed";

// 알림 유형
export type NotificationType =
  | "approval"
  | "confirmation"
  | "rejection"
  | "cancellation"
  | "change_approved"
  | "change_rejected";

// 변경 요청 상태
export type ChangeRequestStatus = "pending" | "approved" | "rejected";

// DB 테이블 타입
export interface Class {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  max_participants: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string | null;
  class_id: string;
  schedule_id: string | null;
  customer_name: string;
  customer_phone: string;
  depositor_name: string;
  desired_date: string;
  desired_time: string;
  num_people: number;
  customer_memo: string | null;
  status: ReservationStatus;
  admin_memo: string | null;
  reject_reason: string | null;
  cancel_reason: string | null;
  approved_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  change_token: string;
  google_calendar_event_id: string | null;
  google_sheets_row: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationDetail extends Reservation {
  class_name: string;
  duration_minutes: number;
  price: number;
  max_participants: number;
  user_email: string | null;
}

// 스케줄 슬롯 (공개 API 응답)
export interface ScheduleSlot {
  schedule_id: string;
  schedule_date: string;
  start_time: string;
  max_seats: number;
  reserved_count: number;
  remaining_seats: number;
}

// 스케줄 (관리자용)
export interface ClassSchedule {
  id: string;
  class_id: string;
  schedule_date: string;
  start_time: string;
  max_participants: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 사용자 프로필
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  depositor_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequest {
  id: string;
  reservation_id: string;
  original_date: string | null;
  original_time: string | null;
  requested_date: string;
  requested_time: string;
  reason: string | null;
  status: ChangeRequestStatus;
  reject_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequestDetail extends ChangeRequest {
  customer_name: string;
  customer_phone: string;
  current_date_: string;
  current_time_: string;
  reservation_status: ReservationStatus;
  class_name: string;
}

export interface Notification {
  id: string;
  reservation_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient_phone: string;
  message: string;
  status: NotificationStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}
