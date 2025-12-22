// Intraday data for charts (1-hour intervals for current trading day)
export async function getKOSPIIntradayData(): Promise<{time: string, price: number}[]> {
    try {
        // Get today's start and end timestamps
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const period1 = Math.floor(today.getTime() / 1000)
        const period2 = Math.floor(tomorrow.getTime() / 1000)

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11?period1=${period1}&period2=${period2}&interval=60m`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`)
        }

        const data = await response.json()
        const timestamps = data.chart.result[0].timestamp
        const closes = data.chart.result[0].indicators.quote[0].close

        return timestamps.map((timestamp: number, index: number) => ({
            time: new Date(timestamp * 1000).toISOString(),
            price: closes[index] || 0
        })).filter(item => item.price > 0) // Filter out null values
    } catch (error) {
        console.error('KOSPI Intraday fetch error:', error)
        // Return empty array instead of throwing to prevent client-side crashes
        return []
    }
}

export async function getKOSDAQIntradayData(): Promise<{time: string, price: number}[]> {
    try {
        // Get today's start and end timestamps
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const period1 = Math.floor(today.getTime() / 1000)
        const period2 = Math.floor(tomorrow.getTime() / 1000)

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EKQ11?period1=${period1}&period2=${period2}&interval=60m`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`)
        }

        const data = await response.json()
        const timestamps = data.chart.result[0].timestamp
        const closes = data.chart.result[0].indicators.quote[0].close

        return timestamps.map((timestamp: number, index: number) => ({
            time: new Date(timestamp * 1000).toISOString(),
            price: closes[index] || 0
        })).filter(item => item.price > 0) // Filter out null values
    } catch (error) {
        console.error('KOSDAQ Intraday fetch error:', error)
        // Return empty array instead of throwing to prevent client-side crashes
        return []
    }
}
