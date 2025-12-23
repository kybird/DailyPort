'use server'

// Intraday data for charts (1-hour intervals for current trading day)
export async function getKOSPIIntradayData(): Promise<{ time: string, price: number }[]> {
    try {
        // Get today's start and end timestamps in KST (UTC+9)
        const now = new Date()
        const kstOffset = 9 * 60 * 60 * 1000
        const kstNow = new Date(now.getTime() + kstOffset)

        const todayKst = new Date(kstNow)
        todayKst.setUTCHours(0, 0, 0, 0)

        // Convert back to UTC for Yahoo Finance API
        const period1 = Math.floor((todayKst.getTime() - kstOffset) / 1000)
        const period2 = period1 + 24 * 60 * 60

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11?period1=${period1}&period2=${period2}&interval=60m`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`)
        }

        const data = await response.json()
        const timestamps = data.chart.result[0].timestamp
        const closes = data.chart.result[0].indicators.quote[0].close

        if (!timestamps) return []

        return timestamps.map((timestamp: number, index: number) => ({
            time: new Date(timestamp * 1000).toISOString(),
            price: closes[index] || 0
        })).filter((item: { time: string, price: number }) => item.price > 0) // Filter out null values
    } catch (error) {
        console.error('KOSPI Intraday fetch error:', error)
        return []
    }
}

export async function getKOSDAQIntradayData(): Promise<{ time: string, price: number }[]> {
    try {
        // Get today's start and end timestamps in KST (UTC+9)
        const now = new Date()
        const kstOffset = 9 * 60 * 60 * 1000
        const kstNow = new Date(now.getTime() + kstOffset)

        const todayKst = new Date(kstNow)
        todayKst.setUTCHours(0, 0, 0, 0)

        // Convert back to UTC for Yahoo Finance API
        const period1 = Math.floor((todayKst.getTime() - kstOffset) / 1000)
        const period2 = period1 + 24 * 60 * 60

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EKQ11?period1=${period1}&period2=${period2}&interval=60m`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`)
        }

        const data = await response.json()
        const timestamps = data.chart.result[0].timestamp
        const closes = data.chart.result[0].indicators.quote[0].close

        if (!timestamps) return []

        return timestamps.map((timestamp: number, index: number) => ({
            time: new Date(timestamp * 1000).toISOString(),
            price: closes[index] || 0
        })).filter((item: { time: string, price: number }) => item.price > 0) // Filter out null values
    } catch (error) {
        console.error('KOSDAQ Intraday fetch error:', error)
        return []
    }
}
