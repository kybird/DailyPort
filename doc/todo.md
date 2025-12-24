# DailyPort Future TODOs & Backlog

This document tracks planned improvements and architectural goals for the DailyPort project.

## 🚀 High Priority (Near-term)

### 1. Real-time Data Fetching & Caching
- **Implementation**: Create a mechanism to fetch live price and supply data for tickers that are NOT currently in the `daily_analysis_reports` cache.
- **Goal**: Ensure that when a user adds a new stock to their watchlist mid-day, they don't have to wait for the next morning's admin tool run to see insights.

### 2. On-demand Python Sync Bridge
- **Implementation**: Develop a way for the Next.js frontend to trigger specific Python analysis sub-tasks (e.g., via a simple API or queue system).
- **Goal**: Allow users to request an "Immediate Refresh" for a specific stock's supply analysis.

## 📈 Long-term Improvements

### 3. Enhanced Caching Layer
- **Implementation**: Implement a more granular cache in Supabase/Redis that separates:
    - **Live Price** (updated every 1-5 mins)
    - **Daily Technicals** (updated daily)
    - **Deep Supply Analysis** (updated daily or on-demand)

### 4. Advanced Technical Indicators
- **Implementation**: Expand `technical-analysis.ts` to include Bollinger Bands, MACD, and Volume Profile.
- **Goal**: Provide professional-grade technical insights for complex investment decisions.

---
*Last Updated: 2025-12-24*
