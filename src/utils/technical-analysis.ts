
import { RSI, MACD, EMA, ATR, SMA } from 'technicalindicators'
import { MarketData } from './market-data'

export interface HistoricalBar {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
}

export type ConfidenceFlag =
    | 'UPTREND_CONFIRMED'
    | 'BROKEN_TREND'
    | 'TREND_WEAK'
    | 'OVERBOUGHT'
    | 'OVERSOLD'
    | 'HIGH_VOLATILITY'

export type StrategyType =
    | 'PULLBACK_TREND'
    | 'BREAKOUT'
    | 'MEAN_REVERSION'
    | 'NO_TRADE'

export interface ObjectiveV3 {
    status: 'ACTIVE' | 'WAIT' | 'AVOID'
    score: number            // 0 ~ 100
    strategy: StrategyType
    confidenceFlags: ConfidenceFlag[]
    reason: string
    entry: number | null
    stop: number | null
    target: number | null
}

export interface TradingObjectiveV3Result {
    short: ObjectiveV3 | null
    mid: ObjectiveV3 | null
    long: ObjectiveV3 | null
}

export interface TechnicalAnalysisResult {
    rsi: {
        value: number
        status: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' | 'UNKNOWN'
    }
    macd: {
        macd: number
        signal: number
        histogram: number
        status: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    }
    trend: {
        emaShort: number // 20
        emaLong: number  // 60
        status: 'GOLDEN_CROSS' | 'DEAD_CROSS' | 'UP_TREND' | 'DOWN_TREND' | 'NEUTRAL'
    }
    movingAverages?: {
        ma5: number
        ma20: number
    }
    objectives?: TradingObjectiveV3Result | null
}

/**
 * Rounds price to Korean market units
 */
