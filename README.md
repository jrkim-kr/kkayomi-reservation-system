# 소규모 대면 서비스 예약 관리 시스템

> "소규모 대면 서비스 예약 + 입금 확인 + 알림톡 자동화"를 하나로 묶은 풀스택 예약 관리 시스템

---

## 핵심 특징

- **완전한 예약 라이프사이클**: 고객 예약 신청 → 관리자 승인 → 입금 안내 → 입금 확인(확정) → 일정 변경/취소
- **설정 기반 브랜딩**: 관리자 설정 페이지에서 스토어명, 예약 문구, 입금 계좌, 알림 발신자명 등을 변경 (코드 수정 불요)
- **외부 연동**: Google Calendar 자동 등록, Google Sheets 기록, 카카오 알림톡(SMS fallback)
- **실시간 동기화**: Supabase Realtime broadcast로 잔여석 실시간 업데이트

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 |
| 백엔드 | Next.js Route Handlers (REST API) |
| DB | Supabase (PostgreSQL + RLS + Realtime) |
| 인증 | Supabase Auth (Google OAuth / Email) |
| 알림 | 카카오 알림톡 (알리고) + SMS fallback |
| 배포 | Vercel |

## 페이지 구성

```
고객용 (7개)                    관리자용 (8개)
─────────                      ─────────
/ 홈                            /admin 대시보드
/login 로그인                   /admin/reservations 예약 관리
/booking 예약 (4단계)           /admin/change-requests 변경 요청
/booking/complete 완료          /admin/classes 수업/스케줄 관리
/booking/change/[token] 변경    /admin/faqs FAQ 관리
/mypage 마이페이지              /admin/notifications 알림 로그
/faq FAQ                        /admin/settings 환경 설정
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 환경변수를 입력합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Base URL (알림톡 내 링크 생성용)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Google Service Account (Calendar + Sheets)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxxxxxxx@group.calendar.google.com
GOOGLE_SHEETS_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

> 카카오 알림톡 API 키는 관리자 설정 페이지(`/admin/settings`)에서 입력합니다.

### 3. DB 스키마 적용

Supabase SQL Editor에서 `docs/schema/schema.sql`을 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

외부 연동 상세 설정은 [docs/guide/setup-guide.md](docs/guide/setup-guide.md)를 참고하세요.

## 문서 구조

```
docs/
├── spec/              # 기능명세서
│   └── spec.md
├── guide/             # 셋업 가이드
│   └── setup-guide.md
├── plan/              # 구현 계획
│   └── plan.md
└── schema/            # DB 스키마
    └── schema.sql
```

| 문서 | 설명 |
|------|------|
| [docs/spec/spec.md](docs/spec/spec.md) | 기능명세서 — 페이지별 기능, 상태 흐름, API, 알림 시스템 |
| [docs/guide/setup-guide.md](docs/guide/setup-guide.md) | 외부 연동 셋업 가이드 — Google OAuth, Calendar, Sheets, 알림톡 |
| [docs/plan/plan.md](docs/plan/plan.md) | 단계별 구현 계획 — Phase 0~5 + QA 체크리스트 |
| [docs/schema/schema.sql](docs/schema/schema.sql) | Supabase DB 스키마 — 테이블, RLS, 함수, 뷰, 시드 데이터 |
