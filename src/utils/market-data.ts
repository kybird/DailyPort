
import YahooFinance from 'yahoo-finance2'
import { getNaverStockQuote, getNaverETFQuote, getNaverHistoricalData } from './naver-finance'


const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] })


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
    source?: 'NAVER' | 'YAHOO' | 'CACHE'
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

// KRX Index data functions
export async function getKOSPIIndexData(): Promise<IndexData[]> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const endpoint = 'https://data-dbg.krx.co.kr/svc/apis/idx/kospi_dd_trd'

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AUTH_KEY': process.env.KRX_OPEN_API_KEY || ''
            },
            body: JSON.stringify({ basDd: today })
        })

        if (!response.ok) {
            console.error(`KRX KOSPI Index API error: ${response.status}`)
            return []
        }

        const data = await response.json()
        const indices = data.OutBlock_1 || []

        return indices.map((item: KRXIndexItem) => {
            const basDd = item.BAS_DD
            const year = basDd.slice(0, 4)
            const month = basDd.slice(4, 6)
            const day = basDd.slice(6, 8)
            const dateStr = `${year}-${month}-${day}`

            return {
                name: item.IDX_NM,
                indexClass: item.IDX_CLSS,
                currentPrice: parseFloat(item.CLSPRC_IDX) || 0,
                change: parseFloat(item.CMPPREVDD_IDX) || 0,
                changePercent: parseFloat(item.FLUC_RT) || 0,
                open: parseFloat(item.OPNPRC_IDX) || 0,
                high: parseFloat(item.HGPRC_IDX) || 0,
                low: parseFloat(item.LWPRC_IDX) || 0,
                volume: parseInt(item.ACC_TRDVOL) || 0,
                tradingValue: parseFloat(item.ACC_TRDVAL) || 0,
                marketCap: parseFloat(item.MKTCAP) || 0,
                date: dateStr
            }
        })
    } catch (error) {
        console.error('KRX KOSPI Index fetch error:', error)
        return []
    }
}

export async function getKOSDAQIndexData(): Promise<IndexData[]> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const endpoint = 'https://data-dbg.krx.co.kr/svc/apis/idx/kosdaq_dd_trd'

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AUTH_KEY': process.env.KRX_OPEN_API_KEY || ''
            },
            body: JSON.stringify({ basDd: today })
        })

        if (!response.ok) {
            console.error(`KRX KOSDAQ Index API error: ${response.status}`)
            return []
        }

        const data = await response.json()
        const indices = data.OutBlock_1 || []

        return indices.map((item: KRXIndexItem) => {
            const basDd = item.BAS_DD
            const year = basDd.slice(0, 4)
            const month = basDd.slice(4, 6)
            const day = basDd.slice(6, 8)
            const dateStr = `${year}-${month}-${day}`

            return {
                name: item.IDX_NM,
                indexClass: item.IDX_CLSS,
                currentPrice: parseFloat(item.CLSPRC_IDX) || 0,
                change: parseFloat(item.CMPPREVDD_IDX) || 0,
                changePercent: parseFloat(item.FLUC_RT) || 0,
                open: parseFloat(item.OPNPRC_IDX) || 0,
                high: parseFloat(item.HGPRC_IDX) || 0,
                low: parseFloat(item.LWPRC_IDX) || 0,
                volume: parseInt(item.ACC_TRDVOL) || 0,
                tradingValue: parseFloat(item.ACC_TRDVAL) || 0,
                marketCap: parseFloat(item.MKTCAP) || 0,
                date: dateStr
            }
        })
    } catch (error) {
        console.error('KRX KOSDAQ Index fetch error:', error)
        return []
    }
}




import { createAnonClient } from '@/utils/supabase/server'

/**
 * 네이버 금융에서 시세 데이터 가져오기 (주 소스)
 * - 현재가, PER, PBR, 시가총액
 */
async function fetchNaverQuoteOnly(ticker: string, isETF = false): Promise<Partial<MarketData> | null> {
    try {
        const quote = isETF
            ? await getNaverETFQuote(ticker)
            : await getNaverStockQuote(ticker)

        if (!quote || quote.currentPrice === 0) return null

        return {
            ticker,
            name: quote.name,
            currentPrice: quote.currentPrice,
            changePrice: quote.changePrice,
            changePercent: quote.changePercent,
            per: quote.per,
            pbr: quote.pbr,
            marketCap: quote.marketCap,
            nav: quote.nav,
            premiumDiscount: quote.premiumDiscount,
            assetType: quote.assetType,
            currency: 'KRW'
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
 * 야후 파이낸스에서 시세 데이터 가져오기 (fallback)
 */
async function fetchFromYahoo(ticker: string): Promise<MarketData | null> {
    try {
        let yahooTicker = ticker
        // Auto-append suffix for Korean 6-character tickers if not already present
        if (/^\d{6}$/.test(ticker) && !ticker.includes('.')) {
            yahooTicker = `${ticker}.KS`
        }

        // Fetch Quote
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let quote: any | undefined;
        try {
            quote = await yahooFinance.quote(yahooTicker)
        } catch (e) {
            // Fallback for KOSDAQ if KOSPI fails
            if (yahooTicker.endsWith('.KS')) {
                const kqTicker = yahooTicker.replace('.KS', '.KQ')
                try {
                    quote = await yahooFinance.quote(kqTicker)
                    yahooTicker = kqTicker
                } catch {
                    throw e
                }
            } else if (yahooTicker.endsWith('.KQ')) {
                const ksTicker = yahooTicker.replace('.KQ', '.KS')
                try {
                    quote = await yahooFinance.quote(ksTicker)
                    yahooTicker = ksTicker
                } catch {
                    throw e
                }
            } else {
                throw e
            }
        }

        if (!quote) return null

        // Fetch Historical (using chart() as recommended)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 300)

        const chartResult = await yahooFinance.chart(yahooTicker, {
            period1: startDate.toISOString().split('T')[0],
            period2: new Date().toISOString().split('T')[0],
            interval: '1d'
        })

        const historical = chartResult.quotes.map((q) => ({
            date: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume
        })).filter((q) => q.close !== null)

        return {
            ticker,
            name: quote.shortName || quote.longName || ticker,
            currentPrice: quote.regularMarketPrice || 0,
            marketCap: quote.marketCap,
            per: quote.trailingPE,
            eps: quote.epsTrailingTwelveMonths,
            high52Week: quote.fiftyTwoWeekHigh,
            low52Week: quote.fiftyTwoWeekLow,
            changePrice: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            currency: quote.currency,
            historical: historical.map((h) => ({
                date: (h.date as Date).toISOString(),
                open: h.open as number,
                high: h.high as number,
                low: h.low as number,
                close: h.close as number,
                volume: h.volume as number
            })),
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
    let cachedData = cachedRow?.data as MarketData | null
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
        const isETF = cachedData.assetType === 'ETF' || ticker.startsWith('4') || ticker.startsWith('069500')

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
    const isETF = ticker.startsWith('4') || ticker.startsWith('069500')
    const quote = await fetchNaverQuoteOnly(ticker, isETF)

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
    async (ticker: string) => fetchMarketDataInternal(ticker),
    ['market-data'],
    { revalidate: 60 } // Cache for 60 seconds
)
