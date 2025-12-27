
'use server'

import { getMarketData, MarketData } from '@/utils/market-data'
import { analyzeTechnical, TechnicalAnalysisResult, calculateObjectives } from '@/utils/technical-analysis'
import { createClient } from '@/utils/supabase/server'

export interface SupplyChartItem {
    date: string;
    foreigner: number;
    institution: number;
    pension?: number;
}

export interface AlgoPick {
    strategy_name: string;
    tickers: string[];
    date: string;
    details?: any;
}

export interface AnalysisReport {
    ticker: string
    name?: string
    price: {
        current: number
        changePercent: number
    }
    technical: TechnicalAnalysisResult
    supplyDemand?: {
        foreignNetBuy: number
        instNetBuy: number
        source: string
        updatedAt: string
        dataDate?: string
        chartData?: SupplyChartItem[] // Added for Supply Chart
        metrics?: {
            foreigner_5d_net: number
            institution_5d_net: number
            foreigner_20d_net: number
            institution_20d_net: number
            pension_5d_net?: number
            pension_20d_net?: number
        }
    }
    fundamentals?: {
        market_cap: number | null
        per: number | null
        pbr: number | null
        revenue?: number | null
        netIncome?: number | null
    }
    portfolio?: {
        quantity: number
        entryPrice: number
    }
    algoAnalysis?: {
        trend: string
        score: number
    }
    summary: string
    generatedAt: string
    historical?: {
        date: string
        open: number
        high: number
        low: number
        close: number
        volume: number
    }[]
}

export interface AlgoPick {
    strategy_name: string
    tickers: string[]
    date: string
    details?: {
        status?: string
        meta_version?: string
        candidates?: Record<string, {
            ticker: string
            rank?: number
            technical_status?: 'ACTIVE' | 'WAIT' | 'AVOID'
            metrics?: Record<string, number>
        }>
        items?: {
            ticker: string
            [key: string]: unknown // Items in Confluence might vary
        }[]
    }
}

