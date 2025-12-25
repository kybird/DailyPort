
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

/**
 * Finds local minimums (Swing Lows) within a given window
 */
function findSwingLows(lows: number[], window: number = 5): number[] {
    const swingLows: number[] = []
    for (let i = window; i < lows.length - window; i++) {
        const currentLow = lows[i]
        const leftSide = lows.slice(i - window, i)
        const rightSide = lows.slice(i + 1, i + 1 + window)
        if (currentLow <= Math.min(...leftSide) && currentLow <= Math.min(...rightSide)) {
            swingLows.push(currentLow)
        }
    }
    return swingLows
}

export function calculateObjectives(currentPrice: number, candles: HistoricalBar[] | undefined): TradingObjectiveV3Result | null {
    if (!candles || candles.length < 120) {
        console.warn(`[calculateObjectives] Insufficient data: ${candles?.length || 0} bars. V3 requires at least 120.`)
        return null
    }

    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const closes = candles.map(c => c.close)

    // Indicators
    const ma5Arr = SMA.calculate({ values: closes, period: 5 })
    const ma10Arr = SMA.calculate({ values: closes, period: 10 })
    const ma20Arr = SMA.calculate({ values: closes, period: 20 })
    const ma60Arr = SMA.calculate({ values: closes, period: 60 })
    const ma120Arr = SMA.calculate({ values: closes, period: 120 })
    const atr14Arr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
    const rsi14Arr = RSI.calculate({ values: closes, period: 14 })

    const ma5 = ma5Arr[ma5Arr.length - 1]
    const ma10 = ma10Arr[ma10Arr.length - 1]
    const ma20 = ma20Arr[ma20Arr.length - 1]
    const ma60 = ma60Arr[ma60Arr.length - 1]
    const ma120 = ma120Arr[ma120Arr.length - 1]
    const atr = atr14Arr[atr14Arr.length - 1]
    const rsi = rsi14Arr[rsi14Arr.length - 1]

    if (ma5 === undefined || ma20 === undefined || ma60 === undefined || ma120 === undefined || atr === undefined || rsi === undefined) {
        return null
    }

    const recentHigh = Math.max(...highs.slice(-60)) // Increased window to 60 for better resistance detection
    const swingLows = findSwingLows(lows, 5)

    // Base Scoring (Trend & Momentum)
    let trendScore = 0
    if (ma20 > ma60 && ma60 > ma120) trendScore = 30
    else if (ma20 > ma60) trendScore = 20
    else trendScore = -30

    let momentumScore = 0
    if (rsi >= 50 && rsi <= 65) momentumScore = 15 // Favors healthy accumulation
    else if (rsi > 70) momentumScore = -10        // Overextended
    else if (rsi < 35) momentumScore = -5

    const volRatio = (atr / currentPrice) * 100
    const volatilityAdj = volRatio < 3 ? 5 : (volRatio > 8 ? -15 : 0)

    const baseScore = 50 + trendScore + momentumScore + volatilityAdj

    const solve = (timeframe: 'short' | 'mid' | 'long'): ObjectiveV3 => {
        const flags: ConfidenceFlag[] = []

        // 1. Define RR Tiers & Constraints
        const rrConfig = {
            short: { multiplier: 1.5, minRR: 2.0, maxRisk: 0.05, proximityPct: 0.02 },
            mid: { multiplier: 2.0, minRR: 2.5, maxRisk: 0.10, proximityPct: 0.04 },
            long: { multiplier: 3.0, minRR: 3.0, maxRisk: 0.15, proximityPct: 0.06 }
        }
        const cfg = rrConfig[timeframe]

        // 2. Collect Candidate Supports
        const rawCandidates = [ma5, ma10, ma20, ma60, ma120, ...swingLows.slice(-5)]
        const candidates = Array.from(new Set(rawCandidates))
            .filter(p => p <= currentPrice * 1.02) // Only look at supports below or very near
            .sort((a, b) => b - a)                 // Prioritize closest supports

        let bestCandidate: { entry: number, stop: number, target: number, rr: number } | null = null

        // 3. Evaluate Candidates
        for (const entry of candidates) {
            // Find strongest nearby swing low for stop
            const nearestSwingLow = swingLows.filter(sl => sl < entry).sort((a, b) => b - a)[0]
            let stop = entry - (atr * cfg.multiplier)
            if (nearestSwingLow && nearestSwingLow > stop * 0.95) {
                stop = nearestSwingLow // Use swing low if it's logically close
            }

            const risk = entry - stop
            if (risk <= 0) continue

            // Resistance-aware target
            const potentialTarget = entry + (risk * cfg.minRR)
            let actualTarget = Math.min(potentialTarget, recentHigh > entry ? recentHigh : potentialTarget)

            // If we are at the top, target is capped by Resistance
            if (recentHigh > entry && (recentHigh - entry) < risk * 1.5) {
                // Not enough room to resistance for a good RR
                actualTarget = recentHigh
            }

            const currentRR = (actualTarget - entry) / risk
            const riskPct = risk / entry

            if (currentRR >= cfg.minRR && riskPct <= cfg.maxRisk) {
                bestCandidate = { entry, stop, target: actualTarget, rr: currentRR }
                break // Found the first (highest) valid support
            }
        }

        // 4. Status & Strategy
        let status: 'ACTIVE' | 'WAIT' | 'AVOID' = 'AVOID'
        let strategy: StrategyType = 'NO_TRADE'
        let reason = ""

        if (bestCandidate) {
            const proximity = (currentPrice - bestCandidate.entry) / bestCandidate.entry

            if (proximity <= cfg.proximityPct) {
                status = baseScore >= 70 ? 'ACTIVE' : 'WAIT'
                reason = status === 'ACTIVE'
                    ? `주요 지지선 근처 진입 가능 (RR: ${bestCandidate.rr.toFixed(1)}).`
                    : `지지선 근처이나 추세 확인 필요 (${baseScore}점).`
            } else {
                status = 'WAIT'
                reason = `보수적 진입 대기 (목표 지지선: ₩${roundToMarketUnit(bestCandidate.entry).toLocaleString()}).`
            }
        } else {
            status = 'AVOID'
            reason = "손익비가 산출되는 적절한 진입 지지선이 없습니다 (저항 근접 또는 리스크 과다)."
        }

        // 5. Flags
        if (ma20 > ma60 && ma60 > ma120) flags.push('UPTREND_CONFIRMED')
        if (ma20 < ma60) flags.push('BROKEN_TREND')
        if ((currentPrice - ma20) / ma20 > 0.10) flags.push('HIGH_VOLATILITY') // Extension as proxy for volatility
        if (rsi > 70) flags.push('OVERBOUGHT')
        if (rsi < 30) flags.push('OVERSOLD')

        // Strategy mapping based on findings
        if (status !== 'AVOID') {
            if (flags.includes('UPTREND_CONFIRMED')) strategy = 'PULLBACK_TREND'
            else if (flags.includes('OVERSOLD')) strategy = 'MEAN_REVERSION'
        }

        return {
            status,
            score: clamp(baseScore, 0, 100),
            strategy,
            confidenceFlags: flags,
            reason,
            entry: status !== 'AVOID' && bestCandidate ? roundToMarketUnit(bestCandidate.entry) : null,
            stop: status !== 'AVOID' && bestCandidate ? roundToMarketUnit(bestCandidate.stop) : null,
            target: status !== 'AVOID' && bestCandidate ? roundToMarketUnit(bestCandidate.target) : null
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
