
import { getNaverHistoricalData } from './naver-finance'
import { KRXIndexDataSource, YahooStockDataSource, NaverStockDataSource } from '../market-data'
import type { HistoricalDataParams, QuoteData, HistoricalData, MarketDataError } from '../market-data/interfaces/market-data.interface'
// Legacy wrapper removed - using direct SDK integration


export interface MarketData {
    ticker: string
    name?: string
    currentPrice: number
    marketCap?: number
    per?: number
    pbr?: number
    eps?: number
    high52Week?: number
    low52Week?: number
    changePrice?: number
    changePercent?: number
    currency?: string
    nav?: number // For ETFs: Net Asset Value
    premiumDiscount?: number // For ETFs: NAV 괴리율 (%)
    assetType?: 'STOCK' | 'ETF'
    // Investor Supply Data (Net Buying)
    investor_individual?: number
    investor_foreign?: number
    investor_institution?: number
    historical?: {
        date: string
        open: number
        high: number
        low: number
        close: number
        volume: number
    }[]
    source?: 'NAVER' | 'YAHOO' | 'CACHE' | 'SDK'
}

export interface IndexData {
    name: string
    indexClass: string
    currentPrice: number
    change: number
    changePercent: number
    open: number
    high: number
    low: number
    volume: number
    tradingValue: number
    marketCap: number
    date: string
}

const CACHE_TTL_MINUTES = 10

interface KRXIndexItem {
    BAS_DD: string;
    IDX_NM: string;
    IDX_CLSS: string;
    CLSPRC_IDX: string;
    CMPPREVDD_IDX: string;
    FLUC_RT: string;
    OPNPRC_IDX: string;
    HGPRC_IDX: string;
    LWPRC_IDX: string;
    ACC_TRDVOL: string;
    ACC_TRDVAL: string;
    MKTCAP: string;
}

// KRX Index data functions - using new SDK
export async function getKOSPIIndexData(): Promise<IndexData[]> {
    try {
        const krxSource = new KRXIndexDataSource()
        await krxSource.connect()
        const result = await krxSource.getIndexData('KOSPI')

        if (result && !Array.isArray(result)) {
            console.error('KRX KOSPI Index: Expected array but got error:', result)
            return []
        }

        return (result as IndexData[]) || []
    } catch (error) {
        console.error('KRX KOSPI Index fetch error:', error)
        return []
    }
}

export async function getKOSDAQIndexData(): Promise<IndexData[]> {
    try {
        const krxSource = new KRXIndexDataSource()
        await krxSource.connect()
        const result = await krxSource.getIndexData('KOSDAQ')

        if (result && !Array.isArray(result)) {
            console.error('KRX KOSDAQ Index: Expected array but got error:', result)
            return []
        }

        return (result as IndexData[]) || []
    } catch (error) {
        console.error('KRX KOSDAQ Index fetch error:', error)
        return []
    }
}




import { createAnonClient } from '@/utils/supabase/server'

/**
 * 네이버 금융에서 시세 데이터 가져오기 (주 소스) - using new SDK
 * - 현재가, PER, PBR, 시가총액
 */
async function fetchNaverQuoteOnly(ticker: string, isETF = false): Promise<Partial<MarketData> | null> {
    try {
        const naverSource = new NaverStockDataSource()
        await naverSource.connect()

        const quoteResult = await naverSource.getQuote(ticker)
        if (!quoteResult || 'type' in quoteResult) {
            console.error('Naver quote fetch failed:', quoteResult)
            return null
        }

        const quote = quoteResult as QuoteData

        return {
            ticker: quote.symbol,
            name: quote.name,
            currentPrice: quote.price,
            changePrice: quote.change,
            changePercent: quote.changePercent,
            per: quote.per,
            pbr: quote.pbr,
            marketCap: quote.marketCap,
            eps: quote.eps,
            high52Week: quote.high52Week,
            low52Week: quote.low52Week,
            nav: quote.nav,
            premiumDiscount: quote.premiumDiscount,
            assetType: quote.assetClass === 'ETF' ? 'ETF' : 'STOCK',
            currency: quote.currency
        }
    } catch (error) {
        console.error(`Naver quote fetch error for ${ticker}:`, error)
        return null
    }
}

