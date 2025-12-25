# Trading Objective V2 개선 계획서 (Trading Objectives V2 Upgrade Plan)

현재의 단순 퍼센트 방식의 매매 목표(Trading Objectives)를 종목별 변동성(ATR)과 기술적 기준(이평선, 지지/저항)을 반영한 **지능형 목표가 시스템**으로 업그레이드하기 위한 계획입니다.

## 1. 단계별 로드맵 (Roadmap)

### Phase V2.1: 변동성 및 손익비 엔진 도입 (우선순위: ⭐⭐⭐)
- **핵심**: 고정 퍼센트 제거 → ATR 기반 손절 및 손익비(RR) 기반 목표가 설정
- **작업**: `src/utils/technical-analysis.ts` 로직 고도화 (BFF 단계 적용)

### Phase V2.2: 기술적 진입가 및 환경 필터 적용 (우선순위: ⭐⭐)
- **핵심**: 단순 현재가 진입 → 관점별(단/중/장기) 이평선 및 지지선 기반 진입가 설정
- **작업**: 이동평균선(MA) 및 지지/저항선 탐지 로직 추가

### Phase V2.3: 백엔드 엔진화 및 데이터 영속성 (우선순위: ⭐)
- **핵심**: Frontend 계산 → Python Backend 계산 및 DB 저장
- **작업**: `analyzer_daily.py` 내 로직 이식 및 Supabase `trading_objectives` 테이블 구축

---

## 2. 세부 구현 로직 (V2 Logic)

### 2.1 진입가 (Entry Price)
| 관점 | 진입 기준 로직 | 비고 |
| :--- | :--- | :--- |
| **단기** | `min(Current, VWAP, MA5, MA10)` | 단기 과열 시 진입 지연 |
| **중기** | `MA20` 또는 최근 20일 최저점 부근 | 기술적 반등 지점 |
| **장기** | `MA60` 또는 박스권 하단 | 가치 투자 매수 구간 |

### 2.2 손절가 (Stop Loss) - ATR 기반
**공식**: `Stop = Entry - (ATR * k)`
- **단기 (k=1.5)**: 노이즈 회피 수준의 타이트한 손절
- **중기 (k=2.0)**: 추세 유지를 위한 표준 손절
- **장기 (k=3.0)**: 매집 관점의 넓은 손절 범위

### 2.3 목표가 (Target Price) - RR 기반
**공식**: `Target = Entry + (Risk * RR)` (단, `Risk = Entry - Stop`)
- **단기 (RR=2.0)**: 빠른 순환매 타겟
- **중기 (RR=2.5)**: 추세 수익 극대화
- **장기 (RR=3.0~4.0)**: 큰 파동 수익 추구
> [!TIP]
> 계산된 목표가보다 강력한 저항선이 가까울 경우, 저항선을 우선순위로 설정

---

## 3. 아키텍처 및 데이터 설계

### 3.1 계산 엔진 이동
- **AS-IS**: Next.js BFF (`technical-analysis.ts`)에서 실시간 계산
- **TO-BE**: Python Admin Tool (`analyzer_daily.py`)에서 계산하여 Supabase에 적재
    - 장점: 로직 신뢰도 향상, 백테스트 가능, 결과 데이터의 과거 이력 추적 가능

### 3.2 신규 DB 스키마 (예시)
```sql
CREATE TABLE trading_objectives (
  ticker TEXT NOT NULL,
  timeframe TEXT NOT NULL, -- 'short', 'mid', 'long'
  entry REAL,
  stop REAL,
  target REAL,
  atr REAL,
  rr REAL,
  strategy_version TEXT DEFAULT 'V2.1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ticker, timeframe, created_at)
);
```

---

## 4. 기대 효과
- **종목별 맞춤형**: 변동성이 큰 종목(잡주)과 작은 종목(우량주)에 대해 서로 다른 손절/목표폭 자동 적용
- **심리적 안정**: 근거 없는 퍼센트 대신 기술적 지표에 기반한 "팔아야 할 이유"와 "버텨야 할 이유" 제공
- **데이터 기반**: 과거 목표가 달성률을 분석하여 알고리즘 성능 지속 개선 가능
