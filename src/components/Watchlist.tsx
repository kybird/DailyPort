
'use client'

import { useState } from 'react'
import { Trash2, Activity, PlusCircle, Search, Target, ShieldAlert, ArrowRightCircle } from 'lucide-react'
import { removeFromWatchlist, addToWatchlist } from '@/app/actions'
import { getStockName } from '@/utils/stockUtils'
import AnalysisPanel from './AnalysisPanel'
import StockSearch from './StockSearch'

interface WatchlistItem {
    id: string
    ticker: string
    short_entry?: number
    short_stop?: number
    short_target?: number
    mid_entry?: number
    mid_stop?: number
    mid_target?: number
    long_entry?: number
    long_stop?: number
    long_target?: number
    marketData?: {
        currentPrice: number
        changePrice: number
        changePercent: number
    }
}

export default function Watchlist({ items }: { items: WatchlistItem[] }) {
    const [removing, setRemoving] = useState<string | null>(null)
    const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null)
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    const handleRemove = async (ticker: string) => {
        if (!confirm('관심종목에서 삭제할까요?')) return
        setRemoving(ticker)
        await removeFromWatchlist(ticker)
        setRemoving(null)
    }

    const handleAddStock = async (stock: { ticker: string }) => {
        const res = await addToWatchlist(stock.ticker)
        if (res.error) alert(res.error)
        else setIsSearchOpen(false)
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
                                <div>
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
                            </div>

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

                            {/* Price Objectives Mini Table */}
                            <div className="space-y-2 border-t border-zinc-50 dark:border-zinc-800 pt-4">
                                <div className="grid grid-cols-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">
                                    <span>관점</span>
                                    <span className="text-center flex items-center justify-center gap-1"><ArrowRightCircle size={10} className="text-blue-500" />진입</span>
                                    <span className="text-center flex items-center justify-center gap-1"><ShieldAlert size={10} className="text-rose-500" />손절</span>
                                    <span className="text-center flex items-center justify-center gap-1"><Target size={10} className="text-emerald-500" />목표</span>
                                </div>

                                {[
                                    { label: '단기', entry: item.short_entry, stop: item.short_stop, target: item.short_target, color: 'text-zinc-500' },
                                    { label: '중기', entry: item.mid_entry, stop: item.mid_stop, target: item.mid_target, color: 'text-zinc-700 dark:text-zinc-300' },
                                    { label: '장기', entry: item.long_entry, stop: item.long_stop, target: item.long_target, color: 'text-zinc-900 dark:text-zinc-100' }
                                ].map((row) => (
                                    <div key={row.label} className="grid grid-cols-4 text-xs font-bold py-1 items-center border-b border-zinc-50/50 dark:border-zinc-800/50 last:border-0">
                                        <span className={`${row.color} font-black`}>{row.label}</span>
                                        <span className="text-center font-mono text-blue-600 dark:text-blue-400">{row.entry?.toLocaleString() || '-'}</span>
                                        <span className="text-center font-mono text-rose-500">{row.stop?.toLocaleString() || '-'}</span>
                                        <span className="text-center font-mono text-emerald-500">{row.target?.toLocaleString() || '-'}</span>
                                    </div>
                                ))}
                            </div>
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
