# DailyPort Future TODOs & Backlog

This document tracks planned improvements and architectural goals for the DailyPort project.

## 🚀 High Priority (Near-term)

### 1. Real-time Data Fetching & Caching
- **Implementation**: Create a mechanism to fetch live price and supply data for tickers that are NOT currently in the `daily_analysis_reports` cache.
- **Goal**: Ensure that when a user adds a new stock to their watchlist mid-day, they don't have to wait for the next morning's admin tool run to see insights.

### 2. On-demand Python Sync Bridge
- **Implementation**: Develop a way for the Next.js frontend to trigger specific Python analysis sub-tasks (e.g., via a simple API or queue system).
- **Goal**: Allow users to request an "Immediate Refresh" for a specific stock's supply analysis.

### 3. Trading Objectives V2 (Intelligent Planning) [DONE]
- **Implementation**: Moved from fixed percentages to **ATR-based stop-loss** and **Risk/Reward based target prices**.
- **Result**: Provides stock-specific, volatility-adjusted trading plans with safety checks and resistance constraints.

### 4. Trading Objectives V2.1 (Confidence & Wait States) [DONE]
 - **Implementation**: Introduce `WAIT` / `ACTIVE` states based on trend confirmation (MA120/MA60).
 - **Goal**: Add technical confidence flags (RSI, Volatility) to let users know *why* a suggestion is made or why they should wait. (See [trading_objective_v2_1_plan.md](file:///c:/Project/DailyPort/doc/trading_objective_v2_1_plan.md))

## 📈 Long-term Improvements

### 3. Enhanced Caching Layer
- **Implementation**: Implement a more granular cache in Supabase/Redis that separates:
    - **Live Price** (updated every 1-5 mins)
    - **Daily Technicals** (updated daily)
    - **Deep Supply Analysis** (updated daily or on-demand)

### 4. Advanced Technical Indicators
- **Implementation**: Expand `technical-analysis.ts` to include Bollinger Bands, MACD, and Volume Profile.
- **Goal**: Provide professional-grade technical insights for complex investment decisions.

### 5. Yahoo Finance Quota Fallback (Python Bridge)
- **Problem**: Persistent `429 Quota Exceeded` errors from Yahoo Finance API for popular tickers.
- **Proposed Solution**:
    - Implement a fallback mechanism that triggers a local Python script (e.g., using `FinanceDataReader` or `pykrx` as robust local sources).
    - If Node.js `getMarketData` fails repeatedly, call `admin-tools/python/fetch_quote.py` via child_process.
    - Parse the Python stdout JSON and return it as `MarketData`.
- **Trigger**: Automatic fallback on >3 consecutive Yahoo failures.

---
*Last Updated: 2025-12-26*
