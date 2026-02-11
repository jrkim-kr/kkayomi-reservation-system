-- ============================================================
-- 까요미 공방 클래스 예약 관리 시스템 — Supabase DB Schema
-- 최종 수정일: 2026-02-10
-- 버전: v2.0
-- ============================================================

-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. ENUM Types
-- ============================================================

-- 예약 상태
create type reservation_status as enum (
  'pending',       -- 신청 접수 (입금 대기)
  'approved',      -- (미사용, 하위 호환용)
  'confirmed',     -- 확정 (입금 완료)
  'rejected',      -- 반려
  'cancelled'      -- 취소
);

-- 알림 채널
create type notification_channel as enum (
  'kakao',         -- 카카오 알림톡
  'sms'            -- 문자 메시지 (알림톡 실패 시 대체 발송)
);

-- 알림 발송 상태
create type notification_status as enum (
  'pending',       -- 발송 대기
  'sent',          -- 발송 성공
  'failed'         -- 발송 실패
);

-- 알림 유형
create type notification_type as enum (
  'approval',           -- 예약 접수 및 입금 안내
  'confirmation',       -- 최종 확정
  'rejection',          -- 반려
  'cancellation',       -- 취소
  'change_approved',    -- 일정 변경 승인
  'change_rejected'     -- 일정 변경 거절
);

-- ============================================================
-- 2. Tables
-- ============================================================

-- ------------------------------------------------------------
-- 2-1. profiles (사용자 프로필 — Google 로그인 사용자)
-- ------------------------------------------------------------
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,                                -- Google 계정 이메일 (auth.users에서 가져옴)
  display_name     text,                                -- 예약 시 사용할 이름
  phone            text,                                -- 연락처 (010-XXXX-XXXX)
  depositor_name   text,                                -- 입금자명
  is_admin         boolean not null default false,      -- 관리자 여부
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table profiles is '사용자 프로필 테이블 (Google OAuth 로그인 사용자)';
comment on column profiles.id is 'auth.users의 id와 1:1 매핑';
comment on column profiles.display_name is '최초 예약 시 입력, 이후 자동완성에 사용';

