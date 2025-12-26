
import { createClient } from '@/utils/supabase/server'
import { getWatchlist } from '@/app/actions'
import { getMarketData, MarketData } from '@/utils/market-data'
import Watchlist from '@/components/Watchlist'

interface WatchlistItem {
    id: string;
    ticker: string;
    marketData?: MarketData | null;
}

export default async function WatchlistPage() {
    const supabase = await createClient()
    await supabase.auth.getUser()

    const watchlistItems = await getWatchlist() as WatchlistItem[] | null

    // Fetch market data for watchlist items
    const watchlistWithMarketData = await Promise.all(
        (watchlistItems || []).map(async (item: WatchlistItem) => {
            const marketData = await getMarketData(item.ticker)
            return { ...item, marketData }
        })
    )

    return (
        <div className="space-y-10">
            <Watchlist items={watchlistWithMarketData} />
        </div>
    )

}