/**
 * 네이버 금융에서 일봉 데이터 가져오기 (300일)
 */
async function fetchNaverHistoricalOnly(ticker: string): Promise<MarketData['historical']> {
    try {
        const historicalData = await getNaverHistoricalData(ticker, 300)
        return historicalData.map(h => ({
            date: h.date,
            open: h.open,
            high: h.high,
            low: h.low,
            close: h.close,
            volume: h.volume
        }))
    } catch (error) {
        console.error(`Naver historical fetch error for ${ticker}:`, error)
        return undefined
    }
}

/**
 * 야후 파이낸스에서 시세 데이터 가져오기 (fallback) - using new SDK
 */
async function fetchFromYahoo(ticker: string): Promise<MarketData | null> {
    try {
        const yahooSource = new YahooStockDataSource()
        await yahooSource.connect()

        // Get quote data
        const quoteResult = await yahooSource.getQuote(ticker)
        if (!quoteResult || 'type' in quoteResult) {
            console.error('Yahoo quote fetch failed:', quoteResult)
            return null
        }

        const quote = quoteResult as QuoteData

        // Get historical data (last 300 days)
        const historicalParams: HistoricalDataParams = {
            symbol: ticker,
            timeframe: '1d',
            limit: 300
        }

        const historicalResult = await yahooSource.getHistoricalData(historicalParams)
        if (!historicalResult || 'type' in historicalResult) {
            console.error('Yahoo historical fetch failed:', historicalResult)
            return null
        }

        const historicalData = historicalResult as HistoricalData

        return {
            ticker,
            name: quote.name,
            currentPrice: quote.price,
            marketCap: quote.marketCap,
            per: quote.per,
            pbr: quote.pbr,
            eps: quote.eps,
            high52Week: quote.high52Week,
            low52Week: quote.low52Week,
            changePrice: quote.change,
            changePercent: quote.changePercent,
            currency: quote.currency,
            historical: historicalData.data?.map((h) => ({
                date: h.date,
                open: h.open,
                high: h.high,
                low: h.low,
                close: h.close,
                volume: h.volume
            })) || [],
            source: 'YAHOO'
        }
    } catch (error) {
        console.error(`Yahoo Finance fetch error for ${ticker}:`, error)
        return null
    }
}

/**
 * 메인 데이터 가져오기 함수 (Antigravity's Hybrid Caching)
 * 
 * 전략:
 * 1. 실시간 가격 (Live Price): 5분 TTL
 * 2. 과거 일봉 (Historical): 24시간 TTL (무거운 요청 최소화)
 * 
 * 우선순위: Supabase 캐시 → 네이버 금융 → 야후 fallback
 */
