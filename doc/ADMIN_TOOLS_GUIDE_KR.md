# Admin Tools 사용 가이드 (V2.0 - 2025/12)

`admin-tools` 디렉토리는 DailyPort의 데이터 파이프라인(수집, 가공, 분석)을 관장하는 핵심 엔진입니다. V2.0부터는 Node.js 기반에서 **Python 퀀트 엔진** 중심으로 완전히 개편되었습니다.

## 🏗 시스템 구조
1. **수집(Harvest)**: FDR(가격), OpenDart(재무), PyKRX(수급)를 통해 데이터 수집
2. **저장(Storage)**: 로컬 `dailyport.db` (SQLite)에 데이터 적재 (Data Lake)
3. **분석(Analyze)**: V2 알고리즘으로 종목 스크리닝 및 개별 종목 리포트 생성
4. **배포(Publish)**: 분석 결과를 Supabase에 업로드하여 서비스 제공

---

## 🚀 일상 운영 (Daily Routine)

가장 권장되는 방법은 루트 디렉토리의 **배치 파일**을 사용하는 것입니다.

### 1. 매일 장 마감 후 실행 (원클릭)
- **실행 파일**: `run_local_analysis.bat` (루트 폴더)
- **수행 작업**:
    - DB 초기화 및 스키마 체크 (`db_init.py`)
    - 종목 마스터, 일별 가격, 수급 데이터 동기화 (`batch_daily.py`)
    - V2 알고리즘 스크리닝 및 Supabase 업로드 (`analyzer_daily.py`)
- **언제 하나요?**: 평일 16:00 이후 또는 익일 아침 9시 이전

### 2. 분기별 재무 데이터 업데이트 (수동)
새로운 분기 실적(영업이익률 등)이 발표되는 시점에 실행합니다.
```bash
# 예: 2024년 4분기 데이터 수집
python admin-tools/python/batch_financial_quarterly.py --year 2024 --quarter 4
```

---

## 🛠 주요 파이썬 스크립트 상세

### [Core] 파이프라인 관리
- **`batch_daily.py`**: 전체 수집 프로세스를 관리하며, 휴일 감지 시 자동 종료되는 보호 로직이 포함되어 있습니다.
- **`batch_price_daily.py`**: FinanceDataReader로 시세와 시각총액 정보를 동기화합니다.
- **`batch_financial_quarterly.py`**: DART API를 통해 공시된 영업이익률을 수집하여 로컬 DB에 병합합니다.

### [Logic] 분석 엔진
- **`analyzer_daily.py`**: V2 퀀트 알고리즘을 4개 팀(Value, Twin, Acc, Trend)별로 실행하고 최종 픽을 Supabase에 전송합니다.

---

## ⚠️ 주의 사항
- **환경 변수**: `admin-tools/.env.local`에 `DART_API_KEY`와 Supabase 연동 정보가 올바르게 설정되어 있어야 합니다.
- **공휴일**: 한국거래소 휴장일에는 데이터 수집이 불가능하므로 스크립트가 실행되지 않는 것이 정상입니다.
- **데이터 위치**: 모든 데이터는 프로젝트 루트의 `dailyport.db` (SQLite) 파일에 로컬로 보관됩니다.