-- ------------------------------------------------------------
-- 2-2. classes (수업 종류)
-- ------------------------------------------------------------
create table classes (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,                    -- 수업명 (예: "비즈 반지 원데이 클래스")
  description      text,                             -- 수업 설명 (예약 폼에서 표시)
  duration_minutes int not null default 60,          -- 소요 시간 (분)
  price            int not null default 0,           -- 가격 (원)
  max_participants int not null default 1,           -- 동시간대 기본 최대 정원
  is_active        boolean not null default true,    -- 활성 여부 (비활성 시 예약 폼 미노출)
  sort_order       int not null default 0,           -- 정렬 순서
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table classes is '수업 종류 관리 테이블';
comment on column classes.max_participants is '동시간대 기본 최대 정원 (스케줄별 개별 설정 가능)';

-- ------------------------------------------------------------
-- 2-3. class_schedules (수업별 예약 가능 일정)
-- ------------------------------------------------------------
create table class_schedules (
  id               uuid primary key default uuid_generate_v4(),
  class_id         uuid not null references classes(id) on delete cascade,
  schedule_date    date not null,                    -- 예약 가능 날짜
  start_time       time not null,                    -- 시작 시간 (예: 10:00, 14:00)
  max_participants int,                              -- 슬롯별 정원 (NULL이면 수업 기본 정원 사용)
  is_active        boolean not null default true,    -- 활성 여부 (예약이 있어 삭제 불가 시 비활성 처리)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- 동일 수업·동일 날짜·동일 시간에 중복 슬롯 방지
  unique (class_id, schedule_date, start_time)
);

comment on table class_schedules is '수업별 예약 가능 일정 (관리자가 개별 등록)';
comment on column class_schedules.max_participants is 'NULL이면 classes.max_participants를 기본값으로 사용';

create index idx_class_schedules_class on class_schedules(class_id);
create index idx_class_schedules_date on class_schedules(schedule_date);
create index idx_class_schedules_class_date on class_schedules(class_id, schedule_date);

-- ------------------------------------------------------------
-- 2-4. reservations (예약)
-- ------------------------------------------------------------
create table reservations (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references auth.users(id) on delete set null,  -- Google 로그인 사용자 ID
  class_id             uuid not null references classes(id) on delete restrict,
  schedule_id          uuid references class_schedules(id) on delete restrict,  -- 선택한 스케줄 슬롯
  customer_name        text not null,                    -- 예약자 이름
  customer_phone       text not null,                    -- 예약자 연락처 (010-XXXX-XXXX)
  depositor_name       text not null,                    -- 입금자명 (계좌이체 대조용)
  desired_date         date not null,                    -- 예약 날짜
  desired_time         time not null,                    -- 예약 시간
  num_people           int not null default 1,           -- 예약 인원 수
  customer_memo        text,                             -- 예약자 요청사항
  status               reservation_status not null default 'pending',
  admin_memo           text,                             -- 관리자 메모 (운영용)
  reject_reason        text,                             -- 반려 사유
  cancel_reason        text,                             -- 취소 사유 (사용자 요청 시)
  approved_at          timestamptz,                      -- 승인 시각
  confirmed_at         timestamptz,                      -- 입금 확인(최종 확정) 시각
  rejected_at          timestamptz,                      -- 반려 시각
  cancelled_at         timestamptz,                      -- 취소 시각
  change_token         uuid unique default uuid_generate_v4(), -- 일정 변경 요청 페이지 접근용 토큰
  google_calendar_event_id text,                         -- Google Calendar 이벤트 ID (삭제 시 필요)
  google_sheets_row    int,                              -- Google Sheets 기록 행 번호
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table reservations is '예약 관리 테이블';
comment on column reservations.user_id is 'Google 로그인 사용자의 auth.users ID (마이페이지 조회용)';
comment on column reservations.schedule_id is '선택한 class_schedules의 슬롯 ID';
comment on column reservations.status is 'pending → confirmed / rejected / cancelled';
comment on column reservations.google_calendar_event_id is '취소 시 Calendar 이벤트 삭제를 위해 저장';

-- 인덱스: 상태별 조회, 날짜별 조회, 사용자별 조회가 빈번
create index idx_reservations_status on reservations(status);
create index idx_reservations_desired_date on reservations(desired_date);
create index idx_reservations_class_date on reservations(class_id, desired_date, desired_time);
create index idx_reservations_created_at on reservations(created_at desc);
create index idx_reservations_user on reservations(user_id);
create index idx_reservations_schedule on reservations(schedule_id);

-- ------------------------------------------------------------
-- 2-5. notifications (알림 발송 로그)
-- ------------------------------------------------------------
create table notifications (
  id               uuid primary key default uuid_generate_v4(),
  reservation_id   uuid not null references reservations(id) on delete cascade,
  type             notification_type not null,          -- 알림 유형
  channel          notification_channel not null default 'kakao',
  recipient_phone  text not null,                       -- 수신 전화번호
  message          text not null,                       -- 발송 메시지 내용
  status           notification_status not null default 'pending',
  sent_at          timestamptz,                         -- 실제 발송 시각
  error_message    text,                                -- 실패 시 에러 메시지
  created_at       timestamptz not null default now()
);

comment on table notifications is '알림 발송 이력 테이블 (카카오 알림톡 활성 시에만 기록)';

create index idx_notifications_reservation on notifications(reservation_id);
create index idx_notifications_status on notifications(status);

-- ------------------------------------------------------------
-- 2-6. change_requests (일정 변경 요청)
-- ------------------------------------------------------------
create table change_requests (
  id                uuid primary key default uuid_generate_v4(),
  reservation_id    uuid not null references reservations(id) on delete cascade,
  requested_date    date not null,                      -- 변경 희망 날짜
  requested_time    time not null,                      -- 변경 희망 시간
  schedule_id       uuid references class_schedules(id) on delete restrict,  -- 변경 희망 스케줄 슬롯
  reason            text,                               -- 변경 사유
  status            text not null default 'pending'     -- pending / approved / rejected
                    check (status in ('pending', 'approved', 'rejected')),
  reject_reason     text,                               -- 거절 사유
  processed_at      timestamptz,                        -- 처리 시각
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table change_requests is '일정 변경 요청 테이블';
comment on column change_requests.status is '변경 요청 상태: pending → approved / rejected';
comment on column change_requests.schedule_id is '변경 희망하는 class_schedules 슬롯 ID';

create index idx_change_requests_reservation on change_requests(reservation_id);
create index idx_change_requests_status on change_requests(status);

-- ------------------------------------------------------------
-- 2-7. faqs (자주 묻는 질문)
-- ------------------------------------------------------------
create table faqs (
  id          uuid primary key default uuid_generate_v4(),
  question    text not null,
  answer      text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table faqs is 'FAQ 관리 테이블';

-- ------------------------------------------------------------
-- 2-8. admin_settings (시스템 설정)
-- ------------------------------------------------------------
create table admin_settings (
  id         uuid primary key default uuid_generate_v4(),
  key        text unique not null,              -- 설정 키
  value      jsonb not null default '{}',       -- 설정 값 (JSON 형태로 유연하게 저장)
  updated_at timestamptz not null default now()
);

comment on table admin_settings is '시스템 설정 (입금 계좌, 카카오 알림톡 ON/OFF 등)';

-- 기본 설정 삽입
insert into admin_settings (key, value) values
  ('bank_info', '{"bank": "", "account_number": "", "account_holder": ""}'),
  ('deposit_deadline_hours', '72'),
  ('workshop_address', '""'),
  ('instagram_handle', '"@kkayomi"'),
  ('kakao_enabled', 'false'),                    -- 카카오 알림톡 활성화 여부 (기본: OFF)
  ('kakao_channel_id', '""'),
  ('kakao_api_key', '""'),
  ('sms_sender_number', '""');

-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================

-- 관리자 여부 확인 함수 (security definer로 RLS 우회 — 무한 재귀 방지)
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  );
end;
$$ language plpgsql security definer;

-- 모든 테이블에 RLS 활성화
alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_schedules enable row level security;
alter table reservations enable row level security;
alter table change_requests enable row level security;
alter table notifications enable row level security;
alter table faqs enable row level security;
alter table admin_settings enable row level security;

-- ------------------------------------------------------------
-- 3-1. profiles — 본인 프로필만 조회/수정, 관리자는 모두 조회
-- ------------------------------------------------------------
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_admin_select"
  on profiles for select
  using (is_admin());

-- ------------------------------------------------------------
-- 3-2. classes — 누구나 활성 수업 조회 가능, 관리자만 수정
-- ------------------------------------------------------------
create policy "classes_select_active"
  on classes for select
  using (is_active = true);

create policy "classes_admin_all"
  on classes for all
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-3. class_schedules — 누구나 활성 스케줄 조회, 관리자만 수정
-- ------------------------------------------------------------
create policy "schedules_select_active"
  on class_schedules for select
  using (is_active = true);

create policy "schedules_admin_all"
  on class_schedules for all
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-4. reservations — 로그인 사용자가 본인 예약 생성/조회, 관리자는 모두 관리
-- ------------------------------------------------------------
create policy "reservations_insert_authenticated"
  on reservations for insert
  with check (auth.uid() = user_id);  -- 로그인 사용자만, 본인 ID로만 생성

create policy "reservations_select_own"
  on reservations for select
  using (auth.uid() = user_id);  -- 본인 예약만 조회

create policy "reservations_admin_select"
  on reservations for select
  using (
    is_admin()
  );

create policy "reservations_admin_update"
  on reservations for update
  using (
    is_admin()
  );

create policy "reservations_admin_delete"
  on reservations for delete
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-5. change_requests — 로그인 사용자가 본인 예약의 변경 요청, 관리자는 모두 관리
-- ------------------------------------------------------------
create policy "change_requests_insert_authenticated"
  on change_requests for insert
  with check (
    exists (
      select 1 from reservations
      where id = change_requests.reservation_id
        and user_id = auth.uid()
    )
  );

create policy "change_requests_select_own"
  on change_requests for select
  using (
    exists (
      select 1 from reservations
      where id = change_requests.reservation_id
        and user_id = auth.uid()
    )
  );

create policy "change_requests_admin_select"
  on change_requests for select
  using (
    is_admin()
  );

create policy "change_requests_admin_update"
  on change_requests for update
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-6. notifications — 관리자만 접근
-- ------------------------------------------------------------
create policy "notifications_admin_all"
  on notifications for all
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-7. faqs — 누구나 활성 FAQ 조회, 관리자만 수정
-- ------------------------------------------------------------
create policy "faqs_select_active"
  on faqs for select
  using (is_active = true);

create policy "faqs_admin_all"
  on faqs for all
  using (
    is_admin()
  );

-- ------------------------------------------------------------
-- 3-8. admin_settings — 관리자만 접근
-- ------------------------------------------------------------
create policy "settings_admin_all"
  on admin_settings for all
  using (
    is_admin()
  );

-- ============================================================
-- 4. Functions & Triggers
-- ============================================================

-- ------------------------------------------------------------
-- 4-1. 새 사용자 가입 시 프로필 자동 생성
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 4-2. updated_at 자동 갱신 트리거
-- ------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_classes_updated_at
  before update on classes
  for each row execute function update_updated_at();

create trigger trg_class_schedules_updated_at
  before update on class_schedules
  for each row execute function update_updated_at();

create trigger trg_reservations_updated_at
  before update on reservations
  for each row execute function update_updated_at();

create trigger trg_change_requests_updated_at
  before update on change_requests
  for each row execute function update_updated_at();

create trigger trg_faqs_updated_at
  before update on faqs
  for each row execute function update_updated_at();

create trigger trg_settings_updated_at
  before update on admin_settings
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- 4-3. 예약 상태 변경 시 타임스탬프 자동 기록
-- ------------------------------------------------------------
create or replace function update_reservation_timestamps()
returns trigger as $$
begin
  if new.status = 'confirmed' and old.status in ('pending', 'approved') then
    new.confirmed_at = now();
  elsif new.status = 'rejected' and old.status = 'pending' then
    new.rejected_at = now();
  elsif new.status = 'cancelled' then
    new.cancelled_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_reservation_status_timestamps
  before update on reservations
  for each row
  when (old.status is distinct from new.status)
  execute function update_reservation_timestamps();

-- ------------------------------------------------------------
-- 4-4. 스케줄 슬롯 정원 초과 체크 함수
-- ------------------------------------------------------------
create or replace function check_schedule_capacity(
  p_schedule_id uuid,
  p_exclude_reservation_id uuid default null
)
returns boolean as $$
declare
  v_max int;
  v_class_max int;
  v_current int;
  v_class_id uuid;
  v_date date;
  v_time time;
begin
  -- 스케줄 슬롯 정보 조회
  select cs.max_participants, cs.class_id, cs.schedule_date, cs.start_time
  into v_max, v_class_id, v_date, v_time
  from class_schedules cs
  where cs.id = p_schedule_id;

  -- 슬롯별 정원이 없으면 수업 기본 정원 사용
  if v_max is null then
    select max_participants into v_max
    from classes
    where id = v_class_id;
  end if;

  -- 해당 슬롯의 유효 예약 인원 합계 조회 (pending, approved, confirmed)
  select coalesce(sum(num_people), 0) into v_current
  from reservations
  where schedule_id = p_schedule_id
    and status in ('pending', 'approved', 'confirmed')
    and (p_exclude_reservation_id is null or id != p_exclude_reservation_id);

  return v_current < v_max;
end;
$$ language plpgsql;

comment on function check_schedule_capacity is '스케줄 슬롯의 정원 초과 여부 체크. true = 여유 있음';

-- ------------------------------------------------------------
-- 4-5. 스케줄 슬롯 잔여석 조회 함수
-- ------------------------------------------------------------
create or replace function get_schedule_availability(p_class_id uuid, p_from_date date default current_date)
returns table (
  schedule_id uuid,
  schedule_date date,
  start_time time,
  max_seats int,
  reserved_count bigint,
  remaining_seats bigint
) as $$
begin
  return query
  select
    cs.id as schedule_id,
    cs.schedule_date,
    cs.start_time,
    coalesce(cs.max_participants, c.max_participants) as max_seats,
    coalesce(sum(r.num_people) filter (where r.status in ('pending', 'approved', 'confirmed')), 0) as reserved_count,
    coalesce(cs.max_participants, c.max_participants)
      - coalesce(sum(r.num_people) filter (where r.status in ('pending', 'approved', 'confirmed')), 0) as remaining_seats
  from class_schedules cs
  join classes c on cs.class_id = c.id
  left join reservations r on r.schedule_id = cs.id
  where cs.class_id = p_class_id
    and cs.schedule_date >= p_from_date
    and cs.is_active = true
  group by cs.id, cs.schedule_date, cs.start_time, cs.max_participants, c.max_participants
  order by cs.schedule_date, cs.start_time;
end;
$$ language plpgsql;

comment on function get_schedule_availability is '특정 수업의 예약 가능 스케줄과 잔여석 조회';

-- ============================================================
-- 5. Views (편의용)
-- ============================================================

-- 예약 목록 뷰 (수업 정보 + 사용자 정보 포함)
create or replace view reservation_details as
select
  r.id,
  r.user_id,
  r.status,
  r.customer_name,
  r.customer_phone,
  r.depositor_name,
  r.desired_date,
  r.desired_time,
  r.customer_memo,
  r.num_people,
  r.admin_memo,
  r.reject_reason,
  r.cancel_reason,
  r.change_token,
  r.approved_at,
  r.confirmed_at,
  r.rejected_at,
  r.cancelled_at,
  r.created_at,
  r.updated_at,
  c.id as class_id,
  c.name as class_name,
  c.duration_minutes,
  c.price,
  c.max_participants,
  p.email as user_email
from reservations r
join classes c on r.class_id = c.id
left join profiles p on r.user_id = p.id;

-- 변경 요청 목록 뷰 (예약 정보 포함)
create or replace view change_request_details as
select
  cr.id,
  cr.reservation_id,
  cr.requested_date,
  cr.requested_time,
  cr.reason,
  cr.status,
  cr.reject_reason,
  cr.processed_at,
  cr.created_at,
  cr.updated_at,
  r.customer_name,
  r.customer_phone,
  r.desired_date as current_date_,
  r.desired_time as current_time_,
  r.status as reservation_status,
  c.name as class_name
from change_requests cr
join reservations r on cr.reservation_id = r.id
join classes c on r.class_id = c.id;

-- ============================================================
-- 6. Seed Data (초기 데이터 예시 — 필요 시 수정)
-- ============================================================

-- FAQ 초기 데이터
insert into faqs (question, answer, sort_order) values
  ('주차 가능한가요?', '공방 앞 무료 주차 가능합니다.', 1),
  ('취소/변경은 어떻게 하나요?', '로그인 후 마이페이지에서 변경/취소 요청이 가능합니다. 또는 카카오톡·인스타그램 DM으로 문의해 주세요.', 2),
  ('준비물이 있나요?', '모든 재료는 제공됩니다. 편한 복장으로 오시면 됩니다.', 3),
  ('수업 소요 시간은 얼마나 되나요?', '수업마다 상이합니다. 예약 신청 시 수업 정보를 확인해 주세요.', 4);