function roundToMarketUnit(price: number): number {
    if (price < 10000) return Math.round(price / 10) * 10
    if (price < 100000) return Math.round(price / 100) * 100
    return Math.round(price / 1000) * 1000
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

export function calculateObjectives(currentPrice: number, candles: HistoricalBar[] | undefined): TradingObjectiveV3Result | null {
    if (!candles || candles.length < 120) {
        console.warn(`[calculateObjectives] Insufficient data: ${candles?.length || 0} bars. V3 requires at least 120.`)
        return null
    }

    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const closes = candles.map(c => c.close)

    // SMA: 5, 10, 20, 60, 120
    const ma5Arr = SMA.calculate({ values: closes, period: 5 })
    const ma10Arr = SMA.calculate({ values: closes, period: 10 })
    const ma20Arr = SMA.calculate({ values: closes, period: 20 })
    const ma60Arr = SMA.calculate({ values: closes, period: 60 })
    const ma120Arr = SMA.calculate({ values: closes, period: 120 })

    // ATR: 14
    const atr14Arr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })

    // RSI: 14
    const rsi14Arr = RSI.calculate({ values: closes, period: 14 })

    const ma5 = ma5Arr[ma5Arr.length - 1]
    const ma10 = ma10Arr[ma10Arr.length - 1]
    const ma20 = ma20Arr[ma20Arr.length - 1]
    const ma60 = ma60Arr[ma60Arr.length - 1]
    const ma120 = ma120Arr[ma120Arr.length - 1]
    const atr = atr14Arr[atr14Arr.length - 1]
    const rsi = rsi14Arr[rsi14Arr.length - 1]

    const recentHigh = Math.max(...highs.slice(-20))
    const recentLowShort = Math.min(...lows.slice(-20))
    const recentLowMid = Math.min(...lows.slice(-60))
    const recentLowLong = Math.min(...lows.slice(-120))

    const solve = (timeframe: 'short' | 'mid' | 'long'): ObjectiveV3 => {
        const flags: ConfidenceFlag[] = []
        let reason = ""

        // Indicator Checks
        if (ma5 === undefined || ma10 === undefined || ma20 === undefined || ma60 === undefined || ma120 === undefined || atr === undefined || rsi === undefined) {
            return {
                status: 'WAIT',
                score: 50,
                strategy: 'NO_TRADE',
                confidenceFlags: [],
                reason: "지표 계산 실패 (데이터 부족)",
                entry: null,
                stop: null,
                target: null
            }
        }

        // 1. Scoring Logic (§7)
        let trendScore = 0
        if (ma20 > ma60 && ma60 > ma120) trendScore = 30
        else if (ma20 > ma60) trendScore = 20
        else trendScore = -30

        let momentumScore = 0
        if (rsi >= 50 && rsi <= 65) momentumScore = 10
        else if (rsi > 70) momentumScore = -10
        else if (rsi < 30) momentumScore = -5

        let volatilityAdj = 0
        const volRatio = (atr / currentPrice) * 100
        if (volRatio < 3) volatilityAdj = 5
        else if (volRatio > 8) volatilityAdj = -15

        // Initial score for status check (Partial score without penalty)
        let baseScore = 50 + trendScore + momentumScore + volatilityAdj

        // 2. Entry / Stop / Target (§8)
        let entryVal: number = currentPrice
        let multiplier = 2.0
        let rr = 2.5
        let minLow = recentLowMid

        if (timeframe === 'short') {
            entryVal = Math.min(currentPrice, ma5, ma10)
            multiplier = 1.5
            rr = 2.0
            minLow = recentLowShort
        } else if (timeframe === 'mid') {
            entryVal = Math.min(currentPrice, ma20)
            multiplier = 2.0
            rr = 2.5
            minLow = recentLowMid
        } else {
            entryVal = Math.min(currentPrice, ma60)
            multiplier = 3.0
            rr = 3.0
            minLow = recentLowLong
        }

        let stopVal = entryVal - (atr * multiplier)
        stopVal = Math.max(stopVal, minLow)

        let riskPenalty = 0
        // Spec says: stop / entry < 3% -> -10. This is likely a typo in spec for "Risk percentage"
        // Interpretation: (entry - stop) / entry < 0.03
        if ((entryVal - stopVal) / entryVal < 0.03) riskPenalty -= 10

        let targetVal = entryVal + (entryVal - stopVal) * rr
        targetVal = Math.min(targetVal, recentHigh > entryVal ? recentHigh : targetVal)

        if ((targetVal - entryVal) / (entryVal - stopVal) < 2.0) riskPenalty -= 10

        const finalScore = clamp(baseScore + riskPenalty, 0, 100)

        // 3. Status Determination (§6)
        let status: 'ACTIVE' | 'WAIT' | 'AVOID' = 'AVOID'
        if (finalScore >= 70) status = 'ACTIVE'
        else if (finalScore >= 40) status = 'WAIT'

        // 4. Flags (§5)
        if (ma20 > ma60 && ma60 > ma120) flags.push('UPTREND_CONFIRMED')
        if (ma20 < ma60) flags.push('BROKEN_TREND')
        if (Math.abs(currentPrice - ma20) / ma20 < 0.01) flags.push('TREND_WEAK')
        if (rsi > 70) flags.push('OVERBOUGHT')
        if (rsi < 30) flags.push('OVERSOLD')
        if (volRatio > 5) flags.push('HIGH_VOLATILITY')

        // 5. Strategy (§9)
        let strategy: StrategyType = 'NO_TRADE'
        if (status === 'AVOID' || flags.includes('BROKEN_TREND')) {
            strategy = 'NO_TRADE'
        } else if (flags.includes('UPTREND_CONFIRMED') && rsi < 65) {
            strategy = 'PULLBACK_TREND'
        } else if (flags.includes('HIGH_VOLATILITY') && currentPrice >= recentHigh) {
            strategy = 'BREAKOUT'
        } else if (flags.includes('OVERSOLD') && flags.includes('TREND_WEAK')) {
            strategy = 'MEAN_REVERSION'
        }

        // 6. Stop/Target Rules & Reason (§8, §10)
        let finalReason = ""
        if (stopVal >= entryVal) {
            status = 'WAIT'
            finalReason = "손절가가 진입가보다 높거나 같습니다. (변동성 과다)"
        }
        if (targetVal <= entryVal) {
            status = 'WAIT'
            finalReason = "목표가가 진입가보다 낮거나 같습니다. (익절 공간 부족)"
        }

        if (status === 'AVOID') {
            finalReason = finalReason || `점수가 너무 낮습니다 (${finalScore}점). 하락 추세 또는 리스크가 큽니다.`
        } else if (status === 'WAIT') {
            finalReason = finalReason || `현재 관망 구간입니다 (${finalScore}점). 추세 확인이 필요합니다.`
        } else {
            finalReason = `추세 정배열 및 모멘텀 양호 (${finalScore}점). ${strategy} 전략 유효.`
        }

        // Nullify if not ACTIVE (§6.2)
        let finalEntry: number | null = entryVal
        let finalStop: number | null = stopVal
        let finalTarget: number | null = targetVal

        if (status !== 'ACTIVE') {
            finalEntry = null
            finalStop = null
            finalTarget = null
        }

        return {
            status,
            score: finalScore,
            strategy,
            confidenceFlags: flags,
            reason: finalReason.trim(),
            entry: finalEntry ? roundToMarketUnit(finalEntry) : null,
            stop: finalStop ? roundToMarketUnit(finalStop) : null,
            target: finalTarget ? roundToMarketUnit(finalTarget) : null
        }
    }

    return {
        short: solve('short'),
        mid: solve('mid'),
        long: solve('long')
    }
}

