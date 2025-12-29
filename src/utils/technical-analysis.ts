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
    target2?: number | null
    rr: number | null
    avoidCode?: 'TREND_BREAK' | 'LOW_RR' | 'HIGH_RISK' | 'NO_SUPPORT' | 'OVERBOUGHT' | null
    strength?: number | null
}

export interface TradingObjectiveV3Result {
    short: ObjectiveV3 | null
    mid: ObjectiveV3 | null
    long: ObjectiveV3 | null
    isAbnormal?: boolean
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

function roundToMarketUnit(price: number): number {
    if (price < 10000) return Math.round(price / 10) * 10
    if (price < 100000) return Math.round(price / 100) * 100
    return Math.round(price / 1000) * 1000
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function getEnhancedSupportLevels(candles: HistoricalBar[], window: number = 5): Array<{ price: number, strength: number, isMA: boolean }> {
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    const supports: Array<{ price: number, strength: number, isMA: boolean }> = [];

    for (let i = window; i < lows.length - window; i++) {
        const currentLow = lows[i];
        const leftSide = lows.slice(i - window, i);
        const rightSide = lows.slice(i + 1, i + 1 + window);

        if (currentLow <= Math.min(...leftSide) && currentLow <= Math.min(...rightSide)) {
            let strength = 20;

            const swingVolAvg = (volumes[i] + volumes[i + 1]) / 2;
            if (swingVolAvg > avgVol20 * 1.2) {
                strength += 15;
            }

            const next5Bars = candles.slice(i + 1, i + 6);
            if (next5Bars.length > 0) {
                const maxNextHigh = Math.max(...next5Bars.map(c => c.high));
                const reboundPct = (maxNextHigh - currentLow) / currentLow * 100;
                strength += Math.min(reboundPct * 2, 20);
            }

            for (let j = 0; j < i; j++) {
                if (Math.abs(lows[j] - currentLow) / currentLow <= 0.01) {
                    strength += 10;
                }
            }

            supports.push({ price: currentLow, strength, isMA: false });
        }
    }

    return supports;
}

export function calculateObjectives(currentPrice: number, candles: HistoricalBar[] | undefined): TradingObjectiveV3Result | null {
    if (!candles || candles.length < 120) {
        return null
    }

    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const closes = candles.map(c => c.close)

    const ma20Arr = SMA.calculate({ values: closes, period: 20 })
    const ma60Arr = SMA.calculate({ values: closes, period: 60 })
    const ma120Arr = SMA.calculate({ values: closes, period: 120 })
    const atr14Arr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
    const rsi14Arr = RSI.calculate({ values: closes, period: 14 })

    const ma20 = ma20Arr[ma20Arr.length - 1]
    const ma60 = ma60Arr[ma60Arr.length - 1]
    const ma120 = ma120Arr[ma120Arr.length - 1]
    const atr = atr14Arr[atr14Arr.length - 1]
    const rsi = rsi14Arr[rsi14Arr.length - 1]

    if (ma20 === undefined || ma60 === undefined || ma120 === undefined || atr === undefined || rsi === undefined) {
        return null
    }

    let trendScore = 0
    if (ma20 > ma60 && ma60 > ma120) trendScore = 30
    else if (ma20 > ma60) trendScore = 20
    else trendScore = -30

    let momentumScore = 0
    if (rsi >= 50 && rsi <= 65) momentumScore = 15
    else if (rsi > 70) momentumScore = -10
    else if (rsi < 35) momentumScore = -5

    const volRatio = (atr / currentPrice) * 100
    const volatilityAdj = volRatio < 3 ? 5 : (volRatio > 8 ? -15 : 0)
    const baseScore = 50 + trendScore + momentumScore + volatilityAdj

    const recentHigh = Math.max(...candles.slice(-60).map(c => c.high));
    const rawSupports = getEnhancedSupportLevels(candles, 5);
    rawSupports.push({ price: ma20, strength: 10, isMA: true });
    rawSupports.push({ price: ma60, strength: 10, isMA: true });
    rawSupports.push({ price: ma120, strength: 10, isMA: true });

    const sortedSupports = rawSupports.sort((a, b) => b.price - a.price);
    const clusteredSupports: Array<{ price: number, strength: number }> = [];
    for (const sup of sortedSupports) {
        const existing = clusteredSupports.find(c => Math.abs(c.price - sup.price) / sup.price <= 0.02);
        if (existing) {
            if (sup.strength > existing.strength) {
                existing.price = sup.price;
                existing.strength = sup.strength;
            }
        } else {
            clusteredSupports.push({ price: sup.price, strength: sup.strength });
        }
    }

    const solve = (timeframe: 'short' | 'mid' | 'long'): ObjectiveV3 => {
        const flags: ConfidenceFlag[] = []
        const config = {
            short: { multiplier: 1.5, minRR: 2.0, maxRisk: 0.05, p2: 20, p5: 30 },
            mid: { multiplier: 2.0, minRR: 2.5, maxRisk: 0.10, p2: 15, p5: 25 },
            long: { multiplier: 3.0, minRR: 3.0, maxRisk: 0.15, p2: 10, p5: 20 }
        }
        const cfg = config[timeframe]

        const validCandidates = clusteredSupports
            .filter(s => s.price <= currentPrice * 1.01)
            .sort((a, b) => b.strength - a.strength);

        let best: { entry: number, stop: number, target: number, rr: number, strength: number } | null = null;
        for (const sup of validCandidates) {
            const entry = sup.price;
            const epsilon = 0.2 * atr;
            const structLow = rawSupports.filter(s => !s.isMA && s.price < entry).sort((a, b) => b.strength - a.strength)[0]?.price;

            let stop = entry - (atr * cfg.multiplier);
            if (structLow && structLow > stop - epsilon) stop = structLow - epsilon;

            const risk = entry - stop;
            if (risk <= 0) continue;

            const pTarget = entry + (risk * cfg.minRR);
            let target = Math.min(pTarget, recentHigh > entry ? recentHigh : pTarget);
            if (recentHigh > entry && (recentHigh - entry) < risk * 1.5) target = recentHigh;

            const rr = (target - entry) / risk;
            if (rr >= cfg.minRR && (risk / entry) <= cfg.maxRisk) {
                best = { entry, stop, target, rr, strength: sup.strength };
                break;
            }
        }

        let status: 'ACTIVE' | 'WAIT' | 'AVOID' = 'AVOID';
        let avoidCode: ObjectiveV3['avoidCode'] = null;
        let finalScore = baseScore;

        if (best) {
            const gapPct = (currentPrice - best.entry) / best.entry * 100;
            let penalty = 0;
            if (gapPct > 5) penalty = cfg.p5;
            else if (gapPct > 2) penalty = ((gapPct - 2) / 3) * cfg.p2;
            finalScore = Math.max(0, finalScore - penalty);

            const last = candles[candles.length - 1];
            const cRange = last.high - last.low;
            const isBounce = (last.close >= last.low + cRange * 0.6) &&
                (Math.min(last.open, last.close) - last.low >= 1.5 * Math.abs(last.close - last.open)) &&
                (last.low <= best.entry * 1.01);

            if (gapPct <= 2 && finalScore >= 70 && isBounce) status = 'ACTIVE';
            else status = 'WAIT';
        } else {
            avoidCode = 'NO_SUPPORT';
            if (rsi > 70) avoidCode = 'OVERBOUGHT';
            if (ma20 < ma60) avoidCode = 'TREND_BREAK';
        }

        if (ma20 > ma60 && ma60 > ma120) flags.push('UPTREND_CONFIRMED');
        else if (ma20 < ma60) flags.push('BROKEN_TREND');
        if (rsi > 70) flags.push('OVERBOUGHT');
        if (rsi < 30) flags.push('OVERSOLD');

        return {
            status,
            score: clamp(Math.round(finalScore), 0, 100),
            strategy: status !== 'AVOID' ? (flags.includes('UPTREND_CONFIRMED') ? 'PULLBACK_TREND' : 'MEAN_REVERSION') : 'NO_TRADE',
            confidenceFlags: flags,
            reason: status === 'ACTIVE' ? `강력한 지지 구간 반등 확인 (손익비: ${best?.rr.toFixed(1)}).` : (status === 'WAIT' ? `매수 대기: 주요 지지선 근처.` : "손익비 불충분 또는 구조적 지지선 부재."),
            avoidCode,
            entry: best ? roundToMarketUnit(best.entry) : null,
            stop: best ? roundToMarketUnit(best.stop) : null,
            target: best ? roundToMarketUnit(best.target) : null,
            target2: best ? roundToMarketUnit(best.entry + (best.target - best.entry) * 1.5) : null,
            rr: best ? best.rr : null,
            strength: best ? best.strength : null
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
    const result: TechnicalAnalysisResult = {
        rsi: { value: 0, status: 'UNKNOWN' },
        macd: { macd: 0, signal: 0, histogram: 0, status: 'NEUTRAL' },
        trend: { emaShort: 0, emaLong: 0, status: 'NEUTRAL' }
    }
    if (closes.length < 50) return result

    const rsiValues = RSI.calculate({ values: closes, period: 14 })
    const currentRsi = rsiValues[rsiValues.length - 1] || 0
    result.rsi = { value: currentRsi, status: currentRsi >= 70 ? 'OVERBOUGHT' : (currentRsi <= 30 ? 'OVERSOLD' : 'NEUTRAL') }

    const macdValues = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false })
    const currentMacd = macdValues[macdValues.length - 1]
    if (currentMacd) {
        result.macd = {
            macd: currentMacd.MACD || 0,
            signal: currentMacd.signal || 0,
            histogram: currentMacd.histogram || 0,
            status: (currentMacd.histogram || 0) > 0 ? 'BULLISH' : 'BEARISH'
        }
    }

    const ema20 = EMA.calculate({ period: 20, values: closes })
    const ema60 = EMA.calculate({ period: 60, values: closes })
    const currEma20 = ema20[ema20.length - 1]
    const currEma60 = ema60[ema60.length - 1]
    result.trend = {
        emaShort: currEma20 || 0,
        emaLong: currEma60 || 0,
        status: currEma20 > currEma60 ? 'UP_TREND' : 'DOWN_TREND'
    }

    result.movingAverages = {
        ma5: closes.slice(-5).reduce((a, b) => a + b, 0) / 5,
        ma20: closes.slice(-20).reduce((a, b) => a + b, 0) / 20
    }

    result.objectives = calculateObjectives(closes[closes.length - 1], marketData.historical)
    return result
}
