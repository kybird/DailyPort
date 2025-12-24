# PyKRX API Reference & Usage Guide

This document contains key API usage information for `pykrx`, extracted from the official [GitHub README](https://github.com/sharebook-kr/pykrx).

## 1. MarketData API (Stock Price & Fundamental)

### 1.1 Ticker List
Fetch list of tickers for a specific date and market.
```python
from pykrx import stock

# specific date, specific market (KOSPI, KOSDAQ, KONEX, ALL)
tickers = stock.get_market_ticker_list("20240225", market="KOSDAQ")

# default (today, KOSPI)
tickers = stock.get_market_ticker_list()

# Get name
name = stock.get_market_ticker_name("005930")
```

### 1.2 OHLCV (Daily Price)
Fetch daily price history (Open, High, Low, Close, Volume).
```python
# (start_date, end_date, ticker)
df = stock.get_market_ohlcv("20240101", "20240225", "005930")

# Adjust price (default=True)
df = stock.get_market_ohlcv("20180427", "20180504", "005930", adjusted=False)

# Frequency (d=day, m=month, y=year)
df = stock.get_market_ohlcv("20200810", "20201212", "005930", "m")
```

### 1.3 Fundamental Data (PER, EPS, BPS)
Fetch fundamental indicators.
```python
# Specific date range for one ticker
df = stock.get_market_fundamental("20240104", "20240108", "005930")

# All tickers for a specific date
df = stock.get_market_fundamental("20240108", market="KOSDAQ")
```

### 1.4 Trading Value (Investor Breakdown)
Fetch net buying amount by investor type (Individual, Foreigner, Institution).
**Critical for DailyPort's "Supply/Demand" feature.**

```python
# (start_date, end_date, ticker)
df = stock.get_market_trading_value_by_date("20240101", "20240225", "005930")

# Columns: ['기관합계', '기타법인', '개인', '외국인합계', '전체']
```

## 2. Usage Caveats (Important)

1.  **Scraping Mechanism:** `pykrx` works by scraping KRX (Korea Exchange) or Naver Finance websites. It is **not** an official API.
2.  **Rate Limiting:** Excessive calls may lead to IP blocking by KRX.
    - **Best Practice:** Insert a delay (e.g., `time.sleep(1)`) between loops when fetching data for multiple tickers.
    - `get_stock_ticker_list()` loop example in docs usually includes `sleep(1)`.
3.  **Data Discrepancy:** Since it scrapes "displayed" data, there might be slight formatting differences or delays compared to direct brokerage APIs.
4.  **Market Holidays:** If queried on a holiday or weekend without data, it might return empty or previous close depending on the function. Always handle empty DataFrames.

## 3. DailyPort Integration Strategy
- **Service Location:** `admin-tools/stock-data-service/`
- **Execution:** Calls are made via `api/sync.py` (Vercel Function) which imports the logic.
- **Safety:** Since Vercel IPs might be rotated or shared, be cautious about rate limits if doing bulk updates from the cloud. For bulk "sync-all" operations, prefer running locally via `npm run sync-all-stocks`.
