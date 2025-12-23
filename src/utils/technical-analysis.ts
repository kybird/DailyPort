
import { RSI, MACD, EMA } from 'technicalindicators'
import { MarketData } from './market-data'

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
    objectives?: {
        short: { entry: number; stop: number; target: number }
        mid: { entry: number; stop: number; target: number }
        long: { entry: number; stop: number; target: number }
    }
}

export function calculateObjectives(currentPrice: number) {
    return {
        short: {
            entry: currentPrice,
            stop: Math.floor(currentPrice * 0.97),
            target: Math.floor(currentPrice * 1.05)
        },
        mid: {
            entry: currentPrice,
            stop: Math.floor(currentPrice * 0.93),
            target: Math.floor(currentPrice * 1.15)
        },
        long: {
            entry: currentPrice,
            stop: Math.floor(currentPrice * 0.85),
            target: Math.floor(currentPrice * 1.30)
        }
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

    if (closes.length < 50) return result // Not enough data

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

    if (currEma20 > currEma60) {
        trendStatus = 'UP_TREND'
        if (prevEma20 <= prevEma60) trendStatus = 'GOLDEN_CROSS'
    } else {
        trendStatus = 'DOWN_TREND'
        if (prevEma20 >= prevEma60) trendStatus = 'DEAD_CROSS'
    }

    result.trend = {
        emaShort: currEma20,
        emaLong: currEma60,
        status: trendStatus
    }

    return result
}
