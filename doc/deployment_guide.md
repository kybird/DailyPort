# DailyPort 배포 및 설정 가이드

이 문서는 DailyPort 서비스를 Vercel에 배포하고 운영하기 위한 상세 설정 방법을 다룹니다.

## 1. Vercel 배포 순서

1.  **GitHub Repository 연결:**
    *   Vercel 대시보드에서 'Add New Project'를 클릭합니다.
    *   `DailyPort` 리포지토리를 선택하고 'Import'를 누릅니다.

2.  **Framework Preset:**
    *   `Next.js`가 자동으로 감지되어야 합니다. (빌드 커맨드 등 기본값 유지)

3.  **Environment Variables (환경 변수) 설정:**
    *   배포 전, **Settings > Environment Variables** 섹션에 아래 키값들을 반드시 입력해야 합니다.

## 2. 필수 환경 변수 목록

| 변수명 | 설명 | 값 예시 / 획득처 |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_SUPABASE_URL`** | Supabase 프로젝트 URL | Supabase Dashboard > Settings > API |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Supabase 공개 익명 키 | Supabase Dashboard > Settings > API |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | 구글 시트 연동용 서비스 계정 | GCP Console > Service Accounts |
| **`GOOGLE_PRIVATE_KEY`** | 서비스 계정 Private Key | GCP JSON 키 파일의 `private_key` 값 |
| **`TELEGRAM_BOT_TOKEN`** | 알림 발송용 봇 토큰 | Telegram BotFather |
| **`TELEGRAM_ADMIN_CHAT_ID`** | 알림 수신자(관리자) Chat ID | Telegram (`/getid` 봇 등 활용) |

### ⚠️ 주의사항: Google Private Key 입력
`GOOGLE_PRIVATE_KEY` 값에는 줄바꿈 문자(`\n`)가 포함되어 있습니다. Vercel 환경 변수 입력 시 이 줄바꿈이 그대로 문자열로 인식되거나 깨질 수 있습니다.

*   **입력 방법:** `-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n` 형태의 전체 문자열을 **따옴표(")로 감싸서** 복사해 넣는 것을 권장합니다.
*   코드 내 유틸리티(`google-sheets.ts`)에서 `replace(/\\n/g, '\n')` 로직이 이미 구현되어 있어, `\n` 문자열로 들어와도 정상적으로 치환됩니다.

## 3. 관리자 도구 (Local Admin Tools)
보안을 위해 **수급 데이터 펌프(KIS Data Pump)**는 Vercel 서버가 아닌 **개발자 로컬 환경**에서 실행합니다.

1.  경로 이동: `cd admin-tools`
2.  의존성 설치: `npm install`
3.  설정 파일 생성: `.env` 파일을 생성하고 아래 키 입력 (Vercel에는 올리지 마세요!)
    ```ini
    # KIS (한국투자증권) API
    KIS_APP_KEY=your_app_key
    KIS_APP_SECRET=your_app_secret

    # Supabase Service Role (Admin 권한)
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=eyJh... (Settings > API > service_role secret)
    ```
4.  데이터 업데이트 실행:
    ```bash
    npm run pump
    ```

## 4. Supabase 설정 (SQL & Policy)
배포 전 DB 스키마가 초기화되었는지 확인하세요.
*   `supabase/migrations` 폴더 내의 SQL 파일들을 Supabase SQL Editor에서 실행해야 합니다.
    *   `00_init_schema.sql`: 기본 테이블 및 RLS 정책
    *   `01_analysis_cache.sql`: 분석 캐시 테이블

## 5. 문제 해결 (Troubleshooting)

*   **Google Sheet Sync Error (403):**
    *   해당 구글 시트에 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 주소가 '편집자'로 초대되었는지 확인하세요.
*   **Vercel 배포 실패:**
    *   Build Log를 확인하세요. `Local Admin Tools` 폴더는 루트의 `tsconfig.json` 등에서 exclude 되어 있는지, 혹은 빌드 과정에 영향을 주지 않는지 확인이 필요할 수 있습니다. (현재 구조상 별도 폴더로 분리되어 영향 없음)
