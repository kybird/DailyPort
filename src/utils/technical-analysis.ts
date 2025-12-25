
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
    | "UPTREND_CONFIRMED"
    | "TREND_WEAK"
    | "OVERBOUGHT"
    | "OVERSOLD"
    | "HIGH_VOLATILITY"
    | "LOW_VOLATILITY"
    | "BROKEN_TREND"

export interface ObjectiveResult {
    status: 'ACTIVE' | 'WAIT'
    confidenceFlags: ConfidenceFlag[]
    reason?: string
    entry: number | null
    stop: number | null
    target: number | null
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
    objectives?: {
        short: ObjectiveResult
        mid: ObjectiveResult
        long: ObjectiveResult
        isAbnormal?: boolean
    } | null
}

/**
 * Rounds price to Korean market units
 */
function roundToMarketUnit(price: number): number {
    if (price < 10000) return Math.round(price / 10) * 10
    if (price < 100000) return Math.round(price / 100) * 100
    return Math.round(price / 1000) * 1000
}

export function calculateObjectives(currentPrice: number, candles: HistoricalBar[] | undefined) {
    if (!candles || candles.length < 120) {
        console.warn(`[calculateObjectives] Insufficient data: ${candles?.length || 0} bars. V2.1 requires at least 120 for MA120.`)
        return null
    }

    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const closes = candles.map(c => c.close)

    // 1. Indicators
    const atr14Arr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
    const rsi14Arr = RSI.calculate({ values: closes, period: 14 })

    // SMA Calculations
    const ma5Arr = SMA.calculate({ values: closes, period: 5 })
    const ma10Arr = SMA.calculate({ values: closes, period: 10 })
    const ma20Arr = SMA.calculate({ values: closes, period: 20 })
    const ma60Arr = SMA.calculate({ values: closes, period: 60 })
    const ma120Arr = SMA.calculate({ values: closes, period: 120 })

    const atr = atr14Arr[atr14Arr.length - 1] || currentPrice * 0.03
    const rsi = rsi14Arr[rsi14Arr.length - 1] || 50

    const ma5 = ma5Arr[ma5Arr.length - 1]
    const ma10 = ma10Arr[ma10Arr.length - 1]
    const ma20 = ma20Arr[ma20Arr.length - 1]
    const ma60 = ma60Arr[ma60Arr.length - 1]
    const ma120 = ma120Arr[ma120Arr.length - 1]

    // 2. Trend Rules
    const isShortUptrend = ma5 > ma10 && ma10 > ma20
    const isMidUptrend = ma20 > ma60
    const isLongUptrend = ma20 > ma60 && ma60 > ma120

    const isRsiNeutral = rsi >= 40 && rsi <= 60

    // 3. Resistance & Support Proxies
    const high20 = Math.max(...highs.slice(-20))
    const high60 = Math.max(...highs.slice(-60))
    const high120 = Math.max(...highs.slice(-120))
    const low20 = Math.min(...lows.slice(-20))
    const low60 = Math.min(...lows.slice(-60))
    const low120 = Math.min(...lows.slice(-120))

    let isAbnormal = false

    const solve = (timeframe: 'short' | 'mid' | 'long'): ObjectiveResult => {
        const flags: ConfidenceFlag[] = []
        let status: 'ACTIVE' | 'WAIT' = 'ACTIVE'
        let reason: string | undefined = undefined

        // Common Flags
        if (rsi >= 70) flags.push("OVERBOUGHT")
        if (rsi <= 30) flags.push("OVERSOLD")

        const volatility = (atr / currentPrice) * 100
        if (volatility > 5) flags.push("HIGH_VOLATILITY")
        else if (volatility < 1.5) flags.push("LOW_VOLATILITY")

        let entryVal = currentPrice
        let stopMultiplier = 2.0
        let rr = 2.5
        let minLow = low20
        let resistance = high20

        switch (timeframe) {
            case 'short':
                if (isShortUptrend) flags.push("UPTREND_CONFIRMED")
                else {
                    flags.push("BROKEN_TREND")
                    if (isRsiNeutral) {
                        status = 'WAIT'
                        reason = "Short-term trend broken and momentum is neutral."
                    }
                }
                entryVal = Math.min(currentPrice, ma5 || currentPrice, ma10 || currentPrice)
                stopMultiplier = 1.5
                rr = 2.0
                minLow = low20
                resistance = high20
                break
            case 'mid':
                if (isMidUptrend) flags.push("UPTREND_CONFIRMED")
                else {
                    flags.push("BROKEN_TREND")
                    status = 'WAIT'
                    reason = "No clear mid-term uptrend (MA20 < MA60)."
                }

                // Secondary check for mid-term: neutral/unclear trend even if not technically "broken"
                if (status === 'ACTIVE') {
                    const priceToMa20 = Math.abs(currentPrice - ma20) / ma20
                    if (priceToMa20 < 0.01 && isRsiNeutral) {
                        status = 'WAIT'
                        reason = "Trend strength unclear and momentum is neutral."
                        flags.push("TREND_WEAK")
                    }
                }

                entryVal = Math.min(currentPrice, ma20 || currentPrice)
                stopMultiplier = 2.0
                rr = 2.5
                minLow = low60
                resistance = high60
                break
            case 'long':
                if (isLongUptrend) flags.push("UPTREND_CONFIRMED")
                else {
                    flags.push("BROKEN_TREND")
                    status = 'WAIT'
                    reason = "Broken long-term trend (MA20/60/120 alignment failure)."
                }
                entryVal = Math.min(currentPrice, ma60 || currentPrice)
                stopMultiplier = 3.0
                rr = 3.0
                minLow = low120
                resistance = high120
                break
        }

        if (status === 'WAIT') {
            return {
                status: 'WAIT',
                confidenceFlags: flags,
                reason,
                entry: null,
                stop: null,
                target: null
            }
        }

        let stop = entryVal - (atr * stopMultiplier)
        stop = Math.max(stop, minLow)

        if (stop >= entryVal) {
            console.warn(`[calculateObjectives] Abnormal Case: stop(${stop}) >= entry(${entryVal}) for ${timeframe}. Falling back to 5% SL.`)
            stop = entryVal * 0.95
            isAbnormal = true
        }

        const risk = entryVal - stop
        let target = entryVal + (risk * rr)
        target = Math.min(target, resistance > entryVal ? resistance : target)

        if (target <= entryVal) {
            target = entryVal * (1 + (0.05 * rr))
        }

        return {
            status: 'ACTIVE',
            confidenceFlags: flags,
            entry: roundToMarketUnit(entryVal),
            stop: roundToMarketUnit(stop),
            target: roundToMarketUnit(target)
        }
    }

    const objectives = {
        short: solve('short'),
        mid: solve('mid'),
        long: solve('long'),
        isAbnormal
    }

    console.info(`[calculateObjectives] Calculated V2.1 Objectives:`, objectives)

    return objectives
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
