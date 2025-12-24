# 프로젝트 마스터 지시서: DailyPort (Daily Investment Routine Helper)

## 1. 프로젝트 개요 (Identity: Personal Data Powerhouse)

**"개인은 기관처럼 데이터를 쌓고, 확인은 직장인처럼 가볍게."**

DailyPort는 투자자가 집 컴퓨터(Local)를 '데이터 분석 센터'로 활용하고, 웹(Web)에서는 분석된 '인사이트'만 가볍게 소비하는 **하이브리드 투자 보조 도구**입니다.

### 1.1 핵심 철학
- **Local Data Lake**: 2,900개 전 종목의 방대한 역사(시세/재무)는 로컬(SQLite)에 쌓아둡니다. 클라우드 비용 0원.
- **Cloud Data Mart**: 분석 결과(매수 신호, 추천 리스트)만 클라우드(Supabase)로 전송합니다.
- **Daily Routine**: 실시간 호가창 쳐다보기(Real-time) 대신, **"장 마감 후 깊이 있는 분석(Batch)"**을 통해 다음 날의 행동을 결정합니다.

---

## 2. 아키텍처 (Hybrid Structure)

### 🏗️ Local Engine (The Factory)
- **위치:** 사용자 PC (Admin Tools)
- **DB:** **SQLite** (`dailyport.db`)
- **역할:**
    - **수집(Ingest):** 매일 장 마감 후 PyKRX/KIS API를 통해 전 종목 일봉 & 재무 데이터 업데이트.
    - **분석(Analyze):** 
        1. 내 포트폴리오 정밀 진단 (추세 붕괴 여부, 손절/익절 가이드).
        2. '대가의 투자법' 알고리즘으로 전 종목 스크리닝 (Guru Screening).
    - **배포(Publish):** 분석된 결과(JSON 리포트)를 Supabase에 업로드.

### ☁️ Cloud Viewer (The Dashboard)
- **위치:** Vercel (Next.js Web App)
- **DB:** **Supabase** (PostgreSQL)
- **역할:**
    - 로컬에서 올라온 **"Daily Brief"**(오늘의 조언)를 시각화.
    - 무거운 연산 없이 즉각적인 로딩 속도 제공.
    - 모바일/PC 어디서든 접근 가능.

---

## 3. MVP 핵심 기능 (Daily Routine Flow)

요란한 기능은 뺍니다. 아침 10분 브리핑에 집중합니다.

### 3.1. 전 종목 스크리닝 (Guru Picks)
- **기능:** 벤자민 그레이엄, 윌리엄 오닐 등 대가들의 조건을 만족하는 종목을 매일 밤 발굴.
- **출력:** "오늘의 가치주 Top 10", "오늘의 돌파매매 후보 Top 10".
- **데이터:** 이 리스트는 공용 데이터로 Supabase에 저장되어 친구들과 공유 가능.

### 3.2. 내 종목 정밀 진단 (My Portfolio)
- **기능:** 내가 보유한 종목의 현재 위치를 객관적으로 평가.
- **체크리스트:** 
    - [ ] 20일 이동평균선 위에 있는가?
    - [ ] 기관 수급이 들어오고 있는가?
    - [ ] 손실폭이 -10%를 넘었는가?
- **출력:** "삼성전자: 관망(HOLD) - 추세는 살아있으나 수급이 꼬임".

### 3.3. 모닝 브리핑 (Daily Briefing)
- **화면:** 웹 접속 시 첫 화면.
- **내용:**
    - 🚨 **긴급:** "보유하신 종목 A가 지지선을 이탈했습니다."
    - 💎 **발굴:** "관심 가질만한 신규 종목 3개가 발견되었습니다."
    - 📊 **시장:** "어제 코스피는 하락 추세로 전환되었습니다."

---

## 4. 데이터 전략 (Data Strategy)

### 4.1 소스 (Source)
- **PyKRX (Python):** 전 종목 일봉, 재무지표 (무료, 배치 작업용).
- **KIS API (Python):** (필요시) 정밀한 수급 데이터 보완.

### 4.2 저장소 분리 전략
| 데이터 종류 | 저장소 | 이유 |
| :--- | :--- | :--- |
| **Raw Data** (2년치 시세, 재무제표) | **Local SQLite** | 용량이 크고(수백 MB), 웹에서는 직접 볼 필요 없음. |
| **Insights** (매매 신호, 추천 리스트) | **Cloud Supabase** | 용량이 작고(수 KB), 언제 어디서든 확인해야 함. |
| **User Data** (보유 종목, 관심 종목) | **Cloud Supabase** | 여러 기기에서 동기화 필요. |

---

## 5. 개발 로드맵

### Phase 1: The Engine (Local Python)
- SQLite 스키마 설계 (`daily_price`, `fundamentals`, `guru_config`).
- 데이터 수집기 구현 (Daily Batch Script).
- 분석기 구현 (Scoring & Filtering Logic).

### Phase 2: The Bridge (Uploader)
- 분석 결과를 JSON으로 변환하여 Supabase에 Upsert 하는 모듈 구현.
- `daily_reports`, `guru_picks` 테이블 설계.

### Phase 3: The View (Web)
- Next.js 대시보드 UI 구현.
- "오늘의 추천" 및 "내 종목 진단" 카드 UI 개발.