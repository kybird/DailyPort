# Admin Tools 사용 가이드 (KR)

`admin-tools` 디렉토리는 DailyPort 프로젝트의 데이터 관리 및 시스템 초기화를 담당하는 스크립트 모음입니다.
모든 명령어는 `admin-tools` 폴더 내부에서 `npm run <명령어>` 형태로 실행합니다.

## 사전 준비 (Prerequisites)
1.  **Node.js**: 설치 필요.
2.  **Conda**: Python 관련 스크립트 실행을 위해 필요 (`stock-data-service` 환경).
3.  **환경 변수**: `admin-tools/.env.local` 또는 상위 폴더의 `.env.local`이 설정되어 있어야 합니다.

---

## 명령어 목록 (Commands)

### 1. 데이터베이스 초기화
```bash
npm run setup
```
- **기능**: Supabase 데이터베이스에 필요한 테이블(`market_master`, `analysis_cache` 등)을 생성하거나 마이그레이션합니다.
- **언제 사용하나요?**: 프로젝트를 처음 세팅하거나 DB 스키마가 변경되었을 때.

### 2. 주식 목록 생성 (Truth Source 생성)
```bash
npm run gen-list
# 또는 배치 파일 실행: admin-tools/1_update_list.bat
```
- **기능**: 한국거래소(KRX)의 최신 전 종목 리스트(KOSPI, KOSDAQ)를 가져와 `src/data/stocks.json`을 생성합니다.
- **특징**: 초성 검색 데이터(`chosung`)를 자동으로 포함합니다.
- **실행 주체**: Python (`stock-data-service`의 `generate_stock_list.py`).

### 3. 주식 데이터 전체 동기화 (Batch Sync)
```bash
npm run sync-all-stocks
# 또는 배치 파일 실행: admin-tools/2_sync_prices.bat
```
- **기능**: `src/data/stocks.json`에 있는 **모든 종목**을 순회하며 최신 시세 및 투자자별 수급 데이터(개인/외국인/기관)를 Supabase에 저장합니다.
- **주의**: 약 2,700개 종목을 처리하므로 시간이 오래 걸립니다. 장 마감 후 실행을 권장합니다.

### 4. KRX 일별 시세 Bulk Sync (구 버전)
```bash
npm run sync
```
- **기능**: KRX API의 일별 전 종목 시세(Bulk Data)를 가져옵니다.
- **참고**: 현재는 `pykrx` 기반의 `sync-all-stocks`가 더 풍부한 데이터(수급 포함)를 제공하므로, API 키 문제 등이 있을 때 백업용으로 사용합니다.

### 5. KIS 데이터 펌프 (Legacy)
```bash
npm run pump
```
- **기능**: 한국투자증권(KIS) API를 사용하여 데이터를 가져오던 구 버전 스크립트입니다.

---

## 작업 흐름 예시 (Workflow)

매일 장 마감(16:00 이후) 후 데이터 갱신 시:

1.  **종목 리스트 최신화** (신규 상장/폐지 반영)
    ```bash
    npm run gen-list
    ```
2.  **전 종목 데이터 갱신**
    ```bash
    npm run sync-all-stocks
    ```
