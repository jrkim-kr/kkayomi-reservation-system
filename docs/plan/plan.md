# 소규모 대면 서비스 예약 시스템 — 단계별 구현 계획

> 총 6단계 · 각 단계는 독립적으로 동작 가능한 단위로 구성
> 버전: v2.1
> 최종 수정일: 2026-02-12

---

## Phase 0. 프로젝트 초기 셋업 ✅

### 0-1. Next.js 프로젝트 생성
- `create-next-app` (App Router, TypeScript, Tailwind CSS v4)
- 폴더 구조 설정: `app/`, `components/`, `lib/`, `types/`, `hooks/`
- ESLint 설정

### 0-2. Supabase 연결
- Supabase 프로젝트 생성
- `@supabase/supabase-js`, `@supabase/ssr` 설치
- 환경변수 설정 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Supabase 클라이언트 유틸 (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- Service Role 클라이언트 (`createServiceClient`) — 알림 발송 등 서버 전용 작업

### 0-3. Google OAuth 설정
- Google Cloud Console에서 OAuth 클라이언트 ID/Secret 발급
- Supabase Auth > Providers > Google 활성화 및 키 등록
- Redirect URI 설정 (Supabase callback URL)

### 0-4. DB 스키마 적용
- `schema.sql` 실행 (테이블, RLS, 트리거, 함수)
- profiles 테이블 + `handle_new_user` 트리거 확인
- class_schedules 테이블 확인
- Supabase Auth에 관리자 계정 1개 생성 + profiles.is_admin = true 설정

### 0-5. 디자인 시스템 기초
- Tailwind 커스텀 테마 (아이보리/크림 베이스, 포인트 컬러)
- 공통 컴포넌트: Button, Input, Badge, Card (`components/ui/`)
- 모바일 우선 반응형 기본 레이아웃

---

## Phase 1. 사용자 인증 & 예약 페이지 ✅

### 1-1. Google 로그인 페이지 (`/login`)
- "Google 계정으로 로그인" 버튼
- Supabase Auth `signInWithOAuth({ provider: 'google' })` 연동
- 로그인 성공 시 callback 처리 → `/booking`으로 리다이렉트
- 로그아웃 기능

### 1-2. 인증 미들웨어
- `/booking`, `/mypage` 접근 시 로그인 상태 확인
- `/admin/*` (login 제외) 접근 시 인증 확인
- `/booking/change/[token]`은 토큰 기반 공개 접근 허용
- 미로그인 시 `/login`으로 리다이렉트 (returnTo 파라미터)

### 1-3. 수업 목록 + 스케줄 조회 API
- `GET /api/classes` — 활성 수업 목록 조회
- `GET /api/classes/[id]/schedules` — 특정 수업의 예약 가능 스케줄 조회
  - `get_schedule_availability` 함수 호출
  - 잔여석 정보 포함 반환 (인원수 기반 계산)

### 1-4. 예약 신청 폼 (`/booking`)
- 4단계 폼 UI (수업 → 일시+인원 → 정보 → 확인)
- 수업 선택 시 소요 시간·가격 정보 표시
- 달력: 관리자가 등록한 날짜만 활성화 (나머지 회색 처리)
- 시간 선택: 버튼 그리드로 잔여석 표시 (예: "14:00 (2/4석)")
- 인원수 입력: 1명 ~ 잔여석까지
- 정원 마감 슬롯은 "마감" 표시 + 선택 불가
- 프로필 정보 자동완성 (이름/연락처/입금자명)
- 전화번호 자동 포맷 (010-XXXX-XXXX)
- 클라이언트 유효성 검증
- 페이지 제목, 1단계 안내 문구는 관리자 설정에서 동적 로드
- Realtime broadcast로 잔여석 실시간 동기화

### 1-5. 예약 제출 API
- `POST /api/reservations` — 예약 신청 생성
- `auth.uid()` 기반 사용자 확인
- 스케줄 슬롯 정원 초과 체크 (`check_schedule_capacity` 함수 — 인원수 포함)
- 프로필 정보 자동 저장 (최초 예약 시 profiles 테이블에 name/phone/depositor_name 저장)
- 성공 시 `/booking/complete`로 리다이렉트 (쿼리 파라미터로 예약 정보 전달)
- Realtime broadcast 변경 알림

### 1-6. 예약 완료 페이지 (`/booking/complete`)
- 쿼리 파라미터로 예약 내용 표시
- 입금 안내 (계좌 정보, 기한) — `/api/settings/public`에서 조회
- 금액: 수업 가격 × 인원수 (다인 예약 시 수식 표시)

### 1-7. 마이페이지 (`/mypage`)
- 내 예약 목록 조회 (최신순, 카드형 UI)
- 상태별 뱃지 표시 (대기/확정/반려/취소)
- 예약 상세 확장 (수업명, 일시, 가격, 인원, 이름, 연락처, 입금자명, 요청사항)
- `pending` 상태: 입금 계좌 정보 + 입금 기한 표시
- `rejected` 상태: 반려 사유 표시
- `confirmed` 상태: 일정 변경 요청 버튼
- `pending` 상태: 즉시 취소 버튼
- `confirmed` 상태 + 취소 요청 없음: 취소 요청 버튼
- `confirmed` 상태 + 취소 요청 중: "취소 요청 중" 라벨 표시
- `confirmed` 상태 + 취소 반려됨: "취소 반려됨" 라벨 + 반려 사유 표시 + 재요청 버튼
- 변경 요청 진행 중인 경우 "변경 요청 처리 중" 상태 표시
- 프로필 수정 (이름/연락처/입금자명 변경)

### 1-8. 변경/취소 요청 API
- `POST /api/reservations/[id]/change-request` — 변경 요청 생성
  - 스케줄 슬롯에서 선택한 날짜/시간으로 변경 요청
  - `confirmed` 상태 + 미처리 변경 요청 없음 검증
- `POST /api/reservations/[id]/cancel-request` — 취소 요청 생성
  - `pending` 상태: 즉시 `cancelled`로 변경
  - `confirmed` 상태: cancel_reason 저장, 관리자 승인 대기
  - 이전 취소 반려 사유(reject_reason) 클리어

### 1-9. 일정 변경 요청 페이지 (`/booking/change/[token]`)
- 토큰 기반 접근 (알림톡 경유, 비로그인 접근 가능)
- 현재 예약 정보 표시 (수업명, 현재 일시 — 수정 불가)
- 변경 희망 날짜/시간: 등록된 스케줄 슬롯에서 선택
- `confirmed` 상태인 예약만 변경 요청 가능
- 미처리 변경 요청 있으면 중복 신청 차단

### 1-10. FAQ 페이지 (`/faq`)
- Supabase에서 활성 FAQ 목록 조회
- 아코디언 UI

---

## Phase 2. 관리자 — 인증 & 예약 관리 ✅

### 2-1. 어드민 로그인 (`/admin/login`)
- Supabase Auth 이메일/비밀번호 로그인
- 로그인 후 profiles.is_admin 확인
- 로그인 후 `/admin`으로 리다이렉트
- 미인증 시 `/admin/login`으로 리다이렉트 (미들웨어)

### 2-2. 어드민 레이아웃
- 사이드바 네비게이션 (대시보드, 예약 관리, 변경 요청, 수업 관리, FAQ, 알림 로그, 설정)
- 동적 스토어명 표시 (설정 변경 시 `settings-updated` 이벤트로 즉시 반영)
- 로그아웃 버튼
- 반응형 사이드바 (모바일: 햄버거 메뉴 + 오버레이)

### 2-3. 예약 관리 페이지 (`/admin/reservations`)
- 예약 리스트 테이블 (`reservation_details` 뷰 사용)
- 상태별 뱃지 (대기/확정/반려/취소)
- 상태별 필터, 예약자명/연락처 검색
- 상태별 액션 버튼:
  - pending → **입금 확인** / **반려** (반려 사유 입력 모달)
  - confirmed (취소 요청 없음) → **취소 처리**
  - confirmed + 취소 요청 → **취소 승인** / **취소 반려**
- 관리자 메모 인라인 편집

### 2-4. 예약 상태 변경 API
- `PATCH /api/admin/reservations/[id]` — 상태 변경 + 취소 요청 처리
- 상태 전이 검증 (pending → confirmed/rejected, confirmed → cancelled)
- 취소 요청 반려: `cancel_reason` 클리어 + `reject_reason`에 반려 사유 저장
- 취소 승인: `status` → cancelled + `reject_reason` 클리어 + 대기 중 변경 요청 자동 거절
- 인증 + 관리자 권한 확인 (서버 사이드)
- 알림톡 활성화 여부 확인 → 활성 시 알림 발송 로직 호출

### 2-5. 변경 요청 관리 페이지 (`/admin/change-requests`)
- 변경 요청 리스트 테이블 (`change_request_details` 뷰 사용)
- 상태별 뱃지 (대기/승인/거절)
- 승인 → 예약 일시 업데이트 + Google Calendar 이벤트 수정 + Sheets 일시 업데이트
- 거절 → 거절 사유 입력

### 2-6. 변경 요청 처리 API
- `PATCH /api/admin/change-requests/[id]` — 승인/거절
- 승인 시 reservations의 desired_date/desired_time/schedule_id 업데이트
- 인증 + 관리자 권한 확인 (서버 사이드)

---

## Phase 3. 관리자 — 수업·스케줄·FAQ·설정 ✅

### 3-1. 수업 관리 (`/admin/classes`)
- 수업 CRUD (이름, 설명, 소요시간, 가격, 정원, 활성여부)
- 활성/비활성 토글
- 정렬 순서 변경

### 3-2. 스케줄 관리 (`/admin/classes` 내 탭 또는 서브페이지)
- 수업 선택 후 스케줄 관리 진입
- 월간 달력 뷰: 날짜별 등록된 슬롯 수 표시
- 날짜 클릭 → 해당 날짜의 시간 슬롯 목록 + 추가/삭제
- 시간 슬롯 추가: 시작 시간 입력, 정원 개별 설정 (선택)
- 슬롯 삭제: 예약이 없는 슬롯만 삭제, 예약 있으면 비활성 처리
- 일괄 등록: 여러 날짜 선택 → 동일 시간 슬롯 한번에 등록

### 3-3. 스케줄 API
- `GET /api/admin/classes/[id]/schedules` — 스케줄 목록 조회 (월 단위)
- `POST /api/admin/classes/[id]/schedules` — 스케줄 슬롯 생성 (단건 또는 일괄)
- `PATCH /api/admin/schedules/[id]` — 슬롯 수정 (정원, 활성여부)

### 3-4. FAQ 관리 (`/admin/faqs`)
- FAQ CRUD (질문, 답변)
- 순서 변경 (드래그 앤 드롭 or 화살표 버튼)
- 활성/비활성 토글

### 3-5. 시스템 설정 (`/admin/settings`)
- 스토어 정보 (스토어명, 한줄소개, 주소)
- 예약 페이지 (예약 버튼 문구, 페이지 제목, 1단계 안내 문구)
- 알림/캘린더 (발신자명, 캘린더 접두어, Google Calendar ID)
- 입금 안내 (은행/계좌/예금주 JSON, 입금 기한)
- SNS (인스타그램 핸들, 카카오톡 채널 ID)
- **카카오 알림톡 ON/OFF 토글** + 알리고 API 설정
- 공개 설정 API (`GET /api/settings/public`) — 인증 불필요

### 3-6. 홈 페이지 (`/`)
- 동적 스토어명, 한줄소개, CTA 버튼 (설정에서 로드)
- 로그인 상태에 따른 버튼 분기 (마이페이지 / 로그인)
- "오시는 길" (주소 설정 시 표시)
- SNS 링크 버튼 (Instagram, 카카오톡)
- 푸터에 스토어명 표시

### 3-7. 대시보드 (`/admin`)
- 통계 카드 (오늘 확정 예약, 신규 신청 건수, 미처리 변경 요청, 이번 주 예약)
- 이번 주 예약 주간 캘린더 뷰
- 예약 클릭 시 상세 모달

---

## Phase 4. 외부 연동 ✅

### 4-1. Google Calendar 연동
- Google Cloud 프로젝트 + Service Account 생성
- `googleapis` 패키지 설치
- `confirmed` 시 캘린더 이벤트 생성 (제목에 접두어·수업명·예약자·인원 포함)
- Calendar ID: 관리자 설정(`google_calendar_id`) 우선, `GOOGLE_CALENDAR_ID` env var fallback
- 변경 요청 승인 시 이벤트 일시 업데이트
- `cancelled` 시 이벤트 삭제
- `google_calendar_event_id`를 reservations에 저장

### 4-2. Google Sheets 연동
- Service Account에 스프레드시트 공유
- `confirmed` 시 행 추가 (신청일/확정일/수업명/예약자명/연락처/인원/일시/금액/상태/메모 — 10열)
- `cancelled` 시 상태 컬럼 업데이트
- 변경 승인 시 일시 컬럼 업데이트

### 4-3. 카카오 알림톡 연동 (옵션)
- 관리자 설정에서 `kakao_enabled` 확인 후 조건부 실행
- 알리고 대행사 경유 (API Key, User ID, Sender Key)
- 알림톡 템플릿 5종 (확정/반려/취소/변경승인/변경거절) — 동적 storeName 사용
- 알림 발송 서비스 모듈 (`lib/notifications/send.ts`)
  - `kakao_enabled = false`이면 발송 스킵 (로그 없음)
  - `kakao_enabled = true`이면 발송 + notifications 테이블 기록
- 발송 실패 시 SMS 대체 발송 (fallback)
- 재발송 기능 (기존 알림 ID 기반)
- 예약 상태 변경 API에 알림 발송 로직 통합

### 4-4. 알림 로그 페이지 (`/admin/notifications`)
- 발송 이력 테이블 (유형, 수신자, 상태, 시각)
- 실패 건 재발송 버튼
- 알림톡 비활성 시 "알림톡이 비활성화되어 있습니다" 안내 표시

### 4-5. 실시간 데이터 동기화
- Supabase Realtime broadcast 채널 (`db-changes`)
- `useRealtimeRefetch` 커스텀 훅 — 테이블별 변경 감지 + 300ms 디바운스
- `notifyChange(table)` — 변경 후 다른 구독자에게 알림
- 예약 폼 잔여석 실시간 업데이트, 관리자 페이지 자동 갱신

---

## Phase 5. 배포 & 마무리

### 5-1. Vercel 배포
- Vercel 프로젝트 생성 + GitHub 연결
- 환경변수 설정 (Supabase, Google Service Account, 알림톡 API 키)
- 도메인 연결 안내 문서 작성

### 5-2. 운영 데이터 초기 세팅
- 관리자 계정 최종 설정 (profiles.is_admin = true)
- 관리자 설정 입력 (스토어명, 입금 계좌, 주소, SNS 등)
- 실제 수업 데이터 입력
- 수업별 스케줄(예약 가능 날짜/시간) 등록
- FAQ 내용 최종 확인
- 카카오 알림톡 설정 (사용 시)

### 5-3. QA 체크리스트
- [ ] Google 로그인: 로그인/로그아웃 정상 동작
- [ ] 미로그인 상태에서 /booking 접근 → /login 리다이렉트
- [ ] 예약 폼: 관리자가 등록한 날짜/시간만 선택 가능
- [ ] 예약 폼: 잔여석 표시 + 마감 슬롯 선택 불가
- [ ] 예약 폼: 다인 예약(인원수) 정원 초과 체크
- [ ] 예약 폼: 프로필 자동완성 (2회차 이후 예약)
- [ ] 예약 폼: 잔여석 실시간 업데이트 (다른 탭에서 예약 시)
- [ ] 예약 제출 → /booking/complete로 이동 + 입금 안내 표시
- [ ] 마이페이지: 내 예약 목록 + 상태별 뱃지 표시
- [ ] 마이페이지: pending 상태에서 입금 안내 표시
- [ ] 마이페이지: confirmed 상태에서 변경 요청 가능
- [ ] 마이페이지: pending 상태에서 즉시 취소 가능
- [ ] 마이페이지: confirmed 상태에서 취소 요청 → "취소 요청 중" 표시
- [ ] 마이페이지: 취소 반려 시 "취소 반려됨" + 반려 사유 표시 + 재요청 가능
- [ ] 마이페이지: 프로필 수정 정상 동작
- [ ] 어드민: 수업 등록 + 스케줄(날짜/시간) 등록
- [ ] 어드민: 스케줄 일괄 등록 동작
- [ ] 어드민: 입금 확인 → Calendar + Sheets 연동 확인
- [ ] 어드민: 입금 확인 → (알림톡 활성 시) 알림톡 발송 확인
- [ ] 어드민: 반려 → (알림톡 활성 시) 알림톡 발송 확인
- [ ] 어드민: 취소 승인 → cancelled + Calendar 이벤트 삭제 + 대기 중 변경 요청 자동 거절 확인
- [ ] 어드민: 취소 반려 → confirmed 유지 + 마이페이지 반영 확인
- [ ] 변경 요청: 마이페이지에서 변경 요청 → 관리자 승인/거절
- [ ] 변경 요청: 토큰 링크로 접근 → 변경 요청 제출
- [ ] 변경 요청: 미처리 요청 있을 때 중복 신청 차단
- [ ] 미인증 상태에서 어드민 페이지 접근 차단
- [ ] 알림톡 OFF 상태에서도 예약 관리 정상 동작
- [ ] (알림톡 활성 시) 알림톡 실패 시 SMS fallback 동작
- [ ] 설정 변경 → 홈, 예약 페이지, 사이드바에 즉시 반영 확인

---

## 구현 순서 요약

```
Phase 0  프로젝트 셋업 + Google OAuth ···········  기반      ✅
   ↓
Phase 1  로그인 + 예약 + 마이페이지 ··············  핵심 기능  ✅
   ↓
Phase 2  어드민 인증 + 예약 관리 ·················  핵심 기능  ✅
   ↓
Phase 3  수업·스케줄·FAQ·설정·홈·대시보드 ········  운영 기능  ✅
   ↓
Phase 4  Calendar + Sheets + 알림톡 + Realtime ···  자동화    ✅
   ↓
Phase 5  배포 + 도메인 + QA ·····················  런칭
```
