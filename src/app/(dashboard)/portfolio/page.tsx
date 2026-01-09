
import { createClient } from '@/utils/supabase/server'
import PortfolioList from '@/components/PortfolioList'
import { getPortfolio } from '@/app/actions'
import { getMarketData, MarketData } from '@/utils/market-data'
import { getPriceColor, formatChangeRate, formatChangePrice } from '@/utils/format-utils'

interface PortfolioItem {
    id: string;
    ticker: string;
    quantity: number;
    entry_price: number;
    realized_gain: number;
    target_weight: number;
    currency: string;
    marketData?: MarketData | null;
}

export default async function PortfolioPage() {
    const supabase = await createClient()
    await supabase.auth.getUser()

    const portfolioItems = await getPortfolio() as PortfolioItem[] | null

    // Fetch market data for all portfolio items
    const portfolioWithMarketData = await Promise.all(
        (portfolioItems || []).map(async (item: PortfolioItem) => {
            if (item.ticker === '_CASH_') {
                return {
                    ...item,
                    marketData: {
                        ticker: '_CASH_',
                        currentPrice: 1,
                        changePrice: 0,
                        changePercent: 0
                    } as MarketData
                }
            }
            const marketData = await getMarketData(item.ticker)
            return { ...item, marketData }
        })
    )

    /**
     * 총 평가금액 합계 계산
     * Sum(보유 수량 * 현재가)
     */
    const totalValuation = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        const price = item.marketData?.currentPrice || 0
        return sum + price * item.quantity
    }, 0)

    /**
     * 오늘의 변화량 합계 계산
     * Sum(보유 수량 * 전일 대비 등락액)
     */
    const totalChange = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        const change = item.marketData?.changePrice || 0
        return sum + change * item.quantity
    }, 0)

    /**
     * 현금 보유액 계산
     */
    const totalCash = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        if (item.ticker === '_CASH_') {
            return sum + item.quantity
        }
        return sum
    }, 0)

    const totalRealizedGain = portfolioWithMarketData.reduce((sum: number, item: PortfolioItem) => {
        return sum + (item.realized_gain || 0)
    }, 0)

    /**
     * 오늘의 변화율 (%) 계산
     * (현재 평가액 - 전일 평가액) / 전일 평가액 * 100
     * 전일 평가액 = 현재 평가액 - 오늘의 변화량
     */
    const changePercent = totalValuation > 0 ? (totalChange / (totalValuation - totalChange)) * 100 : 0

    return (
        <div className="space-y-10">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white">내 포트폴리오</h1>

            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
                    <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">총 평가금액</h3>
                    <p className="text-2xl font-black mt-2 text-zinc-900 dark:text-white">
                        ₩ {totalValuation.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">오늘의 변화</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-2xl font-black ${getPriceColor(totalChange)}`}>
                            {formatChangePrice(totalChange)}
                        </p>
                        <span className={`text-sm font-bold ${getPriceColor(totalChange)}`}>
                            ({formatChangeRate(changePercent)})
                        </span>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">확정 실현손익</h3>
                    <p className={`text-2xl font-black mt-2 ${getPriceColor(totalRealizedGain)}`}>
                        ₩ {totalRealizedGain.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">현금 보유액 (Cash)</h3>
                    <p className="text-2xl font-black mt-2 text-yellow-600 dark:text-yellow-400">
                        ₩ {totalCash.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Portfolio Section */}
            <div className="space-y-6">
                <PortfolioList items={portfolioWithMarketData || []} />
            </div>
        </div>
    )
}
