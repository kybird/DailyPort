
import { createClient } from '@/utils/supabase/server'
import PortfolioList from '@/components/PortfolioList'
import { getPortfolio, getWatchlist } from '@/app/actions'
import MarketIndexChart from '@/components/MarketIndexChart'
import { getMarketData, MarketData } from '@/utils/market-data'
import Watchlist from '@/components/Watchlist'

interface PortfolioItem {
    id: string;
    ticker: string;
    quantity: number;
    entry_price: number;
    realized_gain: number;
    currency: string;
    marketData?: MarketData | null;
}

interface WatchlistItem {
    id: string;
    ticker: string;
    marketData?: MarketData | null;
}

export default async function Dashboard() {
    const supabase = await createClient()

    await supabase.auth.getUser()

    const portfolioItems = await getPortfolio() as PortfolioItem[] | null
    const watchlistItems = await getWatchlist() as WatchlistItem[] | null

    // Fetch market data for all portfolio items
    const portfolioWithMarketData = await Promise.all(
        (portfolioItems || []).map(async (item: PortfolioItem) => {
            const marketData = await getMarketData(item.ticker)
            return { ...item, marketData }
        })
    )

    // Fetch market data for watchlist items
    const watchlistWithMarketData = await Promise.all(
        (watchlistItems || []).map(async (item: WatchlistItem) => {
            const marketData = await getMarketData(item.ticker)
            return { ...item, marketData }
        })
    )

    // Calculate totals
    const totalValuation = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        const price = item.marketData?.currentPrice || 0
        return sum + price * item.quantity
    }, 0)

    const totalChange = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        const change = item.marketData?.changePrice || 0
        return sum + change * item.quantity
    }, 0)

    const totalRealizedGain = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        return sum + (item.realized_gain || 0)
    }, 0)

    const changePercent = totalValuation > 0 ? (totalChange / (totalValuation - totalChange)) * 100 : 0

    return (
        <div className="space-y-10">
            {/* Market Indices Section */}
            <div className="space-y-4">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white">시장 지수</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MarketIndexChart index="KOSPI" />
                    <MarketIndexChart index="KOSDAQ" />
                </div>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">총 평가금액</h3>
                    <p className="text-2xl font-black mt-2 text-zinc-900 dark:text-white">
                        ₩ {totalValuation.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">오늘의 변화</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-2xl font-black ${totalChange > 0 ? 'text-red-500' : totalChange < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                            {totalChange > 0 ? '+' : ''}{totalChange.toLocaleString()}
                        </p>
                        <span className={`text-sm font-bold ${totalChange > 0 ? 'text-red-500' : totalChange < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                            ({totalChange > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">확정 실현손익</h3>
                    <p className={`text-2xl font-black mt-2 ${totalRealizedGain > 0 ? 'text-red-500' : totalRealizedGain < 0 ? 'text-blue-500' : 'text-zinc-900 dark:text-white'}`}>
                        ₩ {totalRealizedGain.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">보유 종목수</h3>
                    <p className="text-2xl font-black mt-2 text-zinc-900 dark:text-white">{portfolioItems?.length || 0}</p>
                </div>
            </div>

            {/* Watchlist Section */}
            <Watchlist items={watchlistWithMarketData} />

            {/* Portfolio Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white">나의 포트폴리오</h2>
                </div>
                <PortfolioList items={portfolioWithMarketData || []} />
            </div>
        </div>
    )
}
