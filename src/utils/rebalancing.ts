
export type StrategyType = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface StrategyParams {
    name: string;
    description: string;
    baseWeight: number;
    momentumWeight: number;
    volatilityPenalty: number;
    yieldWeight: number;
    tolerance: number;
}

export const STRATEGIES: Record<StrategyType, StrategyParams> = {
    CONSERVATIVE: {
        name: '보수적',
        description: '리스크 최소화, 목표 비중 엄격 준수, 변동성 경계',
        baseWeight: 1.0,
        momentumWeight: 0.2,
        volatilityPenalty: 0.3,
        yieldWeight: 0.1,
        tolerance: 2,
    },
    BALANCED: {
        name: '균형',
        description: '리스크와 수익의 균형, 시장 흐름 일부 반영',
        baseWeight: 1.0,
        momentumWeight: 0.5,
        volatilityPenalty: 0.15,
        yieldWeight: 0.2,
        tolerance: 5,
    },
    AGGRESSIVE: {
        name: '공격적',
        description: '수익 극대화, 모멘텀 추종, 변동성 수용',
        baseWeight: 0.7,
        momentumWeight: 0.8,
        volatilityPenalty: 0.0,
        yieldWeight: 0.3,
        tolerance: 10,
    }
};

export interface HistoricalPoint {
    date: string;
    close: number;
}

/**
 * 20일 가격 모멘텀 계산 (%)
 */
export function calculateMomentum(historical: HistoricalPoint[]): number {
    if (historical.length < 21) return 0;
    const current = historical[historical.length - 1].close;
    const prev = historical[historical.length - 21].close;
    return ((current - prev) / prev) * 100;
}

/**
 * 20일 기준 연율화 변동성 계산 (%)
 */
export function calculateVolatility(historical: HistoricalPoint[]): number {
    if (historical.length < 21) return 0;

    // 최근 20일간의 일일 수익률 계산
    const returns: number[] = [];
    for (let i = historical.length - 20; i < historical.length; i++) {
        const r = (historical[i].close - historical[i - 1].close) / historical[i - 1].close;
        returns.push(r);
    }

    // 표준편차 계산
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 연율화 (sqrt(252))
    return stdDev * Math.sqrt(252) * 100;
}

export interface PortfolioAnalysisItem {
    ticker: string;
    name: string;
    currentWeight: number;
    targetWeight: number;
    momentum: number;
    volatility: number;
    totalReturn: number;
    currentValue: number;
}

export interface RebalancingSuggestion {
    ticker: string;
    name: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    score: number;
    reason: string;
    diffWeight: number; // 목표 - 현재
}

/**
 * 전략별 리밸런싱 제안 생성
 */
export function getRebalancingSuggestions(
    items: PortfolioAnalysisItem[],
    strategyType: StrategyType
): RebalancingSuggestion[] {
    const params = STRATEGIES[strategyType];

    return items.map(item => {
        // 비중 차이 (보정 가중치 적용)
        const weightDiff = item.targetWeight - item.currentWeight;

        // 통합 점수 계산
        const score = (weightDiff * params.baseWeight)
            + (item.momentum * params.momentumWeight)
            - (item.volatility * params.volatilityPenalty)
            + (item.totalReturn * params.yieldWeight);

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = '';

        const absDiff = Math.abs(weightDiff);

        if (absDiff > params.tolerance) {
            if (weightDiff > 0) {
                action = 'BUY';
                reason = `목표 비중 대비 ${absDiff.toFixed(1)}% 미달`;
            } else {
                action = 'SELL';
                reason = `목표 비중 대비 ${absDiff.toFixed(1)}% 초과`;
            }
        }

        // 가중치에 따른 보조 의견 추가
        if (item.momentum > 5 && strategyType !== 'CONSERVATIVE') {
            reason += (reason ? ' + ' : '') + '강한 모멘텀';
        } else if (item.volatility > 25 && strategyType === 'CONSERVATIVE') {
            reason += (reason ? ' + ' : '') + '높은 변동성 경계';
        }

        if (action === 'HOLD' && absDiff > 1) {
            reason = '허용 오차 범위 내 유지';
        } else if (action === 'HOLD') {
            reason = '비중 적정';
        }

        return {
            ticker: item.ticker,
            name: item.name,
            action,
            score,
            reason,
            diffWeight: weightDiff
        };
    });
}
