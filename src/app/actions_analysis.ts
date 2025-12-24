
'use server'

import { getMarketData } from '@/utils/market-data'
import { analyzeTechnical, TechnicalAnalysisResult, calculateObjectives } from '@/utils/technical-analysis'
import { createClient } from '@/utils/supabase/server'

export interface AnalysisReport {
    ticker: string
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
        chartData?: any[] // Added for Supply Chart
    }
    guruAnalysis?: {
        trend: string
        score: number
    }
    summary: string
    generatedAt: string
}

export interface GuruPick {
    strategy_name: string
    tickers: string[] // Array of ticker codes
    date: string
}

export async function getAnalysis(ticker: string): Promise<AnalysisReport | { error: string }> {
    // 1. Fetch Market Data (Yahoo) for Real-time Price
    const marketData = await getMarketData(ticker)
    if (!marketData) return { error: 'Failed to fetch market data' }

    const technical = analyzeTechnical(marketData)

    // 2. Fetch "Daily Insight" from Supabase (Uploaded by Admin Tool)
    const supabase = await createClient()

    // Try to find today's report, or latest within 3 days
    // Note: We use the new table 'daily_analysis_reports'
    const { data: reportRow } = await supabase
        .from('daily_analysis_reports')
        .select('report_data, created_at')
        .eq('ticker', ticker)
        .order('date', { ascending: false })
        .limit(1)
        .single()

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
    let guruInfo = undefined

    if (reportRow && reportRow.report_data) {
        const d = reportRow.report_data

        // Merge Admin Tool Summary
        if (d.summary) summaries.push(`[AI 진단] ${d.summary}`)

        // Supply Data (Latest from Chart)
        if (d.supply_chart && d.supply_chart.length > 0) {
            const latest = d.supply_chart[d.supply_chart.length - 1]
            supplyInfo = {
                foreignNetBuy: latest.foreigner || 0,
                instNetBuy: latest.institution || 0,
                source: 'DailyPort Admin',
                updatedAt: reportRow.created_at,
                chartData: d.supply_chart // Pass full history for Chart
            }
        }

        guruInfo = {
            trend: d.trend || 'UNKNOWN',
            score: d.technical_score || 0
        }
    } else {
        summaries.push('상세 분석 리포트가 없습니다 (Admin Tool 미실행).')
    }

    // 4. Calculate Objectives
    const objectives = calculateObjectives(marketData.currentPrice)
    technical.objectives = objectives

    return {
        ticker,
        price: {
            current: marketData.currentPrice,
            changePercent: marketData.changePercent || 0
        },
        technical,
        supplyDemand: supplyInfo,
        guruAnalysis: guruInfo,
        summary: summaries.join(' '),
        generatedAt: new Date().toISOString()
    }
}

export async function getGuruPicks(): Promise<GuruPick[]> {
    const supabase = await createClient()

    // Fetch latest picks for each strategy
    // We fetch all pics from the last 2 days to ensure we see something
    const today = new Date().toISOString().split('T')[0]

    // Simple query: Get all picks from last 3 days
    // In a real app we might want to group by strategy and get max date
    const { data, error } = await supabase
        .from('guru_picks')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching guru picks:", error)
        return []
    }

    return (data || []).map(row => ({
        strategy_name: row.strategy_name,
        tickers: row.tickers, // Supabase JSONB comes as array
        date: row.date
    }))
}