export function analyzeTechnical(marketData: MarketData): TechnicalAnalysisResult {
    const closes = marketData.historical?.map(h => h.close) || []

    // Default fallback
    const result: TechnicalAnalysisResult = {
        rsi: { value: 0, status: 'UNKNOWN' },
        macd: { macd: 0, signal: 0, histogram: 0, status: 'NEUTRAL' },
        trend: { emaShort: 0, emaLong: 0, status: 'NEUTRAL' }
    }

    if (closes.length < 50) return result // Not enough data for full analysis

    // 1. RSI (14 period)
    const rsiValues = RSI.calculate({
        values: closes,
        period: 14
    })
    const currentRsi = rsiValues[rsiValues.length - 1] || 0
    let rsiStatus: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' = 'NEUTRAL'
    if (currentRsi >= 70) rsiStatus = 'OVERBOUGHT'
    else if (currentRsi <= 30) rsiStatus = 'OVERSOLD'

    result.rsi = { value: currentRsi, status: rsiStatus }

    // 2. MACD (12, 26, 9)
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    })
    const currentMacd = macdValues[macdValues.length - 1]
    let macdStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (currentMacd && currentMacd.histogram !== undefined) {
        if (currentMacd.histogram > 0) macdStatus = 'BULLISH'
        else if (currentMacd.histogram < 0) macdStatus = 'BEARISH'

        result.macd = {
            macd: currentMacd.MACD || 0,
            signal: currentMacd.signal || 0,
            histogram: currentMacd.histogram || 0,
            status: macdStatus
        }
    }

    // 3. Trend (EMA 20 vs 60)
    const ema20 = EMA.calculate({ period: 20, values: closes })
    const ema60 = EMA.calculate({ period: 60, values: closes })

    const currEma20 = ema20[ema20.length - 1]
    const currEma60 = ema60[ema60.length - 1]
    const prevEma20 = ema20[ema20.length - 2]
    const prevEma60 = ema60[ema60.length - 2]

    let trendStatus: 'GOLDEN_CROSS' | 'DEAD_CROSS' | 'UP_TREND' | 'DOWN_TREND' | 'NEUTRAL' = 'NEUTRAL'

    if (currEma20 && currEma60 && prevEma20 && prevEma60) {
        if (currEma20 > currEma60) {
            trendStatus = 'UP_TREND'
            if (prevEma20 <= prevEma60) trendStatus = 'GOLDEN_CROSS'
        } else {
            trendStatus = 'DOWN_TREND'
            if (prevEma20 >= prevEma60) trendStatus = 'DEAD_CROSS'
        }
    }

    result.trend = {
        emaShort: currEma20 || 0,
        emaLong: currEma60 || 0,
        status: trendStatus
    }

    // 4. SMA (5 vs 20)
    const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
    result.movingAverages = { ma5, ma20 }

    return result
}
