import stocksData from '@/data/stocks.json'

export function getStockName(ticker: string): string {
    const normalized = ticker.split('.')[0]
    const stock = (stocksData as any[]).find(s => s.ticker === normalized || s.code === normalized)
    return stock ? stock.name : ticker
}
