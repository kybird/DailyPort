
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

    // 2. Fetch Supply/Demand from 'analysis_cache' (Synced by Admin Tool)
    // The previous code queried 'ticker_insights' which is deprecated or empty.
    const supabase = await createClient()
    const { data: cachedData } = await supabase
        .from('analysis_cache')
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

    if (cachedData && cachedData.data) {
        // Safe access to nested JSON properties
        const d = cachedData.data
        const hasInvestorData = 'investor_foreign' in d && 'investor_institution' in d

        if (hasInvestorData) {
            supplyInfo = {
                foreignNetBuy: d.investor_foreign || 0,
                instNetBuy: d.investor_institution || 0,
                source: cachedData.source || 'AdminTool',
                updatedAt: cachedData.generated_at
            }

            if (supplyInfo.foreignNetBuy > 0 && supplyInfo.instNetBuy > 0) {
                summaries.push('외국인과 기관의 양매수가 유입되고 있습니다.')
            } else if (supplyInfo.foreignNetBuy > 0) {
                summaries.push('외국인 순매수가 강세입니다.')
            } else if (supplyInfo.instNetBuy > 0) {
                summaries.push('기관 순매수가 강세입니다.')
            } else if (supplyInfo.foreignNetBuy < 0 && supplyInfo.instNetBuy < 0) {
                summaries.push('외국인과 기관이 동반 매도 중입니다.')
            }
        }
    }

    if (!supplyInfo) {
        summaries.push('수급 데이터는 아직 집계되지 않았습니다 (로컬 Admin Tool 실행 필요).')
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
