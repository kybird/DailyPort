# Portfolio Rebalancing Feature Plan

This plan outlines the implementation of a target-weight-based portfolio rebalancing system.

## 1. UI/UX: Flexible Target Weight Management
Goal: Simplify the process of setting and maintaining an ideal asset allocation.

- **Manual Entry**: Users can input percentages directly or use a slider.
- **Convenience Features**:
    - **Equal Weight (1/N)**: A button to instantly distribute 100% equally across N stocks + Cash.
    - **Market Cap Weight**: A button to automatically weight stocks based on their relative market capitalization (Beta).
- **Validation**: Strict logic to ensure the total sum equals exactly 100% before saving.

## 2. Data Structure & Logic
Add a `target_weight` column to the portfolio/holdings table.

| Asset | Value | Current % | Target % | Gap (Deviation) |
| :--- | :--- | :--- | :--- | :--- |
| **Cash (KRW)** | 2,000,000 | 20% | 20% | 0% (Healthy) |
| Samsung Electronics | 5,000,000 | 50% | 40% | **+10% (Overweight)** |
| SK Hynix | 3,000,000 | 30% | 40% | **-10% (Underweight)** |

- **Gap Calculation**: `Gap = Current_Weight - Target_Weight`
- **Actionable Insight**: 
    - positive Gap $\rightarrow$ Sell candidate.
    - negative Gap $\rightarrow$ Buy candidate.

## 3. Cash as a First-Class Citizen (Crucial)
"Cash" must be treated as a permanent entry in the portfolio list.
- **Why?**: To enable tactical cash management (e.g., maintaining 20% cash for dip-buying).
- **Implementation**: Fixed "Cash (KRW)" entry at the top of the portfolio UI.

## 4. Development Roadmap
1.  **DB Update**: Add `target_weight` column to the relevant table (Supabase).
2.  **Portfolio Settings UI**: Create a page/dialog for defining target weights with 100% sum validation.
3.  **Analytics Layer**: Implement logic to calculate and display the 'Gap' for each holding.
4.  **AI Advisor Integration**: Connect to GPT/Claude to analyze the 'Gap' and suggest if *now* is the optimal market timing for rebalancing.

---
**Status**: Backlog / Feature Todo
