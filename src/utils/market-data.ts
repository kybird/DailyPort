
import YahooFinance from 'yahoo-finance2'


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





import { createClient, createAnonClient } from '@/utils/supabase/server'

// Internal function to perform the actual fetch
async function fetchMarketDataInternal(ticker: string): Promise<MarketData | null> {
    const supabase = createAnonClient()

    // 1. Check Cache (Supabase)
    const { data: cache } = await supabase
        .from('analysis_cache')
        .select('*')
        .eq('ticker', ticker)
        .single()

    if (cache) {
        const generatedAt = new Date(cache.generated_at).getTime()
        const now = new Date().getTime()
        const diffMinutes = (now - generatedAt) / (1000 * 60)

        // Return cache if valid
        if (diffMinutes < CACHE_TTL_MINUTES) {
            // console.log(`Cache Hit for ${ticker}`)
            return cache.data as MarketData
        }
    }

    // 2. Fetch from Yahoo Finance
    try {
        // console.log(`Fetching Yahoo for ${ticker}`)

        let yahooTicker = ticker
        // Auto-append suffix for Korean 6-character tickers if not already present
        if (/^[0-9A-Z]{6}$/.test(ticker) && !ticker.includes('.')) {
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
                    yahooTicker = kqTicker // Update ticker if fallback works
                } catch {
                    throw e // Throw original error if both fail
                }
            } else {
                throw e
            }
        }

        if (!quote) throw new Error('Failed to fetch quote')

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


        const marketData: MarketData = {
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
                date: (h.date as Date).toISOString(), // chart() result date is Date object
                open: h.open as number,
                high: h.high as number,
                low: h.low as number,
                close: h.close as number,
                volume: h.volume as number
            })) // .reverse() ? technicalindicators usually expect oldest first (array[0] is old)
        }

        // TODO: Integrate a real-time supply data fetcher here (e.g., via a Python microservice or API bridge)
        // so that newly added tickers have immediate supply insights without waiting for the admin tool.

        // 3. Save to Cache (Upsert)
        await supabase.from('analysis_cache').upsert({
            ticker,
            data: marketData,
            generated_at: new Date().toISOString(),
            source: 'YAHOO'
        })

        return marketData
    } catch (error) {
        console.error(`Yahoo Finance fetch error for ${ticker}:`, error)
        // If Yahoo fails, return stale cache if available, otherwise null
        if (cache) {
            console.warn(`Returning stale cache for ${ticker}`)
            return cache.data as MarketData
        }
        return null
    }
}

// Exported cached function
import { unstable_cache } from 'next/cache'

export const getMarketData = unstable_cache(
    async (ticker: string) => fetchMarketDataInternal(ticker),
    ['market-data'],
    { revalidate: 60 } // Cache for 60 seconds
)
