
'use server'

import { getMarketData } from '@/utils/market-data'
import { analyzeTechnical, TechnicalAnalysisResult } from '@/utils/technical-analysis'
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
    }
    summary: string
    generatedAt: string
}

export async function getAnalysis(ticker: string): Promise<AnalysisReport | { error: string }> {
    // 1. Fetch Market Data & Calculate Technicals
    const marketData = await getMarketData(ticker)
    if (!marketData) return { error: 'Failed to fetch market data' }

    const technical = analyzeTechnical(marketData)

    // 2. Fetch Supply/Demand (Insights) from DB
    const supabase = await createClient()
    const { data: insights } = await supabase
        .from('ticker_insights')
        .select('*')
        .eq('ticker', ticker)
        .single()

    // 3. Generate Summary Message
    const summaries: string[] = []

    // Price
    if ((marketData.changePercent || 0) > 0) summaries.push('주가가 상승세입니다.')
    else summaries.push('주가가 하락세입니다.')

    // Technical
    if (technical.rsi.status === 'OVERBOUGHT') summaries.push('RSI 과매수 구간입니다 (조정 주의).')
    if (technical.trend.status === 'GOLDEN_CROSS') summaries.push('단기 이평선이 장기를 돌파했습니다 (골든크로스).')
    if (technical.trend.status === 'UP_TREND') summaries.push('이평선 정배열 상태입니다.')

    // Supply/Demand
    let supplyInfo = undefined
    if (insights) {
        supplyInfo = {
            foreignNetBuy: insights.foreign_net_buy,
            instNetBuy: insights.inst_net_buy,
            source: insights.source,
            updatedAt: insights.generated_at
        }

        if (insights.foreign_net_buy > 0 && insights.inst_net_buy > 0) {
            summaries.push('외국인과 기관의 양매수가 유입되고 있습니다.') // Double/Twin buy
        } else if (insights.foreign_net_buy > 0) {
            summaries.push('외국인 순매수가 강세입니다.')
        }
    } else {
        summaries.push('수급 데이터는 아직 집계되지 않았습니다 (로컬 펌프 필요).')
    }

    return {
        ticker,
        price: {
            current: marketData.currentPrice,
            changePercent: marketData.changePercent || 0
        },
        technical,
        supplyDemand: supplyInfo,
        summary: summaries.join(' '),
        generatedAt: new Date().toISOString()
    }
}
