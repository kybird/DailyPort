import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Cache TTL in minutes
const CACHE_TTL_MINUTES = 5

// Helper to add Yahoo Finance suffix
function addYahooSuffix(ticker: string): string {
    // Korean stocks are 6-digit numbers
    if (/^\d{6}$/.test(ticker)) {
        // We default to .KS but the consumer should handle retries 
        // if they want to be thorough. For this simple API, .KS is a reasonable guess
        // or we could use the database to find the market.
        return `${ticker}.KS`
    }
    return ticker
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const ticker = searchParams.get('ticker')

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
    }

    try {
        const supabase = await createClient()

        // Check cache first
        const { data: cached, error: cacheError } = await supabase
            .from('market_data_cache')
            .select('*')
            .eq('ticker', ticker)
            .gte('cached_at', new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString())
            .single()

        if (cached && !cacheError) {
            return NextResponse.json({
                ticker: cached.ticker,
                currentPrice: cached.current_price,
                changePrice: cached.change_price,
                changePercent: cached.change_percent,
                volume: cached.volume,
                source: 'cache',
                cachedAt: cached.cached_at
            })
        }

        // Cache miss - fetch from Yahoo Finance
        const yahooTicker = addYahooSuffix(ticker)
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=5d`

        const response = await fetch(yahooUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`)
        }

        const data = await response.json()
        const result = data?.chart?.result?.[0]

        if (!result) {
            throw new Error('No data available from Yahoo Finance')
        }

        const meta = result.meta
        const currentPrice = meta.regularMarketPrice || 0
        const previousClose = meta.chartPreviousClose || meta.previousClose || 0
        const changePrice = currentPrice - previousClose
        const changePercent = previousClose > 0 ? (changePrice / previousClose) * 100 : 0

        // Update cache
        await supabase
            .from('market_data_cache')
            .upsert({
                ticker,
                current_price: currentPrice,
                change_price: changePrice,
                change_percent: changePercent,
                volume: meta.regularMarketVolume || 0,
                market_cap: meta.marketCap || null,
                cached_at: new Date().toISOString()
            })

        return NextResponse.json({
            ticker,
            currentPrice,
            changePrice,
            changePercent,
            volume: meta.regularMarketVolume || 0,
            source: 'yahoo',
            cachedAt: new Date().toISOString()
        })

    } catch (error: unknown) {
        console.error('Market data fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch market data'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
