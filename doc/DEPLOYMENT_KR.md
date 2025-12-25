# DailyPort 배포 및 운영 가이드 (V2.0)

DailyPort는 대규모 시장 데이터 처리와 정교한 퀀트 분석을 위해 **Next.js 프론트엔드**와 **Python 분석 엔진**이 결합된 하이브리드 구조를 사용합니다.

## 🏗 아키텍처 (Architecture)

```mermaid
graph TD
    User[사용자 브라우저] -- HTTPS --> Vercel[Next.js (Vercel)]
    Vercel -- Read --> Supabase[(Supabase)]
    
    SubGraph_Local[로컬/서버 데이터 엔진]
        Engine[Python V2 엔진] -- Update --> SQLite[(dailyport.db)]
        Engine -- Upload --> Supabase
        Engine -- Fetch --> FDR[Price/Mcap]
        Engine -- Fetch --> Dart[ROE/Margin]
        Engine -- Fetch --> PyKRX[Supply/Technical]
    end
```

---

## 🚀 1. 프론트엔드 배포 (Vercel)

프론트엔드는 Next.js 기반으로 Vercel에 배포하는 것이 가장 효율적입니다.

### 배포 순서
1.  **Vercel 프로젝트 생성**: Vercel 대시보드에서 GitHub 레포지토리를 연결합니다.
2.  **환경 변수 설정**: 아래 [필수 환경 변수] 섹션을 참고하여 모든 키값을 등록합니다.
3.  **Deploy**: 메인 브랜치 푸시 시 자동으로 빌드 및 배포됩니다.

### 필수 환경 변수 (Vercel Settings)
| 변수명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | API Settings에서 확인 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | 클라이언트 데이터 조회용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 관리자 키 | DB 쓰기 권한 (선택사항) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 구글 시트 연동 계정 | GCP 서비스 계정 이메일 |
| `GOOGLE_PRIVATE_KEY` | 구글 API 프라이빗 키 | `\n` 포함 전체 문자열 (따옴표 필수) |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 알림 봇 토큰 | BotFather 발급 |
| `TELEGRAM_ADMIN_CHAT_ID` | 알림 수신자 ID | 관리자 Chat ID |

---

## 🛠 2. 데이터 엔진 설정 (로컬/서버 전용)

V2 알고리즘의 대규모 수집 로직은 Vercel의 시간 제한(60초)을 초과하므로, **로컬 PC** 또는 **별도 VPS**에서 실행해야 합니다.

### 사전 준비
- **Python 3.10+**: 설치 필요
- **Dependencies**: `pip install -r admin-tools/python/requirements.txt`
- **SQLite**: 프로젝트 루트에 `dailyport.db`가 자동 생성됩니다.

### 운영 절차
1.  **초기화**: `.\run_local_analysis.bat`를 실행하여 DB와 테이블을 세팅합니다.
2.  **데일리 업데이트**: 장 마감 후 `.\run_local_analysis.bat`를 실행하면 최신 데이터 수집부터 분석 보고서 업로드까지 자동으로 진행됩니다.
3.  **분기 업데이트**: 공시 시즌에 맞춰 `batch_financial_quarterly.py`를 실행하여 재무 데이터를 수집합니다.

---

## 🗄 3. Supabase 초기 설정

배포 전 Supabase SQL Editor에서 다음 테이블/정책이 설정되어 있어야 합니다.
- `daily_analysis_reports`: 개별 종목 분석 리포트 저장용
- `algo_picks`: V2 알고리즘 선정 종목 저장용
- `tickers` / `daily_price`: 로컬 데이터와 동기화 시 필요 (선택)

---

## ❓ 문제 해결 (Troubleshooting)

-   **Google Private Key 에러**: 환경 변수 입력 시 `-----BEGIN...` 부터 `...END PRIVATE KEY-----`까지 전체를 반드시 `" `(따옴표)로 감싸서 입력해야 합니다.
-   **공휴일 에러**: 휴장일에는 거래소 데이터가 없어 스크립트가 실행되지 않습니다. (정상 작동)
-   **DART API 제한**: 하루 1만 건 제한이 있으므로 전 종목 재무 데이터 수집 시 주의가 필요합니다.

---

## 📝 관리자 참고
상세한 파이썬 스크립트 명세는 `doc/ADMIN_TOOLS_GUIDE_KR.md`를 참고하시기 바랍니다.
