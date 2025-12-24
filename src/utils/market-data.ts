
import YahooFinance from 'yahoo-finance2'
import { createClient } from '@/utils/supabase/server'

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] })


export interface MarketData {
    ticker: string
    currentPrice: number
    marketCap?: number
    per?: number
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

// Simple delay function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))





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

        return indices.map((item: any) => {
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

        return indices.map((item: any) => {
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



export async function getMarketData(ticker: string): Promise<MarketData | null> {
    const supabase = await createClient()

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
        let quote: any
        try {
            quote = await yahooFinance.quote(yahooTicker)
        } catch (e) {
            // Fallback for KOSDAQ if KOSPI fails
            if (yahooTicker.endsWith('.KS')) {
                const kqTicker = yahooTicker.replace('.KS', '.KQ')
                try {
                    quote = await yahooFinance.quote(kqTicker)
                    yahooTicker = kqTicker // Update ticker if fallback works
                } catch (e2) {
                    throw e // Throw original error if both fail
                }
            } else {
                throw e
            }
        }

        // Fetch Historical (using chart() as recommended)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 300)

        const chartResult = await yahooFinance.chart(yahooTicker, {
            period1: startDate.toISOString().split('T')[0],
            period2: new Date().toISOString().split('T')[0],
            interval: '1d'
        })

        const historical = chartResult.quotes.map((q: any) => ({
            date: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume
        })).filter((q: any) => q.close !== null)


        const marketData: MarketData = {
            ticker,
            currentPrice: quote.regularMarketPrice || 0,
            marketCap: quote.marketCap,
            per: quote.trailingPE,
            eps: quote.epsTrailingTwelveMonths,
            high52Week: quote.fiftyTwoWeekHigh,
            low52Week: quote.fiftyTwoWeekLow,
            changePrice: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            currency: quote.currency,
            historical: historical.map((h: any) => ({
                date: h.date.toISOString(),
                open: h.open,
                high: h.high,
                low: h.low,
                close: h.close,
                volume: h.volume
            })) // .reverse() ? technicalindicators usually expect oldest first (array[0] is old)
        }

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
