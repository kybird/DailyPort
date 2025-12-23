import stocksData from '@/data/stocks.json'

export function getStockName(ticker: string): string {
    const stock = stocksData.find(s => s.ticker === ticker || s.code === ticker)
    return stock ? stock.name : ticker
}
