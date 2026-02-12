# 예약 시스템 — 외부 연동 셋업 가이드

> 최종 수정일: 2026-02-12
> 버전: v2.2
>
> Google OAuth(사용자 로그인), Google Calendar, Google Sheets, 카카오 알림톡 연동을 위한 단계별 설정 가이드
> 아래 예시에서 "나의 스토어"는 실제 스토어명으로 대체하세요.

---

## 목차

1. [Google Cloud 프로젝트 & OAuth 설정](#1-google-cloud-프로젝트--oauth-설정)
2. [Supabase Google Auth 연동](#2-supabase-google-auth-연동)
3. [Google Calendar 연동](#3-google-calendar-연동)
4. [Google Sheets 연동](#4-google-sheets-연동)
5. [알리고 계정 가입 & API 키 발급](#5-알리고-계정-가입--api-키-발급)
6. [카카오톡 채널 & 알림톡 템플릿 등록](#6-카카오톡-채널--알림톡-템플릿-등록)
7. [환경변수 최종 확인](#7-환경변수-최종-확인)

---

## 1. Google Cloud 프로젝트 & OAuth 설정

Google OAuth(사용자 로그인)와 Calendar/Sheets 연동 모두 하나의 Google Cloud 프로젝트에서 설정합니다.

### 1-1. Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트** 클릭
3. 프로젝트 이름 입력 (예: `my-booking`) → **만들기**
4. 생성된 프로젝트가 선택되었는지 상단에서 확인

### 1-2. API 활성화

1. 좌측 메뉴 → **API 및 서비스** → **라이브러리**
2. 검색창에 `Google Calendar API` 입력 → 클릭 → **사용** 버튼
3. 다시 라이브러리로 돌아와서 `Google Sheets API` 검색 → 클릭 → **사용** 버튼

### 1-3. OAuth 동의 화면 구성

사용자 Google 로그인을 위해 OAuth 동의 화면을 먼저 설정해야 합니다.

1. 좌측 메뉴 → **API 및 서비스** → **OAuth 동의 화면**
2. User Type: **외부** 선택 → **만들기**
3. 앱 정보 입력:
   - 앱 이름: `나의 스토어`
   - 사용자 지원 이메일: 본인 이메일 선택
   - 개발자 연락처 이메일: 본인 이메일 입력
4. **저장 후 계속** (범위, 테스트 사용자 단계는 기본값 유지)
5. 요약 확인 후 **대시보드로 돌아가기**

> **참고**: 처음에는 "테스트" 상태로 생성됩니다. 테스트 상태에서는 100명까지 로그인 가능하며, 정식 서비스 전에 **앱 게시**를 진행하면 누구나 로그인할 수 있습니다.

### 1-4. OAuth 2.0 클라이언트 ID 생성

1. 좌측 메뉴 → **API 및 서비스** → **사용자 인증 정보**
2. 상단 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `나의 예약 시스템` (자유롭게 지정)
5. **승인된 리디렉션 URI** 추가:
   ```
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   - `<SUPABASE_PROJECT_REF>`는 Supabase 프로젝트 URL에서 확인 (예: `https://abcdefghij.supabase.co` → `abcdefghij`)
6. **만들기** 클릭
7. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호(Secret)**를 복사해 두세요

> **중요**: 이 Client ID/Secret은 `.env.local`에 넣지 않습니다. Supabase 대시보드에 입력합니다 (2단계 참조).

### 1-5. Service Account 생성 (Calendar/Sheets용)

1. 같은 **사용자 인증 정보** 페이지에서
2. 상단 **+ 사용자 인증 정보 만들기** → **서비스 계정**
3. 서비스 계정 세부정보 입력:
   - 서비스 계정 이름: `my-service`
   - 서비스 계정 ID: 자동 생성됨 (예: `my-service@my-booking.iam.gserviceaccount.com`)
   - **이 이메일 주소를 복사해 두세요!** (이후 Calendar/Sheets 공유에 사용)
4. **완료** 클릭

### 1-6. JSON 키 발급

1. 생성된 서비스 계정 클릭 → **키** 탭
2. **키 추가** → **새 키 만들기** → **JSON** 선택 → **만들기**
3. JSON 파일이 자동 다운로드됨
4. 다운로드된 JSON 파일을 열어 아래 두 값을 확인:

```json
{
  "client_email": "my-service@my-booking.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADA...(매우 긴 문자열)...xxxxxxx\n-----END PRIVATE KEY-----\n"
}
```

### 1-7. 환경변수 입력

`.env.local` 파일에 아래 값을 입력합니다:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=my-service@my-booking.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADA...(전체 private_key 값)...\n-----END PRIVATE KEY-----\n"
```

> **주의**: `private_key` 값은 반드시 큰따옴표(`"`)로 감싸세요. JSON 파일의 값을 그대로 복사합니다.

---

## 2. Supabase Google Auth 연동

1-4에서 발급한 OAuth Client ID/Secret을 Supabase에 등록합니다.

### 2-1. Google Provider 활성화

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속 → 프로젝트 선택
2. 좌측 메뉴 → **Authentication** → **Providers**
3. **Google** 항목을 찾아 클릭하여 펼침
4. **Enable Sign in with Google** 토글 ON
5. 아래 필드 입력:
   - **Client ID**: 1-4에서 복사한 클라이언트 ID
   - **Client Secret**: 1-4에서 복사한 클라이언트 보안 비밀번호
6. **Save** 클릭

### 2-2. Redirect URL 설정

1. 같은 대시보드에서 **Authentication** → **URL Configuration**
2. **Redirect URLs** 섹션에 아래 URL을 추가:
   - 로컬 개발: `http://localhost:3000/auth/callback`
   - 프로덕션: `https://<your-domain>/auth/callback`
3. **Save** 클릭

### 2-3. 연동 확인

설정이 완료되면:
- `/login` 페이지에서 **Google로 로그인** 버튼 클릭
- Google 계정 선택 화면이 표시되고, 로그인 후 `/booking`으로 이동
- 미로그인 상태로 `/booking` 접근 시 → `/login`으로 자동 리다이렉트

> **참고**: `.env.local`에 별도의 Google OAuth 환경변수는 필요하지 않습니다. Supabase 클라이언트(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)만 있으면 Supabase가 Google OAuth 흐름을 서버 사이드에서 처리합니다.

---

## 3. Google Calendar 연동

### 3-1. 캘린더 생성 (권장)

기존 캘린더와 분리하기 위해 전용 캘린더를 만드는 것을 권장합니다.

1. [Google Calendar](https://calendar.google.com/) 접속
2. 좌측 **다른 캘린더** 옆 `+` → **새 캘린더 만들기**
3. 이름: `나의 예약` → **캘린더 만들기**

### 3-2. 캘린더 ID 확인

1. 좌측 캘린더 목록에서 `나의 예약` 옆 `⋮` (점 세 개) → **설정 및 공유**
2. 아래로 스크롤 → **캘린더 통합** 섹션
3. **캘린더 ID**를 복사 (형식: `xxxxxxxxxxxxxxxx@group.calendar.google.com`)

### 3-3. Service Account에 공유 권한 부여

1. 같은 설정 페이지에서 **특정 사용자와 공유** 섹션
2. **+ 사용자 추가**
3. 이메일: 1-5에서 복사한 **서비스 계정 이메일** 입력
4. 권한: **일정 변경** (Make changes to events) 선택
5. **보내기**

### 3-4. 환경변수 입력

```env
GOOGLE_CALENDAR_ID=xxxxxxxxxxxxxxxx@group.calendar.google.com
```

> **참고**: Google Calendar ID는 환경변수 외에도 관리자 설정 페이지(`/admin/settings`)의 "Google Calendar ID" 필드에서도 설정할 수 있습니다. 관리자 설정에 값이 있으면 환경변수보다 우선 적용됩니다.

### 3-5. 연동 확인

연동이 정상적으로 설정되면:
- 관리자가 예약을 **확정**(입금 확인)하면 → 캘린더에 이벤트 자동 생성
- 일정 **변경 승인** 시 → 캘린더 이벤트 일시 자동 수정
- 예약 **취소** 시 → 캘린더 이벤트 자동 삭제

---

## 4. Google Sheets 연동

### 4-1. 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com/) 접속
2. **새 스프레드시트** 생성
3. 이름 변경: `나의 예약 관리`

### 4-2. 시트 이름 설정

1. 하단 시트 탭에서 `시트1` 을 더블클릭
2. 이름을 **`예약목록`** 으로 변경 (정확히 일치해야 합니다)

### 4-3. 헤더 행 입력

첫 번째 행(1행)에 아래 헤더를 입력합니다:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| 신청일 | 확정일 | 수업명 | 예약자명 | 연락처 | 인원 | 일시 | 금액 | 상태 | 메모 |

> 헤더 행을 굵게 표시하고, 배경색을 넣어두면 보기 편합니다.

### 4-4. Service Account에 공유 권한 부여

1. 스프레드시트 우측 상단 **공유** 버튼 클릭
2. 이메일: 1-5에서 복사한 **서비스 계정 이메일** 입력
3. 권한: **편집자** (Editor) 선택
4. **보내기** (알림 메일 보내기 체크 해제 가능)

### 4-5. 스프레드시트 ID 확인

스프레드시트 URL에서 ID를 추출합니다:

```
https://docs.google.com/spreadsheets/d/[이 부분이 ID]/edit
```

예시: `https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit`
→ ID: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`

### 4-6. 환경변수 입력

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### 4-7. 연동 확인

연동이 정상적으로 설정되면:
- 관리자가 예약을 **확정**(입금 확인)하면 → 스프레드시트에 새 행 자동 추가
- 예약 **취소** 시 → 해당 행의 상태가 "취소"로 자동 업데이트
- 일정 **변경 승인** 시 → 해당 행의 일시가 자동 업데이트

---

## 5. 알리고 계정 가입 & API 키 발급

[알리고](https://smartsms.aligo.in)는 카카오 알림톡 + SMS 발송을 지원하는 대행사입니다.

### 5-1. 회원가입

1. [알리고 홈페이지](https://smartsms.aligo.in) 접속
2. **회원가입** → 사업자/개인 선택 후 가입 진행
3. 본인인증 완료

### 5-2. API 키 확인

1. 로그인 후 **마이페이지** → **API 설정** (또는 환경설정 > API Key 관리)
2. 아래 정보를 확인/복사:
   - **API Key**: 발급된 API 키
   - **User ID**: 알리고 로그인 아이디

### 5-3. 발신번호 등록

1. **문자 발송** → **발신번호 관리**
2. **발신번호 등록** 클릭
3. 공방 대표번호 입력 (예: `010-1234-5678`)
4. 본인 인증 또는 서류 인증 진행
5. 승인 완료 대기 (통상 1~2 영업일)

### 5-4. 관리자 설정 페이지에 입력

알리고 API 인증정보는 `.env.local`이 아닌 **관리자 설정 페이지**(`/admin/settings`)에서 입력합니다.

1. 관리자 계정으로 로그인 → `/admin/settings` 이동
2. **카카오 알림톡 / SMS** 섹션에서 **알림톡 발송** 토글을 ON
3. 아래 필드 입력:
   - **API Key**: 알리고에서 발급받은 API 키
   - **User ID**: 알리고 로그인 아이디
   - **SMS 발신번호**: 등록한 발신번호 (예: `010-1234-5678`)
4. **저장** 클릭

> **Sender Key**는 카카오 알림톡 연동 후 발급됩니다. (6단계 참조)

---

## 6. 카카오톡 채널 & 알림톡 템플릿 등록

### 6-1. 카카오톡 채널 개설

1. [카카오톡 채널 관리자센터](https://center-pf.kakao.com/) 접속
2. **새 채널 만들기**
3. 채널 정보 입력:
   - 채널 이름: `나의 스토어`
   - 검색용 아이디: `@mystudio` (원하는 아이디)
   - 카테고리: 적합한 카테고리 선택
4. **개설하기**

### 6-2. 비즈니스 채널 전환

알림톡을 보내려면 비즈니스 채널로 전환해야 합니다.

1. 채널 관리자센터 → **비즈니스 채널 전환**
2. 사업자등록증 업로드
3. 심사 대기 (통상 1~3 영업일)

### 6-3. 알리고에서 카카오 알림톡 연동

1. 알리고 로그인 → **카카오 알림톡** → **발신프로필 등록**
2. 카카오톡 채널 검색 → `나의 스토어` 선택
3. 인증 절차 진행 (카카오 관리자센터에서 승인)
4. 발신프로필 등록 완료 후 **Sender Key** 발급
5. 관리자 설정 페이지(`/admin/settings`)에서 **발신 프로필 키 (Sender Key)** 필드에 입력 → **저장**

### 6-4. 알림톡 템플릿 등록

알리고에서 **카카오 알림톡** → **템플릿 관리** → **템플릿 등록**

총 6개 템플릿을 등록합니다. 각 템플릿의 **템플릿 코드**가 시스템 코드와 일치해야 합니다.

> **참고**: 아래 템플릿의 `[나의 스토어]` 부분은 관리자 설정의 `notification_sender_name` 값으로 동적 치환됩니다. 알림톡 템플릿 등록 시에는 실제 사용할 스토어명으로 입력하세요.

---

#### 템플릿 1: 접수(입금대기) 안내

- **템플릿 코드**: `TP_APPROVAL`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성

```
[나의 스토어] 예약 접수 및 입금 안내

#{고객명}님, 예약이 접수되었습니다.

■ 수업: #{수업명}
■ 일시: #{일시}
■ 금액: #{금액}

▶ 입금 계좌: #{입금계좌}
▶ #{입금기한}시간 이내 입금 부탁드립니다.

입금 확인 후 확정 안내를 드립니다.
```

---

#### 템플릿 2: 확정(입금완료) 안내

- **템플릿 코드**: `TP_CONFIRMATION`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성
- **버튼**: 웹 링크 (변경 요청 페이지)

```
[나의 스토어] 예약 확정 안내

#{고객명}님, 입금이 확인되어 예약이 확정되었습니다.

■ 수업: #{수업명}
■ 일시: #{일시}
■ 금액: #{금액}

일정 변경이 필요하신 경우 아래 링크를 이용해 주세요.
▶ #{변경링크}

감사합니다. 나의 스토어에서 뵙겠습니다!
```

---

#### 템플릿 3: 반려 안내

- **템플릿 코드**: `TP_REJECTION`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성

```
[나의 스토어] 예약 반려 안내

#{고객명}님, 죄송합니다.
요청하신 예약이 반려되었습니다.

■ 수업: #{수업명}
■ 일시: #{일시}
■ 사유: #{반려사유}

다른 일정으로 다시 예약해 주시면 감사하겠습니다.
```

---

#### 템플릿 4: 취소 안내

- **템플릿 코드**: `TP_CANCELLATION`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성

```
[나의 스토어] 예약 취소 안내

#{고객명}님, 예약이 취소되었습니다.

■ 수업: #{수업명}
■ 일시: #{일시}

문의사항은 카카오톡 채널로 연락 부탁드립니다.
```

---

#### 템플릿 5: 일정 변경 승인

- **템플릿 코드**: `TP_CHANGE_APPROVED`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성

```
[나의 스토어] 일정 변경 승인 안내

#{고객명}님, 일정 변경이 승인되었습니다.

■ 수업: #{수업명}
■ 변경 전: #{변경전일시}
■ 변경 후: #{변경후일시}

변경된 일정으로 뵙겠습니다!
```

---

#### 템플릿 6: 일정 변경 거절

- **템플릿 코드**: `TP_CHANGE_REJECTED`
- **카테고리**: 예약/주문 안내
- **메시지 유형**: 정보성

```
[나의 스토어] 일정 변경 거절 안내

#{고객명}님, 죄송합니다.
요청하신 일정 변경이 승인되지 않았습니다.

■ 수업: #{수업명}
■ 현재 일정: #{일시}
■ 사유: #{거절사유}

기존 일정 그대로 진행됩니다.
```

---

### 6-5. 템플릿 검수

1. 각 템플릿 등록 후 **검수 요청** 버튼 클릭
2. 카카오 심사 대기 (통상 1~3 영업일)
3. **승인** 상태가 되면 발송 가능

> **참고**: 검수가 반려될 경우 반려 사유를 확인하고 메시지를 수정하여 재검수 요청합니다. 흔한 반려 사유:
> - 광고성 문구 포함 (정보성 알림톡에는 광고 불가)
> - 변수 형식 불일치
> - 카테고리와 내용 불일치

---

## 7. 환경변수 최종 확인

### 7-1. `.env.local` 환경변수

모든 설정이 완료되면 `.env.local` 파일이 아래와 같아야 합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Base URL (알림톡 내 링크 생성용)
NEXT_PUBLIC_BASE_URL=https://booking.example.com

# Google Service Account (Calendar + Sheets)
GOOGLE_SERVICE_ACCOUNT_EMAIL=my-service@my-booking.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxxxxxxx@group.calendar.google.com
GOOGLE_SHEETS_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

> **배포 시**: Vercel 대시보드의 **Settings** → **Environment Variables**에 동일한 값을 입력합니다. `NEXT_PUBLIC_BASE_URL`은 실제 도메인으로 변경하세요.

### 7-2. 관리자 설정 페이지 (`/admin/settings`)

아래 항목은 `.env.local`이 아닌 **관리자 설정 페이지**에서 관리합니다:

| 설정 항목 | 설명 |
|-----------|------|
| 알리고 API Key | 알리고에서 발급받은 API 키 |
| 알리고 User ID | 알리고 로그인 아이디 |
| 발신 프로필 키 (Sender Key) | 카카오 비즈메시지 발신 프로필 키 |
| SMS 발신번호 | 알리고에 등록한 발신번호 |
| 알림톡 발송 ON/OFF | 알림톡 발송 활성화 토글 |
| Google Calendar ID | 환경변수보다 우선 적용 (선택사항) |
| 알림 발신자명 | 알림톡 메시지의 스토어명 |
| 캘린더 이벤트 접두어 | 캘린더 이벤트 제목 접두어 |
| 입금 계좌 정보 | 은행명, 계좌번호, 예금주 |
| 입금 기한 | 입금 기한 (시간 단위) |

---

## 연동 테스트 체크리스트

모든 설정 완료 후 아래 순서로 테스트합니다:

- [ ] `/login` → **Google로 로그인** → 로그인 성공 후 `/booking`으로 이동 확인
- [ ] 미로그인 상태로 `/booking` 접근 → `/login`으로 리다이렉트 확인
- [ ] 예약 신청 → 관리자 **승인** → 알림톡(접수 및 입금 안내) 수신 확인
- [ ] 관리자 **입금 확인** → 알림톡(확정 안내) 수신 + Google Calendar 이벤트 생성 + Sheets 행 추가 확인
- [ ] 확정 알림톡의 **일정 변경 링크** 클릭 → 변경 요청 제출
- [ ] 관리자 **변경 승인** → 알림톡(변경 승인) 수신 + Calendar 이벤트 일시 변경 + Sheets 일시 업데이트 확인
- [ ] 관리자 **변경 거절** → 알림톡(변경 거절) 수신 확인
- [ ] 관리자 **반려** → 알림톡(반려 안내) 수신 확인
- [ ] 관리자 **취소** → 알림톡(취소 안내) 수신 + Calendar 이벤트 삭제 + Sheets 상태 "취소" 업데이트 확인
- [ ] 알림톡 발송 실패 시 → SMS 대체 발송 확인
- [ ] 관리자 알림 로그 페이지 → 실패 건 **재발송** 버튼 동작 확인

---

## 트러블슈팅

### Google Calendar에 이벤트가 생성되지 않는 경우

1. Service Account 이메일이 캘린더에 **편집** 권한으로 공유되었는지 확인
2. `GOOGLE_CALENDAR_ID`가 정확한지 확인 (기본 캘린더는 이메일 주소 형태)
3. Google Calendar API가 Cloud Console에서 **활성화**되었는지 확인
4. `private_key`의 `\n`이 실제 줄바꿈으로 처리되는지 확인

### Google Sheets에 데이터가 추가되지 않는 경우

1. 시트 이름이 정확히 `예약목록`인지 확인 (앞뒤 공백 주의)
2. Service Account에 **편집자** 권한이 부여되었는지 확인
3. Google Sheets API가 활성화되었는지 확인

### 알림톡이 발송되지 않는 경우

1. `/admin/settings`에서 **알림톡 발송** 토글이 ON인지 확인
2. 알리고 잔액이 충분한지 확인
3. 발신번호 등록이 **승인** 상태인지 확인
4. 템플릿 검수가 **승인** 상태인지 확인
5. 관리자 설정의 **발신 프로필 키 (Sender Key)**가 정확한지 확인
6. 관리자 페이지 **알림 로그**(`/admin/notifications`)에서 에러 메시지 확인

### SMS 대체 발송이 되지 않는 경우

1. 알리고 SMS 잔액이 충분한지 확인
2. 관리자 설정의 **SMS 발신번호**가 알리고에 등록된 발신번호와 일치하는지 확인
