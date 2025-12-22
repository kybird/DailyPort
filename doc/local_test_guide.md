# DailyPort 로컬 테스트 가이드

이 문서는 DailyPort 서비스를 개발자 로컬 환경(PC)에서 실행하고 테스트하는 방법을 설명합니다.

## 1. 사전 준비 (Prerequisites)

*   **Node.js**: v18 이상 설치 권장.
*   **Supabase 프로젝트**: DB 및 Auth가 생성되어 있어야 합니다. (Step 1~3 완료 상태)
*   **Git**: 소스 코드 클론용.

## 2. 웹 애플리케이션 실행 (Next.js)

웹 대시보드, 포트폴리오 관리, 분석 UI, 구글 시트 연동 기능을 테스트합니다.

### 2.1. 환경 변수 설정
루트 디렉토리(`c:\Project\DailyPort`)의 `.env.local` 파일을 확인하거나 생성합니다.
**.env.local 파일에는 다음 키가 반드시 포함되어야 합니다:**

```ini
# Supabase (Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Sheets (Service Account JSON Key)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@email.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Telegram (Optional for Notification Test)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_ADMIN_CHAT_ID=123456789
```

### 2.2. 실행 명령어
터미널을 열고 루트 디렉토리에서 아래 명령어를 실행합니다.

```bash
# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

### 2.3. 접속 확인
브라우저에서 `http://localhost:3000`으로 접속합니다.
*   로그인/회원가입 테스트
*   대시보드 진입 확인
*   "Sync Sheet" 버튼으로 구글 시트 연동 테스트 (Dry-Run)

---

## 3. 관리자 도구 실행 (KIS Data Pump)

한국투자증권(KIS) API를 사용하여 외인/기관 수급 데이터를 DB에 업데이트하는 작업입니다. 보안상의 이유로 웹 서버와 분리되어 있습니다.

### 3.1. 환경 변수 설정
`admin-tools` 폴더 내의 `.env` 파일을 생성합니다. (루트의 `.env.local`과 다릅니다!)

**`c:\Project\DailyPort\admin-tools\.env` 내용:**

```ini
# KIS API (한국투자증권)
KIS_APP_KEY=your-app-key
KIS_APP_SECRET=your-app-secret

# Supabase (Admin 권한 필요 - Service Role Key)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh... (Settings > API > service_role secret)
```

> **주의:** `SUPABASE_SERVICE_ROLE_KEY`는 RLS 정책을 우회할 수 있는 강력한 키이므로 절대 GitHub나 클라이언트에 노출되면 안 됩니다.

### 3.2. 실행 명령어
새로운 터미널 창을 열고 `admin-tools` 폴더로 이동하여 실행합니다.

```bash
cd admin-tools

# 의존성 설치 (최초 1회)
npm install

# 데이터 펌프 실행
npm run pump
```

### 3.3. 결과 확인
*   터미널 로그에 `Updated [Ticker]: Foreign(...), Inst(...)` 메시지가 출력되는지 확인합니다.
*   웹 대시보드(`http://localhost:3000/dashboard`)에서 종목 분석 패널을 열어보면 "수급 데이터" 섹션에 수치가 표시되어야 합니다.

---

## 4. 문제 해결 (Troubleshooting)

### Q1. "Permission denied" 에러가 뜹니다.
*   **Google Sheet:** 해당 시트의 '공유' 설정에 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 주소가 '편집자'로 추가되었는지 확인하세요.
*   **KIS API:** API Key가 유효한지, 그리고 모의투자/실전투자 도메인 설정(`KIS_BASE_URL`)이 코드 내에서 올바른지 확인하세요 (`kis-pump.js` 상단 참조).

### Q2. 수급 데이터가 "데이터 없음"으로 나옵니다.
*   `npm run pump`를 실행했는지 확인하세요.
*   KIS API는 장 운영 시간 외에는 일부 데이터가 갱신되지 않을 수 있습니다.
*   DB `ticker_insights` 테이블에 해당 티커의 row가 생성되었는지 Supabase 대시보드에서 확인하세요.

### Q3. 분석 차트/지표가 이상합니다.
*   Yahoo Finance 데이터가 지연(15분 이상)되거나, 신규 상장 종목이라 과거 데이터(Historical Data)가 부족할 수 있습니다. `technical-analysis.ts`는 최소 50일 이상의 데이터가 있어야 정확한 지표를 산출합니다.
