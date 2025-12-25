# DailyPort v2.0: Algorithm Quality Upgrade Plan

This plan outlines the transition from simple directional scanning to high-quality "Quality Filtering" to minimize "Value Traps" and low-liquidity noise.

## 1. Value Picks (Low Multiple + High Quality)
Goal: Identify stocks that are not just "cheap" but actively "profitable."
- **Current**: $0 < PER < 12$ AND $0.3 < PBR < 1.1$
- **v2.0 Logic**:
    - **ROE (Return on Equity)**: $\ge 10\%$ (Filters out inefficient capital management).
    - **Operating Margin**: $> 5\%$ (Ensures business profitability).
    - **Dividend Yield**: $> 1\%$ (Optional: provides price floor/downside protection).
- **Mantra**: "Undervalued (Low Multiple) but 확실하게 돈을 벌고 있는 (High Quality) 기업."

## 2. Twin Engines (Supply Intensity + Continuity)
Goal: Distinguish "noise" buying from "aggressive institutional accumulation."
- **Current**: Foreigner Net Buy $> 0$ AND Institutional Net Buy $> 0$
- **v2.0 Logic**:
    - **Supply Intensity**: $(Foreigner + Institutional Net Buy Amount) / Market Cap \ge 0.05\%$ (Requires meaningful relative volume).
    - **Continuity**: Net combined buy in $\ge 2$ out of the last 3 days (Filters out one-day scalpers).
    - **Entry Position**: Current Price $< 20MA + 10\%$ (Prevents chasing after a parabolic move).
- **Mantra**: "Meaningful money (Intensity) is flowing in, and it's not too late to enter."

## 3. Foreigner Accumulation (Stealth Mode)
Goal: Find the calm before the storm—energy compression with silent accumulation.
- **Current**: 20-day Foreigner Accumulation $> 0$, 21st Range Trend $\le 12\%$
- **v2.0 Logic**:
    - **Box Compression**: $(20-day High - 20-day Low) / 20-day Low < 10\%$ (Tighter volatility means higher energy potential).
    - **Price Support**: Current Price $>$ 60MA or 120MA (Maintains long-term uptrend context).
    - **Volume Drying**: 5-day Avg Volume $<$ 20-day Avg Volume (Silent accumulation often happens on low volume).
- **Mantra**: "Volume is drying up in a tight box, but Foreigner stake is silently rising."

## 4. Trend Following (Volume Breakout)
Goal: Catch high-probability breakouts with real momentum.
- **Current**: Bullish alignment (5/20/60/120 MA), near 120-day High.
- **v2.0 Logic**:
    - **Volume Power**: Today's Volume $> 20-day Avg Volume \times 1.5$ (Confirmed breakout strength).
    - **RSI Overheat Filter**: $RSI(14) < 70$ (Ensures there is still room to run before becoming overbought).
    - **Candle Integrity**: Upper Wick Length $<$ Body Length (Avoids 'fake' breakouts/selling pressure at peaks).
- **Mantra**: "Breaking out with strong volume but not yet overextended (Overbought)."

## 5. Global Hygiene Filters (Common WHERE Clause)
Applied to ALL algorithms to eliminate "junk" stocks.
- **Market Cap**: Minimum 100 Billion KRW (Avoids pump-and-dump schemes).
- **Admin/Suspended Stocks**: Explicitly excluded.
- **Liquidity**: 5-day Avg Trading Amount $\ge$ 1 Billion KRW (Ensures entry/exit feasibility).

---
**Next Steps**: 
- Update `analyzer_daily.py` logic to incorporate these filters.
- Add necessary financial data (ROE, Margin) to the Supabase sync process.
