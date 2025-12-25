# Trading Objective V2.1 Upgrade Plan (Intelligent Planning)

기존 V2의 ATR/RR 기반 계산 로직을 계승하되, 시장 상황에 따라 "관망(WAIT)" 상태를 제시하고 신뢰도 플래그(Confidence Flags)를 제공하는 지능형 시스템으로의 업그레이드 계획입니다.

## 0. 개요
*   **핵심 가치**: "무조건적인 목표가 제시"가 아닌, "지금은 기다려야 할 때"를 알려주는 시스템.
*   **변경 대상**:
    *   `src/utils/technical-analysis.ts` (로직 엔진)
    *   `src/app/actions_analysis.ts` (WAIT 상태 전달)
*   **변경 안 함**:
    *   DB 스키마 및 Supabase 테이블 구조 (기존 V2 호환 유지)

## 1. 데이터 정의 (Types)

### Candle 타입
```typescript
export type Candle = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

### 신뢰도 플래그 (Confidence Flags)
```typescript
export type ConfidenceFlag =
  | "UPTREND_CONFIRMED" // 정배열 확인
  | "TREND_WEAK"        // 추세 약화
  | "OVERBOUGHT"        // RSI 과매수
  | "OVERSOLD"          // RSI 과매도
  | "HIGH_VOLATILITY"   // 고변동성 (위험)
  | "LOW_VOLATILITY"    // 저변동성 (안정)
```

### 상태 및 결과 타입
```typescript
export type ObjectiveStatus = "ACTIVE" | "WAIT" | "DISABLED"

export type TradingObjective = {
  status: ObjectiveStatus
  entry?: number
  stop?: number
  target?: number
  confidenceFlags: ConfidenceFlag[]
  reason?: string   // WAIT 또는 DISABLED 상태의 이유
}
```

## 2. 세부 구현 로직

### 2.1 데이터 검증 (최소 가드)
*   `candles.length < 120`인 경우 `null` 반환.
*   **이유**: MA120, 장기 지지/저항선 확인을 위한 최소 데이터 확보.

### 2.2 지표 계산
*   **SMA**: 5, 10, 20, 60, 120
*   **ATR**: 14
*   **RSI**: 14

### 2.3 추세 판정
*   **Long-term Uptrend**: `MA20 > MA60 > MA120`
*   **Mid-term Uptrend**: `MA20 > MA60`

### 2.4 상태 판정 (WAIT vs ACTIVE)
1.  **공통 WAIT 조건 (Neutral)**: 추세가 불분명하고 RSI가 40~60 사이인 경우.
2.  **관점별 전략**:
    *   **Short (단기)**: 항상 계산 수행 (`WAIT` 없음).
    *   **Mid (중기)**: 공통 WAIT 조건 충족 시 `WAIT` 상태 (사유: "No clear mid-term trend").
    *   **Long (장기)**: `isUptrend`가 아닐 경우 `WAIT` 상태 (사유: "Broken long-term trend").

### 2.5 산출 공식 (V2 계승)
*   **Entry**: `min(Current, MA_period)`
*   **Stop**: `entry - (ATR * multiplier)` (최근 저점 방어 및 `stop < entry` 강제)
*   **Target**: `entry + (Risk * RR)` (최근 고점/저항선 돌파 여부 제한)
*   **Rounding**: 종목 가격대별 동적 라운딩 (10/100/1,000원)

## 3. 기대 효과
*   **리스크 관리**: 추세가 깨진 종목에 대해 억지로 목표가를 잡는 대신 유저에게 "기다림"을 권고.
*   **근거 중심**: `Confidence Flags`를 통해 왜 이 가격이 도출되었는지(혹은 왜 기다려야 하는지) 기술적 근거 제공.
*   **안정적 스케일링**: DB 변경 없이 백엔드/프론트엔드 로직 수정만으로 고도화된 인사이트 제공 가능.

---
*Created: 2025-12-25 (V2.1 Draft)*
