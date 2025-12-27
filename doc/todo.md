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




할일

1. EFT 주식 없음

2. 무료로 시작하기 눌렀을때 화면과

3. 로그인버튼을 눌렀을떄 화면이 다르다.

7. 네이버 로그이 구현완료 안됨

8. 구글 로그인 로컬로 리다이렉트됨

9. 카카오로그인도 로컬로 리다이렉트됨

10. 비밀번호 찾기 버튼 동작안함

11. 환영합니다! 밑에 표시내용이 더욱빠른대시보드로딩을 위해 항목이 별도 페이지로 분리되었습니다. 이게왜들어가

12. 차트 트래이딩뷰 마크 보기싫긴 보기싫다. ㅋ

13. 차트 오른쪽으로는 움직일수 있게해야할것 같다.


AI 와 상의 필요

1. 무료회원가입을 없앨까? SNS 로그인만 남기고. 
6. 아이콘 벡터아이콘으로?? 이미지 아이콘은 다크모드 대응이 안되나
4. 야후파이낸스 대채 파이선 함수 구현
=> 가져오고 캐싱하는구조. 캐시는 얼마나 유지? 레디스가있기는해야하는데 쓸게있나
5. 메인화면 워딩이 너무 어설프다 차라리 없는게 나을듯
6. 법적인 내용 홈페이지에 표시해야하는거 확인후 추가
7. 아이디 비번틀렸을때 표시 가시성이 떨어짐


8. Daily Insight 표시방식 검토 필요함
    왜 목표가가 (75,300.0) 효성중공업.
    뭘어떻게 표시하게 되있는걸까

9.  진입가 기능은 어떻게 동작하는가? 차라리 AI 호출한번하는게 나을지도.

10. PER 가 네이버 finance 와 동일하지않다

11. 상대강도및 수급동향. 연기금 표시가능한가?

12. 재무는 따로 카드로

13. 전략시뮬레이션??? 이름이 이상하다 포트폴리오라고 쓰면 안되나?

13. 전략시뮬레이션에서 오늘의 변화가 제대로 계산된거맞는가?
14. 총수익률이라고 쓰는게 낫지않을까.

15. 포트폴리오에서 거래 버튼의 매수/매도 는 이상하다. 편집으로 바꿔야겟네

16. 검증알고리즘도 이상함.

17. 추세추종 지표가 거래강도가 기준의 1.5 배만있는건가?

18. 통합순위의 기준은 뭐냐

19. 쌍끌이 수급에 표시되는 co_momentum 과 demand_power 는 뭐냐 그리고 그걸 어떤기준으로 판단하는지 안나옴

20. 외국인 매집도 acc_21d 와 box_range 를 표시하는데.. 기준은 안나옴

21. 알고리즘 검증 이름도 이상함, 레이아웃도 좀 바꾸고싶다.

22. 우선 알고리즘 설명에 표시된 내용이 그대로 적용되는지 확인필요
