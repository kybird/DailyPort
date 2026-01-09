# PyKRX API 레퍼런스 및 사용 가이드

이 문서는 공식 [GitHub README](https://github.com/sharebook-kr/pykrx)에서 추출한 `pykrx`의 주요 API 사용 정보를 담고 있습니다.

## 1. 시장 데이터 API (주가 및 펀더멘털)

### 1.1 종목 코드 목록
특정 날짜와 시장의 종목 코드 목록을 조회합니다.
```python
from pykrx import stock

# 특정 날짜, 특정 시장 (KOSPI, KOSDAQ, KONEX, ALL)
tickers = stock.get_market_ticker_list("20240225", market="KOSDAQ")

# 기본값 (오늘, KOSPI)
tickers = stock.get_market_ticker_list()

# 종목명 조회
name = stock.get_market_ticker_name("005930")
```

### 1.2 OHLCV (일별 시세)
일별 시세 이력(시가, 고가, 저가, 종가, 거래량)을 조회합니다.
```python
# (시작일, 종료일, 종목코드)
df = stock.get_market_ohlcv("20240101", "20240225", "005930")

# 수정주가 (기본값=True)
df = stock.get_market_ohlcv("20180427", "20180504", "005930", adjusted=False)

# 주기 (d=일, m=월, y=년)
df = stock.get_market_ohlcv("20200810", "20201212", "005930", "m")
```

### 1.3 펀더멘털 데이터 (PER, EPS, BPS)
펀더멘털 지표를 조회합니다.
```python
# 특정 종목의 날짜 범위 조회
df = stock.get_market_fundamental("20240104", "20240108", "005930")

# 특정 날짜의 전 종목 조회
df = stock.get_market_fundamental("20240108", market="KOSDAQ")
```

### 1.4 투자자별 매매동향 (수급 데이터)
투자자 유형별(개인, 외국인, 기관) 순매수 금액을 조회합니다.
**DailyPort의 "수급" 기능에 핵심적입니다.**

```python
# (시작일, 종료일, 종목코드)
df = stock.get_market_trading_value_by_date("20240101", "20240225", "005930")

# 컬럼: ['기관합계', '기타법인', '개인', '외국인합계', '전체']
```

## 2. 사용 시 주의사항 (중요)

1.  **스크래핑 메커니즘:** `pykrx`는 KRX(한국거래소) 또는 네이버 금융 웹사이트를 스크래핑하여 동작합니다. 공식 API가 **아닙니다.**
2.  **속도 제한:** 과도한 호출은 KRX에 의한 IP 차단을 초래할 수 있습니다.
    - **권장 사항:** 여러 종목의 데이터를 조회할 때 루프 사이에 지연(예: `time.sleep(1)`)을 삽입하세요.
    - 공식 문서의 `get_stock_ticker_list()` 루프 예제에는 보통 `sleep(1)`이 포함되어 있습니다.
3.  **데이터 불일치:** "표시된" 데이터를 스크래핑하므로, 증권사 API와 비교하여 약간의 포맷 차이나 지연이 있을 수 있습니다.
4.  **휴장일:** 데이터가 없는 휴일이나 주말에 조회하면, 함수에 따라 빈 값을 반환하거나 이전 종가를 반환할 수 있습니다. 항상 빈 DataFrame을 처리하세요.

## 3. DailyPort 통합 전략
- **서비스 위치:** `admin-tools/stock-data-service/`
- **실행:** `api/sync.py` (Vercel Function)를 통해 로직을 임포트하여 호출.
- **안전성:** Vercel IP는 교체되거나 공유될 수 있으므로, 클라우드에서 대량 업데이트 시 속도 제한에 주의하세요. 전체 "sync-all" 작업은 `npm run sync-all-stocks`를 통해 로컬에서 실행하는 것을 권장합니다.
