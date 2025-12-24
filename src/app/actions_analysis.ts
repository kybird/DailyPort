
'use server'

import { getMarketData } from '@/utils/market-data'
import { analyzeTechnical, TechnicalAnalysisResult, calculateObjectives } from '@/utils/technical-analysis'
import { createClient } from '@/utils/supabase/server'

export interface SupplyChartItem {
    date: string;
    foreigner: number;
    institution: number;
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
        }
    }
    fundamentals?: {
        market_cap: number | null
        per: number | null
        pbr: number | null
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
        close: number
        volume: number
    }[]
}

export interface AlgoPick {
    strategy_name: string
    tickers: string[] // Array of ticker codes
    date: string
}

export async function getAnalysis(ticker: string): Promise<AnalysisReport | { error: string }> {
    // 1. Fetch Market Data (Yahoo) for Real-time Price
    const marketData = await getMarketData(ticker)
    if (!marketData) return { error: 'Failed to fetch market data' }

    // TODO: If detailed analysis (Supply Data) is missing from Supabase,
    // trigger an on-demand Python analysis fetch and update the cache in real-time.

    const technical = analyzeTechnical(marketData)

    // Normalize ticker for DB lookup (strip .KS, .KQ suffixes)
    const normalizedTicker = ticker.split('.')[0]

    // 2. Fetch "Daily Insight" from Supabase (Uploaded by Admin Tool)
    const supabase = await createClient()

    // Try to find today's report, or latest within 3 days
    // Note: We use the new table 'daily_analysis_reports'
    const { data: reportRow } = await supabase
        .from('daily_analysis_reports')
        .select('report_data, created_at')
        .eq('ticker', normalizedTicker)
        .order('date', { ascending: false })
        .limit(1)
        .single()

    // Disable caching for this specific call to ensure fresh data after admin tool run
    // Using a hacky way since the standard fetch options aren't directly available in Supabase JS easily 
    // for Server Components without manual header manipulation or different client setup.
    // However, createClient() from @/utils/supabase/server handles fresh session.
    // Let's add a log to debug if data is null.
    if (!reportRow) {
        console.log(`[getAnalysis] Report NOT FOUND for ticker: ${ticker} on Supabase. Check if Admin tool processed it.`)
    }

    // 3. Generate Summary & Merge Data
    const summaries: string[] = []

    // Price Summary
    if ((marketData.changePercent || 0) > 0) summaries.push('주가 상승세.')
    else summaries.push('주가 하락세.')

    // Technical Summary
    if (technical.rsi.status === 'OVERBOUGHT') summaries.push('RSI 과매수.')
    if (technical.trend.status === 'GOLDEN_CROSS') summaries.push('골든크로스 발생.')
    if (technical.trend.status === 'UP_TREND') summaries.push('이평선 정배열.')

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
    const objectives = calculateObjectives(marketData.currentPrice)
    technical.objectives = objectives

    return {
        ticker,
        name: marketData.name,
        price: {
            current: marketData.currentPrice,
            changePercent: marketData.changePercent || 0
        },
        technical,
        supplyDemand: supplyInfo,
        fundamentals: fundamentalInfo, // Fixed field name
        algoAnalysis: algoInfo,
        portfolio: portfolioInfo,
        summary: summaries.join(' '),
        generatedAt: new Date().toISOString(),
        historical: marketData.historical?.map(h => ({
            date: h.date,
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
        date: row.date
    }))
}
