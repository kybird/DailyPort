
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
        short: { entry: number; stop: number; target: number }
        mid: { entry: number; stop: number; target: number }
        long: { entry: number; stop: number; target: number }
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
    if (!candles || candles.length < 60) {
        console.warn(`[calculateObjectives] Insufficient data: ${candles?.length || 0} bars. MA60 requires at least 60.`)
        return null
    }

    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const closes = candles.map(c => c.close)

    // 1. Indicators
    const atr14Arr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
    const ma5Arr = SMA.calculate({ values: closes, period: 5 })
    const ma10Arr = SMA.calculate({ values: closes, period: 10 })
    const ma20Arr = SMA.calculate({ values: closes, period: 20 })
    const ma60Arr = SMA.calculate({ values: closes, period: 60 })

    const atr = atr14Arr[atr14Arr.length - 1] || currentPrice * 0.03
    const ma5 = ma5Arr[ma5Arr.length - 1]
    const ma10 = ma10Arr[ma10Arr.length - 1]
    const ma20 = ma20Arr[ma20Arr.length - 1]
    const ma60 = ma60Arr[ma60Arr.length - 1]

    // 2. Resistance Proxies (Recent Highs)
    const high20 = Math.max(...highs.slice(-20))
    const high60 = Math.max(...highs.slice(-60))
    const high120 = Math.max(...highs.slice(-Math.min(120, candles.length)))

    // 3. Support Proxies (Recent Lows)
    const low20 = Math.min(...lows.slice(-20))
    const low60 = Math.min(...lows.slice(-60))
    const low120 = Math.min(...lows.slice(-Math.min(120, candles.length)))

    let isAbnormal = false

    const solve = (timeframe: 'short' | 'mid' | 'long') => {
        let entry = currentPrice
        let stopMultiplier = 2.0
        let rr = 2.5
        let minLow = low20
        let resistance = high20

        switch (timeframe) {
            case 'short':
                // Pullback entry preference: current price or MA5/10 whichever is lower (seeking discount)
                // but if current is already way below, we use current.
                entry = Math.min(currentPrice, ma5 || currentPrice, ma10 || currentPrice)
                stopMultiplier = 1.5
                rr = 2.0
                minLow = low20
                resistance = high20
                break
            case 'mid':
                entry = Math.min(currentPrice, ma20 || currentPrice)
                stopMultiplier = 2.0
                rr = 2.5
                minLow = low60
                resistance = high60
                break
            case 'long':
                entry = Math.min(currentPrice, ma60 || currentPrice)
                stopMultiplier = 3.0
                rr = 3.0
                minLow = low120
                resistance = high120
                break
        }

        // Logic check: if entry from MA is TOO FAR from current price, cap it? 
        // For now, follow the plan: min(Current, MA)

        let stop = entry - (atr * stopMultiplier)

        // Safety: Protect against too deep stop using recent low
        stop = Math.max(stop, minLow)

        // Safety: Ensure stop < entry. 
        if (stop >= entry) {
            // [Abnormal Case] Logic error or extreme volatility. Fallback to 5% percentage.
            console.warn(`[calculateObjectives] Abnormal Case: stop(${stop}) >= entry(${entry}) for ${timeframe}. Falling back to 5% SL.`)
            stop = entry * 0.95
            isAbnormal = true
        }

        const risk = entry - stop
        let target = entry + (risk * rr)

        // Resistance Constraint: target should not blindly over-shoot recent major resistance
        target = Math.min(target, resistance * 1.1) // Allow 10% breakout above resistance? 
        // Or strictly: target = Math.min(target, resistance)
        // Let's go with a bit of room for breakout but primarily anchoring to resistance.
        target = Math.min(target, resistance > entry ? resistance : target)

        // Final target safety: must be above entry
        if (target <= entry) {
            target = entry * (1 + (0.05 * rr))
        }

        return {
            entry: roundToMarketUnit(entry),
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

    console.info(`[calculateObjectives] Calculated V2 Objectives for price ${currentPrice}:`, objectives)

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
