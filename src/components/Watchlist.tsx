
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Activity, PlusCircle, Search } from 'lucide-react'
import { removeFromWatchlist, addToWatchlist } from '@/app/actions'
import { getStockName } from '@/utils/stockUtils'
import StockSearch from './StockSearch'
import AnalysisPanel from './AnalysisPanel'


interface WatchlistItem {
    id: string
    ticker: string
    marketData?: {
        currentPrice: number
        changePrice: number
        changePercent: number
    }
}

export default function Watchlist({ items }: { items: WatchlistItem[] }) {
    const router = useRouter()
    const [removing, setRemoving] = useState<string | null>(null)
    const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null)
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    const handleRemove = async (ticker: string) => {
        if (!confirm('관심종목에서 삭제할까요?')) return
        setRemoving(ticker)
        await removeFromWatchlist(ticker)
        setRemoving(null)
        router.refresh()
    }

    const handleAddStock = async (stock: { ticker: string }) => {
        console.log('handleAddStock called with:', stock)
        const res = await addToWatchlist(stock.ticker)
        console.log('addToWatchlist response:', res)
        if (res.error) {
            console.error('Error adding to watchlist:', res.error)
            alert(res.error)
        }
        else {
            console.log('Successfully added to watchlist, closing search and refreshing')
            setIsSearchOpen(false)
            router.refresh()
        }
    }


    return (
        <section className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    관심 종목
                    <span className="text-sm font-bold text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{items.length}</span>
                </h2>
                <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <PlusCircle size={16} />
                    <span>추가</span>
                </button>
            </div>

            {isSearchOpen && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="max-w-md">
                        <h3 className="text-sm font-black text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                            <Search size={14} />
                            새로운 관심종목 찾기
                        </h3>
                        <StockSearch onSelect={handleAddStock} />
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                <div className="text-center py-16 text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 transition-colors">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-zinc-300" />
                    </div>
                    <p className="text-sm font-medium">관심 있는 종목을 추가해보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.ticker} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    {getStockName(item.ticker)}
                                    <button
                                        onClick={() => setAnalyzingTicker(item.ticker)}
                                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                                        title="분석하기"
                                    >
                                        <Activity size={16} />
                                    </button>
                                </div>
                                <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{item.ticker}</div>
                            </div>
                            <button
                                onClick={() => handleRemove(item.ticker)}
                                disabled={removing === item.ticker}
                                className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all disabled:opacity-30"
                            >
                                <Trash2 size={16} />
                            </button>


                            <div className="mb-6">
                                {item.marketData ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-zinc-900 dark:text-white">
                                            ₩ {item.marketData.currentPrice.toLocaleString()}
                                        </span>
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${item.marketData.changePrice > 0 ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : item.marketData.changePrice < 0 ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : 'bg-zinc-50 text-zinc-400'}`}>
                                            {item.marketData.changePrice > 0 ? '▲' : item.marketData.changePrice < 0 ? '▼' : ''} {item.marketData.changePercent.toFixed(2)}%
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-8 bg-zinc-50 dark:bg-zinc-800 animate-pulse rounded-lg w-32" />
                                )}
                            </div>
                        </div>
                    ))
                    }
                </div>
            )}

            {analyzingTicker && (
                <AnalysisPanel
                    ticker={analyzingTicker}
                    onClose={() => setAnalyzingTicker(null)}
                    mode="watchlist"
                />
            )}
        </section>
    )
}

