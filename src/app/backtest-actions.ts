
'use server'

import { createClient } from '@/utils/supabase/server'
import { AlgoFilterResult } from './actions-analysis'

export interface BacktestResult {
    strategy: string;
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    profitFactor: number;
    equityCurve: { date: string; value: number }[];
    trades: {
        ticker: string;
        date: string;
        entryPrice: number;
        currentPrice: number;
        returnPercent: number;
        status: 'WIN' | 'LOSS' | 'HOLD' | 'BREAKEVEN';
        daysHeld: number;
        note?: string;
    }[];
}

export async function getBacktestStats(strategy: string, initialCapital: number = 10000000): Promise<BacktestResult> {
    console.log(`[Backtest] Starting calculation for ${strategy}`)
    const supabase = await createClient()

    // 1. Fetch historical filter results (up to 90 days)
    const { data: filterResults, error } = await supabase
        .from('algo_picks')
        .select('*')
        .eq('strategy_name', strategy)
        .order('date', { ascending: false })
        .limit(60) // Assess last 2 months of signals

    if (error || !filterResults || filterResults.length === 0) {
        return {
            strategy,
            totalTrades: 0,
            winRate: 0,
            avgReturn: 0,
            profitFactor: 0,
            equityCurve: [],
            trades: []
        }
    }

    // 2. Extract unique tickers and date range
    const tickers = new Set<string>()
    filterResults.forEach(p => {
        if (Array.isArray(p.tickers)) {
            p.tickers.forEach((t: string) => tickers.add(t))
        }
    })

    // Sort filter results oldest to newest for simulation
    const sortedResults = [...filterResults].reverse()
    const startDate = sortedResults[0].date

    if (tickers.size === 0) {
        return {
            strategy,
            totalTrades: 0,
            winRate: 0,
            avgReturn: 0,
            profitFactor: 0,
            equityCurve: [],
            trades: []
        }
    }

    // 3. Fetch Price History for these tickers
    // Optimization: We could fetch EVERYTHING, but 60 days * 50 tickers = 3000 rows. Fast enough.
    const { data: prices, error: priceError } = await supabase
        .from('daily_price')
        .select('code, date, close')
        .in('code', Array.from(tickers))
        .gte('date', startDate)
        .order('date', { ascending: true })

    if (priceError || !prices) {
        console.error("Backtest Price Fetch Error:", priceError)
        // Return empty result instead of throwing, so UI doesn't crash completely
        return {
            strategy,
            totalTrades: 0,
            winRate: 0,
            avgReturn: 0,
            profitFactor: 0,
            equityCurve: [],
            trades: []
        }
    }

    // Index prices: priceMap[ticker][date ISO] = close
    // NORMALIZATION: Convert YYYYMMDD to YYYY-MM-DD to match algo_picks
    const priceMap: Record<string, Record<string, number>> = {}
    prices.forEach(row => {
        if (!priceMap[row.code]) priceMap[row.code] = {}

        let d = row.date
        if (d.length === 8 && !d.includes('-')) {
            // YYYYMMDD -> YYYY-MM-DD
            d = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
        }
        priceMap[row.code][d] = row.close
    })

    // Helper to find closest available price on or after date
    const getPrice = (ticker: string, date: string): number | null => {
        if (!priceMap[ticker]) return null
        if (priceMap[ticker][date]) return priceMap[ticker][date]

        // Find next available date
        const dates = Object.keys(priceMap[ticker]).sort()
        const nextDate = dates.find(d => d >= date)
        if (nextDate) return priceMap[ticker][nextDate]
        return null
    }

    const getLatestPrice = (ticker: string): { price: number; date: string } | null => {
        if (!priceMap[ticker]) return null
        const dates = Object.keys(priceMap[ticker]).sort()
        const lastDate = dates[dates.length - 1]
        return { price: priceMap[ticker][lastDate], date: lastDate }
    }

    // 4. Run Simulation
    let equity = initialCapital
    const equityCurve = [{ date: startDate, value: equity }]
    const trades: any[] = []

    // Configurable Parameters for now (can be passed in future)
    const TAKE_PROFIT_PCT = 0.15 // +15%
    const STOP_LOSS_PCT = -0.10  // -10%
    const SIGNAL_COOLDOWN_DAYS = 5 // Ignore new signals if we entered recently

    // Active Positions Map: ticker -> { entryDate, entryPrice }
    const activePositions: Record<string, { entryDate: string, entryPrice: number }> = {}

    let winCount = 0
    let lossCount = 0
    let totalReturnPct = 0

    // Safe Date Calculation Helper
    const normalizeDate = (d: string) => {
        // Ensure YYYY-MM-DD format
        if (d && d.length === 8 && !d.includes('-')) {
            return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
        }
        return d
    }

    let grossWinSum = 0
    let grossLossSum = 0

    // Process each filter result (sorted oldest to newest)
    for (const p of sortedResults) {
        // Only take Top 3 results per day
        const dayTickers = (p.tickers as string[]).slice(0, 3)

        for (const t of dayTickers) {

            // 🛑 Cooldown / Duplication Check
            if (activePositions[t]) {
                const lastEntry = (activePositions as any)[t]
                // If the previous trade exited BEFORE this signal, we can re-enter.
                // But we need to know the EXIT DATE of the previous trade.
                // For simplicity, strict cooldown: if we traded it recently, avoid.
                const daysDiff = (new Date(p.date).getTime() - new Date(lastEntry.entryDate).getTime()) / (1000 * 3600 * 24)
                if (daysDiff < SIGNAL_COOLDOWN_DAYS) {
                    continue
                }
            }

            const entryPrice = getPrice(t, p.date)
            if (!entryPrice) continue

            // Scan Future Prices for Bracket Exit
            // Scan Future Prices for Bracket Exit
            const allDates = Object.keys(priceMap[t]).sort()
            const entryIndex = allDates.findIndex(d => d >= p.date)

            if (entryIndex === -1) continue

            // 🎯 Target Logic
            // Default: 1.15, 1.25 if not provided (fallback)
            const targets = (p.details?.candidates?.[t]?.targets) || [entryPrice * 1.15, entryPrice * 1.25]
            const target1 = targets[0]
            const target2 = targets[1] || target1 * 1.10

            // State
            let remainingShare = 1.0
            let realizedLog: { date: string, price: number, portion: number, type: 'TP1' | 'TP2' | 'SL' | 'SL_BREAKEVEN' | 'HOLD' }[] = []

            // Dynamic Stop Loss
            let currentSL = entryPrice * (1 + STOP_LOSS_PCT)
            let isBreakevenActive = false

            // Forward Scan
            for (let i = entryIndex + 1; i < allDates.length; i++) {
                if (remainingShare <= 0) break

                const d = allDates[i]
                const priceOfDay = priceMap[t][d]

                // 1. Check Stop Loss
                if (priceOfDay <= currentSL) {
                    realizedLog.push({ date: d, price: priceOfDay, portion: remainingShare, type: isBreakevenActive ? 'SL_BREAKEVEN' : 'SL' })
                    remainingShare = 0
                    break
                }

                // 2. Check Target 2 (Final)
                if (priceOfDay >= target2) {
                    realizedLog.push({ date: d, price: priceOfDay, portion: remainingShare, type: 'TP2' })
                    remainingShare = 0
                    break
                }

                // 3. Check Target 1 (Partial)
                // Only if we haven't hit T1 yet (meaning remainingShare is still 1.0)
                if (remainingShare === 1.0 && priceOfDay >= target1) {
                    realizedLog.push({ date: d, price: priceOfDay, portion: 0.5, type: 'TP1' })
                    remainingShare = 0.5

                    // Move SL to Breakeven (Entry Price)
                    currentSL = entryPrice
                    isBreakevenActive = true
                }
            }

            // End of Data Hold
            if (remainingShare > 0) {
                const latest = getLatestPrice(t)
                if (latest) {
                    realizedLog.push({ date: latest.date, price: latest.price, portion: remainingShare, type: 'HOLD' })
                }
            }

            // Calculation
            let totalWeightedReturn = 0
            let lastExitDate = p.date

            // We determine main status by the *worst* outcome or *final* outcome?
            // "WIN" if we took any profit? Or if total return > 0?
            // Let's rely on total return.

            const exitTypes = realizedLog.map(l => l.type)
            // const mainStatus = exitTypes.includes('TP2') ? 'WIN' : 
            //                    (exitTypes.includes('sl') ? 'LOSS' : // strict loss
            //                    (exitTypes.includes('SL_BREAKEVEN') ? 'HOLD' : // Breakeven is roughly neutral, let's call it HOLD or create new status?
            //                    (exitTypes.includes('TP1') ? 'WIN' : // At least partial win
            //                    (totalWeightedReturn > 0 ? 'WIN' : 
            //                    (totalWeightedReturn < 0 ? 'LOSS' : 'HOLD')))))

            // Re-calculate weighted return
            if (realizedLog.length > 0) {
                lastExitDate = realizedLog[realizedLog.length - 1].date
                for (const log of realizedLog) {
                    const r = (log.price - entryPrice) / entryPrice
                    totalWeightedReturn += r * log.portion
                }
            } else {
                continue // Should not happen
            }

            // Register Trade
            const returnPercentage = totalWeightedReturn * 100

            if (totalWeightedReturn > 0) grossWinSum += returnPercentage
            else if (totalWeightedReturn < 0) grossLossSum += Math.abs(returnPercentage)

            // Status clarification
            let exitStatus: 'WIN' | 'LOSS' | 'HOLD' | 'BREAKEVEN' = 'HOLD'
            if (returnPercentage > 0.01) exitStatus = 'WIN'
            else if (returnPercentage < -0.01) exitStatus = 'LOSS'
            else exitStatus = 'BREAKEVEN' // effectively 0 or very small drift

            if (exitStatus === 'WIN') winCount++
            else if (exitStatus === 'LOSS') lossCount++

            // Safe Date Calculation
            const d1 = new Date(normalizeDate(lastExitDate)).getTime()
            const d2 = new Date(normalizeDate(p.date)).getTime()
            const daysHeld = !isNaN(d1) && !isNaN(d2) ? Math.floor((d1 - d2) / (1000 * 3600 * 24)) : 0

            trades.push({
                ticker: t,
                date: normalizeDate(p.date),
                entryPrice,
                currentPrice: realizedLog[realizedLog.length - 1].price, // Final exit price or current
                returnPercent: returnPercentage,
                status: exitStatus, // Updated Type
                daysHeld,
                // Optional: add detail string like "TP1 Hit -> BE"
                note: exitTypes.join(' -> ')
            })
            totalReturnPct += returnPercentage;

            // Mark ticker as recently traded to enforce cooldown
            (activePositions as any)[t] = { entryDate: p.date, entryPrice: entryPrice }
        }
    }

    // Simple Equity Curve Approximation (Daily average return of the strategy)
    // This is hard to do perfectly without a proper portfolio loop.
    // We'll just return the trades list and let Frontend calculate a detailed curve or just show stats.

    return {
        strategy,
        totalTrades: trades.length,
        winRate: trades.length > 0 ? (winCount / trades.length) * 100 : 0,
        avgReturn: trades.length > 0 ? totalReturnPct / trades.length : 0,
        profitFactor: grossLossSum > 0 ? (grossWinSum / grossLossSum) : (grossWinSum > 0 ? 100 : 0), // Gross Profit / Gross Loss
        equityCurve,
        trades: trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
    }
}
