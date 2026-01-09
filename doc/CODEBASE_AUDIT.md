# 코드베이스 감사 및 정리 계획

이 문서는 "서버리스 SaaS" 모델에서 **"개인 로컬 엔진"** 모델로 전환하기 위해 코드베이스에 필요한 변경 사항을 설명합니다.

## 1. 삭제할 파일 (정리)
이 파일들은 이전 전략(Vercel에서 서버 사이드 스크래핑 또는 직접 API 호출)의 잔재이며 더 이상 필요하지 않습니다.

| 파일 경로 | 삭제 이유 |
| :--- | :--- |
| `api/sync.py` | **주요**: 더 이상 Vercel 서버리스 함수에서 PyKRX를 스크래핑하지 않음. 데이터 수집은 이제 로컬에서 수행. |
| `api/requirements.txt` | 삭제된 `sync.py`의 의존성 파일. |
| `admin-tools/krx-sync.js` | **레거시**: KRX를 직접 스크래핑하던 구 Node.js 스크립트. 견고한 `pykrx` Python 엔진으로 대체됨. |
| `admin-tools/sync-stocks.js` | **레거시**: `batch_daily.py` 유니버스 관리로 대체됨. |
| `admin-tools/update-stock-list.js` | **레거시**: `batch_daily.py`로 대체됨. |
| `admin-tools/2_sync_prices.bat` | **레거시**: 새 실행 스크립트(예: `run_engine.bat`)로 대체 예정. |

## 2. 수정할 파일
이 파일들은 부분적으로 유용한 로직을 포함하고 있지만 재정렬이 필요합니다.

| 파일 경로 | 작업 |
| :--- | :--- |
| `admin-tools/kis-pump.js` | **리팩토링**: "일회성 덤프"에서 실시간 KIS 데이터를 Supabase로 푸시하는 "관심종목 루프"로 전환. |
| `admin-tools/stock-data-service/main.py` | **리팩토링**: `batch_daily.py`로 이름 변경. Supabase 직접 Upsert에서 **로컬 SQLite Insert**로 대상 변경. |
| `src/app/actions_analysis.ts` | **업데이트**: 기존 `analysis_cache` 대신 새로운 `daily_analysis_reports` 테이블에서 읽도록 로직 수정. |

## 3. 생성할 파일 (새 엔진)
새로운 아키텍처의 핵심입니다.

| 파일 경로 | 목적 |
| :--- | :--- |
| `admin-tools/schema_sqlite.sql` | **스키마**: SQLite용 `tickers`, `daily_price`, `fundamentals` 정의. |
| `admin-tools/db_init.py` | **설정**: 로컬 `dailyport.db` 초기화. |
| `admin-tools/batch_daily.py` | **수집**: 야간 워커. PyKRX 데이터 조회 -> SQLite 저장. |

## 4. 다음 단계
1.  **정리 승인**: 섹션 1에 나열된 파일들 삭제.
2.  **DB 초기화**: 스키마 및 초기화 스크립트 생성.
3.  **로직 마이그레이션**: `main.py` 로직을 `batch_daily.py`로 이동하고 SQLite 사용으로 수정.