async function fetchMarketDataInternal(ticker: string): Promise<MarketData | null> {
    const supabase = createAnonClient()

    // 1. Supabase 캐시 확인
    const { data: cachedRow } = await supabase
        .from('analysis_cache')
        .select('*')
        .eq('ticker', ticker)
        .single()

    const now = new Date().getTime()
    const cachedData = cachedRow?.data as MarketData | null
    const generatedAt = cachedRow ? new Date(cachedRow.generated_at).getTime() : 0
    const diffMinutes = (now - generatedAt) / (1000 * 60)

    // [A] 아주 신선한 데이터 (5분 이내): 바로 반환
    if (cachedRow && cachedData && diffMinutes < 5) {
        console.log(`[CACHE HIT - FULL] ${ticker}`)
        return { ...cachedData, source: 'CACHE' }
    }

    // [B] 데이터가 있으나 5분이 지남: 가격만 새로고침 (일봉은 재사용)
    if (cachedRow && cachedData && diffMinutes < 1440) { // 24시간 이내
        console.log(`[CACHE HIT - PARTIAL] ${ticker} (Price Refresh Only)`)

        // ETF 여부 판단 (기존 데이터나 티커로)
        const isETF = cachedData.assetType === 'ETF' || !!(cachedData.name && cachedData.name.includes('ETF'))

        const freshQuote = await fetchNaverQuoteOnly(ticker, isETF)
        if (freshQuote) {
            const updatedData: MarketData = {
                ...cachedData,
                ...freshQuote,
                historical: cachedData.historical, // 기존 일봉 유지
                source: 'NAVER'
            }

            // 캐시 업데이트 (백그라운드에서 진행해도 되지만 여기선 동기식 처리)
            await supabase.from('analysis_cache').upsert({
                ticker,
                data: updatedData,
                generated_at: new Date().toISOString(),
                source: 'NAVER'
            })

            return updatedData
        }
    }

    // [C] 데이터가 없거나 24시간이 지남: 전체 새로고침 (무거운 요청)
    console.log(`[FETCH - FULL] ${ticker} (Naver Quote + 300d Historical)`)

    // 1. 시세 + 2. 일봉 병합 호출
    // 티커가 '4'로 시작하더라도 6자리 숫자인 경우 새로운 상장 종목일 가능성이 높으므로 
    // 기본적으로 주식으로 시도하고, 결과에 'ETF'가 포함된 경우에만 ETF로 취급하는 것이 안전합니다.
    let isETF = ticker.startsWith('069500') // KODEX 200 등 명백한 ETF

    // 우선 주식으로 시도
    let quote = await fetchNaverQuoteOnly(ticker, false)

    // 만약 주식으로 실패하거나, 이름에 'ETF'가 명시적으로 포함되어 있다면 ETF로 다시 시도
    if (quote && quote.name && (quote.name.includes('ETF') || quote.name.includes('KODEX') || quote.name.includes('TIGER'))) {
        isETF = true
        const etfQuote = await fetchNaverQuoteOnly(ticker, true)
        if (etfQuote) quote = { ...quote, ...etfQuote }
    } else if (!quote && (ticker.startsWith('4') || ticker.startsWith('3') || ticker.startsWith('K'))) {
        // 주식으로 실패했는데 ETF일 가능성이 있는 번호대라면 ETF로 한번 더 시도
        const etfQuote = await fetchNaverQuoteOnly(ticker, true)
        if (etfQuote) {
            quote = etfQuote
            isETF = true
        }
    }

    if (quote) {
        const historical = await fetchNaverHistoricalOnly(ticker)

        const marketData: MarketData = {
            ...quote as MarketData,
            historical,
            source: 'NAVER'
        }

        // 캐시 저장
        await supabase.from('analysis_cache').upsert({
            ticker,
            data: marketData,
            generated_at: new Date().toISOString(),
            source: 'NAVER'
        })

        return marketData
    }

    // [D] 네이버 실패 시 야후 Fallback
    console.log(`[FALLBACK] ${ticker} (Yahoo Finance)`)
    const yahooData = await fetchFromYahoo(ticker)
    if (yahooData) {
        await supabase.from('analysis_cache').upsert({
            ticker,
            data: yahooData,
            generated_at: new Date().toISOString(),
            source: 'YAHOO'
        })
        return yahooData
    }

    // [E] 모든 시도 실패 시 만료된 캐시라도 반환
    if (cachedData) {
        console.warn(`[STALE CACHE] ${ticker} - All sources failed`)
        return cachedData
    }

    return null
}


// Exported cached function
import { unstable_cache } from 'next/cache'

export const getMarketData = unstable_cache(
    async (ticker: string) => {
        // Direct SDK integration - no wrapper needed
        return await fetchMarketDataInternal(ticker)
    },
    ['market-data'],
    { revalidate: 60 } // Cache for 60 seconds
)
