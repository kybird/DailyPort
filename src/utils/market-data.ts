
import yahooFinance from 'yahoo-finance2'
import { createClient } from '@/utils/supabase/server'

export interface MarketData {
    ticker: string
    currentPrice: number
    marketCap?: number
    per?: number
    eps?: number
    high52Week?: number
    low52Week?: number
    changePercent?: number
    currency?: string
    nav?: number // For ETFs: Net Asset Value
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

// KRX Fallback function for stocks
async function getKRXData(ticker: string): Promise<MarketData | null> {
    const isKospi = ticker.endsWith('.KS')
    const isKosdaq = ticker.endsWith('.KQ')
    if (!isKospi && !isKosdaq) return null

    const code = ticker.replace('.KS', '').replace('.KQ', '')
    const endpoint = isKospi
        ? 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd'
        : 'https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd'

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')

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
            console.error(`KRX API error: ${response.status}`)
            return null
        }

        const data = await response.json()
        const stockData = data.OutBlock_1?.find((item: any) => item.ISU_CD === code)

        if (!stockData) {
            console.warn(`Stock ${code} not found in KRX data`)
            return null
        }

        // Convert BAS_DD to ISO date
        const basDd = stockData.BAS_DD
        const year = basDd.slice(0, 4)
        const month = basDd.slice(4, 6)
        const day = basDd.slice(6, 8)
        const dateStr = `${year}-${month}-${day}T00:00:00.000Z`

        const marketData: MarketData = {
            ticker,
            currentPrice: parseFloat(stockData.TDD_CLSPRC) || 0,
            marketCap: parseFloat(stockData.MKTCAP) || undefined,
            changePercent: parseFloat(stockData.FLUC_RT) || undefined,
            currency: 'KRW',
            historical: [{
                date: dateStr,
                open: parseFloat(stockData.TDD_OPNPRC) || 0,
                high: parseFloat(stockData.TDD_HGPRC) || 0,
                low: parseFloat(stockData.TDD_LWPRC) || 0,
                close: parseFloat(stockData.TDD_CLSPRC) || 0,
                volume: parseInt(stockData.ACC_TRDVOL) || 0
            }]
        }

        return marketData
    } catch (error) {
        console.error('KRX fetch error:', error)
        return null
    }
}

// KRX ETF Fallback function
async function getKRXETFData(ticker: string): Promise<MarketData | null> {
    const isKospi = ticker.endsWith('.KS')
    const isKosdaq = ticker.endsWith('.KQ')
    if (!isKospi && !isKosdaq) return null

    const code = ticker.replace('.KS', '').replace('.KQ', '')
    const endpoint = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd'

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')

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
            console.error(`KRX ETF API error: ${response.status}`)
            return null
        }

        const data = await response.json()
        const etfData = data.OutBlock_1?.find((item: any) => item.ISU_CD === code)

        if (!etfData) {
            console.warn(`ETF ${code} not found in KRX data`)
            return null
        }

        // Convert BAS_DD to ISO date
        const basDd = etfData.BAS_DD
        const year = basDd.slice(0, 4)
        const month = basDd.slice(4, 6)
        const day = basDd.slice(6, 8)
        const dateStr = `${year}-${month}-${day}T00:00:00.000Z`

        const marketData: MarketData = {
            ticker,
            currentPrice: parseFloat(etfData.TDD_CLSPRC) || 0,
            marketCap: parseFloat(etfData.MKTCAP) || undefined,
            changePercent: parseFloat(etfData.FLUC_RT) || undefined,
            nav: parseFloat(etfData.NAV) || undefined,
            currency: 'KRW',
            historical: [{
                date: dateStr,
                open: parseFloat(etfData.TDD_OPNPRC) || 0,
                high: parseFloat(etfData.TDD_HGPRC) || 0,
                low: parseFloat(etfData.TDD_LWPRC) || 0,
                close: parseFloat(etfData.TDD_CLSPRC) || 0,
                volume: parseInt(etfData.ACC_TRDVOL) || 0
            }]
        }

        return marketData
    } catch (error) {
        console.error('KRX ETF fetch error:', error)
        return null
    }
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

        // Fetch Quote
        const quote = await yahooFinance.quote(ticker) as any

        // Fetch Historical (for Technical Analysis) - last 150 days typically enough for MA, RSI
        const queryOptions = { period1: '2023-01-01' } // Approximate, better to use relative date
        // Let's explicitly calculate start date: 200 days ago
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 300)

        const historical = await yahooFinance.historical(ticker, {
            period1: startDate.toISOString().split('T')[0],
            interval: '1d'
        }) as any[]

        const marketData: MarketData = {
            ticker,
            currentPrice: quote.regularMarketPrice || 0,
            marketCap: quote.marketCap,
            per: quote.trailingPE,
            eps: quote.epsTrailingTwelveMonths,
            high52Week: quote.fiftyTwoWeekHigh,
            low52Week: quote.fiftyTwoWeekLow,
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
        // Fallback to KRX (try stock first, then ETF)
        const krxData = await getKRXData(ticker)
        if (krxData) {
            // Save to Cache
            await supabase.from('analysis_cache').upsert({
                ticker,
                data: krxData,
                generated_at: new Date().toISOString(),
                source: 'KRX'
            })
            return krxData
        }

        // Try ETF API
        const etfData = await getKRXETFData(ticker)
        if (etfData) {
            // Save to Cache
            await supabase.from('analysis_cache').upsert({
                ticker,
                data: etfData,
                generated_at: new Date().toISOString(),
                source: 'KRX_ETF'
            })
            return etfData
        }

        // If both KRX APIs fail, return stale cache if available
        if (cache) {
            console.warn(`Returning stale cache for ${ticker}`)
            return cache.data as MarketData
        }
        return null
    }
}