export async function getAnalysis(ticker: string): Promise<AnalysisReport | { error: string }> {
    // 1. Fetch Market Data (Yahoo) for Real-time Price
    let marketData: MarketData | null = null
    try {
        marketData = await getMarketData(ticker)
    } catch (e) {
        console.warn(`[getAnalysis] Yahoo Finance fetch failed for ${ticker}:`, e)
    }

    // Normalize ticker for DB lookup (strip .KS, .KQ suffixes)
    const normalizedTicker = ticker.split('.')[0]

    // 2. Fetch "Daily Insight" from Supabase (Uploaded by Admin Tool)
    const supabase = await createClient()

    const { data: reportRow } = await supabase
        .from('daily_analysis_reports')
        .select('report_data, created_at')
        .eq('ticker', normalizedTicker)
        .order('date', { ascending: false })
        .limit(1)
        .single()

    // FALLBACK: If Yahoo failed but we have an Admin Report, use that data
    if (!marketData) {
        if (reportRow && reportRow.report_data && reportRow.report_data.supply_chart) {
            console.warn(`[getAnalysis] Yahoo failed for ${ticker}, falling back to Admin Report`)
            const chart = reportRow.report_data.supply_chart
            const latest = chart[chart.length - 1]
            const fundamentals = reportRow.report_data.fundamentals || {}

            // Helper to format YYYYMMDD to ISO
            const formatAdminDate = (d: string) => {
                if (d && d.length === 8) {
                    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
                }
                return d
            }

            marketData = {
                ticker: ticker,
                name: ticker,
                currentPrice: latest.close,
                marketCap: fundamentals.market_cap,
                per: fundamentals.per,
                pbr: fundamentals.pbr,
                changePercent: 0,
                // Construct synthetic historical from supply_chart (Close only)
                historical: chart.map((item: any) => ({
                    date: formatAdminDate(item.date),
                    open: item.close,
                    high: item.close,
                    low: item.close,
                    close: item.close,
                    volume: 0
                }))
            }
        } else {
            return { error: 'Failed to fetch market data and no admin report available.' }
        }
    }

    let technical: TechnicalAnalysisResult

    // If we have real historical data, analyze it. Otherwise, use empty/safe defaults.
    if (marketData.historical && marketData.historical.length > 0) {
        technical = analyzeTechnical(marketData)
    } else {
        // Synthetic Technical Result for Fallback Mode
        technical = {
            rsi: { value: 0, status: 'NEUTRAL' },
            macd: { macd: 0, signal: 0, histogram: 0, status: 'NEUTRAL' },
            trend: { emaShort: 0, emaLong: 0, status: 'NEUTRAL' },
            movingAverages: { ma5: 0, ma20: 0 },
            objectives: undefined
        }
    }

    // 3. Generate Summary & Merge Data
    const summaries: string[] = []

    // Price & Trend Summary
    const change = marketData.changePercent || 0
    // Only verify trend if we actually have technical analysis
    const isUpTrend = technical.trend.status === 'UP_TREND' || technical.trend.status === 'GOLDEN_CROSS'

    if (change > 2) summaries.push('주가 강세.')
    else if (change > 0) summaries.push('주가 소폭 상승.')
    else if (change > -1 && isUpTrend) summaries.push('상승 추세 내 단기 숨고르기.')
    else if (change > -3 && isUpTrend) summaries.push('상승 중 단기 조정 국면.')
    else if (change < -2) summaries.push('주가 하락세.')
    else summaries.push('주가 소폭 조정.')

    // Technical Context (Skip if no history)
    if (marketData.historical && marketData.historical.length > 0) {
        if (technical.rsi.status === 'OVERBOUGHT') summaries.push('RSI 과열 신호.')
        else if (technical.rsi.status === 'OVERSOLD') summaries.push('RSI 과매도 구간.')

        if (technical.trend.status === 'GOLDEN_CROSS') summaries.push('골든크로스 발생.')
        if (technical.trend.status === 'UP_TREND') summaries.push('이평선 정배열 유지.')
        if (technical.trend.status === 'DEAD_CROSS') summaries.push('데드크로스 경계 필요.')
        if (technical.trend.status === 'DOWN_TREND') summaries.push('이평선 역배열 진행.')
    }

    let supplyInfo = undefined
    let algoInfo = undefined
    let fundamentalInfo = undefined

    if (reportRow && reportRow.report_data) {
        const d = reportRow.report_data

        // Fundamentals from Admin Report
        if (d.fundamentals) {
            fundamentalInfo = d.fundamentals
        }

        // Merge Admin Tool Summary
        if (d.summary) summaries.push(`[AI 진단] ${d.summary}`)

        // Supply Data (Latest from Chart)
        if (d.supply_chart && d.supply_chart.length > 0) {
            const chartData = d.supply_chart;
            const latest = chartData[chartData.length - 1];

            // ALWAYS calculate metrics live from chartData to ensure they are visible and current
            const metrics = {
                foreigner_5d_net: chartData.slice(-5).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.foreigner || 0), 0),
                institution_5d_net: chartData.slice(-5).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.institution || 0), 0),
                foreigner_20d_net: chartData.slice(-20).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.foreigner || 0), 0),
                institution_20d_net: chartData.slice(-20).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.institution || 0), 0),
                pension_5d_net: chartData.slice(-5).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.pension || 0), 0),
                pension_20d_net: chartData.slice(-20).reduce((acc: number, curr: SupplyChartItem) => acc + (curr.pension || 0), 0),
            };

            supplyInfo = {
                foreignNetBuy: latest.foreigner || 0,
                instNetBuy: latest.institution || 0,
                source: 'DailyPort Admin',
                updatedAt: reportRow.created_at,
                dataDate: latest.date,
                chartData: chartData,
                metrics: metrics
            }

            // Enhanced Summary Insight from Metrics
            if (d.metrics) {
                if (d.metrics.foreigner_5d_net > 0 && d.metrics.institution_5d_net > 0) {
                    summaries.push('최근 5일간 외인/기관 동반 매집 중.')
                } else if (d.metrics.foreigner_20d_net > 0) {
                    summaries.push('한 달간 외국인 지속 매집 포착.')
                }
            }
        }

        algoInfo = {
            trend: d.trend || 'NEUTRAL',
            score: d.technical_score || 0
        }
    } else {
        summaries.push('상세 분석 리포트가 없습니다 (Admin Tool 미실행).')
    }

    // 5. Fetch Portfolio Data for User Context
    let portfolioInfo = undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: pItem } = await supabase
            .from('portfolios')
            .select('quantity, entry_price')
            .eq('user_id', user.id)
            .eq('ticker', normalizedTicker)
            .single()

        if (pItem && pItem.quantity > 0) {
            portfolioInfo = {
                quantity: pItem.quantity,
                entryPrice: pItem.entry_price
            }
        }
    }

    // 6. Calculate Objectives
    // If we have history, calculate live.
    if (marketData.historical && marketData.historical.length > 0) {
        const objectives = calculateObjectives(marketData.currentPrice, marketData.historical)
        technical.objectives = objectives
    }
    // If fallback (no history), we hope 'v3_objectives' from admin report takes precedence or we map it here.
    if (!technical.objectives && reportRow && reportRow.report_data && reportRow.report_data.v3_objectives) {
        // Map Admin V3 Objectives (snake_case) to TechnicalResult objectives (camelCase)
        const adminObj = reportRow.report_data.v3_objectives

        // Helper to map a single objective
        const mapObj = (src: any) => {
            if (!src) return null
            return {
                status: src.status,
                score: src.score,
                strategy: src.strategy_name || src.strategy, // Python uses 'strategy_name' sometimes
                confidenceFlags: src.confidence_flags || [], // Python uses 'confidence_flags'
                reason: src.reason,
                entry: src.entry,
                stop: src.stop,
                target: src.target,
                rr: src.rr
            }
        }

        technical.objectives = {
            short: mapObj(adminObj.short),
            mid: mapObj(adminObj.mid),
            long: mapObj(adminObj.long),
            isAbnormal: adminObj.is_abnormal || false
        }
    }

    return {
        ticker,
        name: marketData.name,
        price: {
            current: marketData.currentPrice,
            changePercent: marketData.changePercent || 0
        },
        technical,
        supplyDemand: supplyInfo,
        fundamentals: {
            market_cap: marketData.marketCap || (fundamentalInfo as any)?.market_cap || null,
            per: marketData.per || (fundamentalInfo as any)?.per || null,
            pbr: marketData.pbr || (fundamentalInfo as any)?.pbr || null,
            revenue: (fundamentalInfo as any)?.revenue,
            netIncome: (fundamentalInfo as any)?.net_income
        },
        algoAnalysis: algoInfo,
        portfolio: portfolioInfo,
        summary: summaries.join(' '),
        generatedAt: new Date().toISOString(),
        historical: marketData.historical?.map(h => ({
            date: h.date,
            open: h.open,
            high: h.high,
            low: h.low,
            close: h.close,
            volume: h.volume
        }))
    }
}

export async function getAlgoPicks(): Promise<AlgoPick[]> {
    const supabase = await createClient()

    // Fetch latest picks for each strategy
    const { data, error } = await supabase
        .from('algo_picks')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching algo picks:", error)
        return []
    }

    return (data || []).map(row => ({
        strategy_name: row.strategy_name,
        tickers: row.tickers, // Supabase JSONB comes as array
        date: row.date,
        details: row.details
    }))
}
