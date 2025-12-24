'use server'

// Korean stock market trading hours:
// - Regular session: 09:00 ~ 15:30 KST
// - After-hours (ATS/K-OTC): 15:40 ~ 20:00 KST
// We fetch from 09:00 to 20:00 KST to cover all trading activity
// If no data for today, we fallback to the last trading day (up to 5 days back)

const KST_OFFSET = 9 * 60 * 60 * 1000

// Helper function to fetch intraday data for a specific date
async function fetchIntradayData(symbol: string, targetDate: Date): Promise<{ time: string, price: number }[]> {
    // Market hours: 09:00 ~ 20:00 KST
    const marketOpenKst = new Date(targetDate)
    marketOpenKst.setUTCHours(9, 0, 0, 0)

    const marketCloseKst = new Date(targetDate)
    marketCloseKst.setUTCHours(20, 0, 0, 0)

    // Convert to UTC timestamps for Yahoo Finance API
    const period1 = Math.floor((marketOpenKst.getTime() - KST_OFFSET) / 1000)
    const period2 = Math.floor((marketCloseKst.getTime() - KST_OFFSET) / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=60m`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.chart.result?.[0]
    const timestamps = result?.timestamp
    const closes = result?.indicators?.quote?.[0]?.close

    if (!timestamps || !closes) return []

    return timestamps.map((timestamp: number, index: number) => ({
        time: new Date(timestamp * 1000).toISOString(),
        price: closes[index] || 0
    })).filter((item: { time: string, price: number }) => item.price > 0)
}

// Helper function to get data with fallback to previous trading days
async function getIntradayDataWithFallback(symbol: string): Promise<{ time: string, price: number }[]> {
    const now = new Date()
    const kstNow = new Date(now.getTime() + KST_OFFSET)

    // Try today first, then fallback up to 5 days (to handle weekends and holidays)
    for (let daysBack = 0; daysBack <= 5; daysBack++) {
        const targetDate = new Date(kstNow)
        targetDate.setUTCDate(targetDate.getUTCDate() - daysBack)
        targetDate.setUTCHours(0, 0, 0, 0)

        try {
            const data = await fetchIntradayData(symbol, targetDate)
            if (data.length > 0) {
                return data
            }
        } catch (error) {
            console.error(`Failed to fetch data for ${daysBack} days ago:`, error)
        }
    }

    return []
}

// Intraday data for charts (1-hour intervals for current trading day)
export async function getKOSPIIntradayData(): Promise<{ time: string, price: number }[]> {
    try {
        return await getIntradayDataWithFallback('%5EKS11')
    } catch (error) {
        console.error('KOSPI Intraday fetch error:', error)
        return []
    }
}

export async function getKOSDAQIntradayData(): Promise<{ time: string, price: number }[]> {
    try {
        return await getIntradayDataWithFallback('%5EKQ11')
    } catch (error) {
        console.error('KOSDAQ Intraday fetch error:', error)
        return []
    }
}
