import stocksData from '@/data/stocks.json'

interface Stock {
    ticker: string
    name: string
    code: string
}

export function getStockName(ticker: string): string {
    const normalized = ticker.split('.')[0]
    const stock = (stocksData as unknown as Stock[]).find(s => s.ticker === normalized || s.code === normalized)
    return stock ? stock.name : ticker
}
