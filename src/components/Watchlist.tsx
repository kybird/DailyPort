
'use client'

import { useState } from 'react'
import { Trash2, Activity, PlusCircle } from 'lucide-react'
import { removeFromWatchlist } from '@/app/actions'
import { getStockName } from '@/utils/stockUtils'
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
    const [removing, setRemoving] = useState<string | null>(null)
    const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null)

    const handleRemove = async (ticker: string) => {
        if (!confirm('관심종목에서 삭제할까요?')) return
        setRemoving(ticker)
        await removeFromWatchlist(ticker)
        setRemoving(null)
    }

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">관심 종목</h2>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors">
                    <p className="text-sm">관심 있는 종목을 추가해보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <div key={item.ticker} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        {getStockName(item.ticker)}
                                        <button
                                            onClick={() => setAnalyzingTicker(item.ticker)}
                                            className="text-blue-500 hover:text-blue-700 transition-colors" title="분속하기">
                                            <Activity size={14} />
                                        </button>
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500">{item.ticker}</div>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.ticker)}
                                    disabled={removing === item.ticker}
                                    className="text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {item.marketData ? (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-black text-zinc-900 dark:text-white">
                                        ₩ {item.marketData.currentPrice.toLocaleString()}
                                    </span>
                                    <span className={`text-xs font-bold ${item.marketData.changePrice > 0 ? 'text-red-500' : item.marketData.changePrice < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                        {item.marketData.changePrice > 0 ? '+' : ''}{item.marketData.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-400 animate-pulse">Loading price...</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {analyzingTicker && (
                <AnalysisPanel
                    ticker={analyzingTicker}
                    onClose={() => setAnalyzingTicker(null)}
                />
            )}
        </section>
    )
}
