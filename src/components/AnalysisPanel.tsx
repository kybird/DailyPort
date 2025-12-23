
'use client'

import { useState } from 'react'

import { Activity, X, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Star } from 'lucide-react'
import { getAnalysis, AnalysisReport } from '@/app/actions_analysis'
import { getStockName } from '@/utils/stockUtils'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '@/app/actions'

interface AnalysisPanelProps {
    ticker: string
    onClose: () => void
}

export default function AnalysisPanel({ ticker, onClose }: AnalysisPanelProps) {
    const [report, setReport] = useState<AnalysisReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isWatched, setIsWatched] = useState(false)
    const [watchingEffect, setWatchingEffect] = useState(false)

    // Fetch on mount
    useState(() => {
        const fetch = async () => {
            setLoading(true)
            const result = await getAnalysis(ticker)
            if ('error' in result) {
                setError(result.error)
            } else {
                setReport(result)
            }

            // Check if already in watchlist
            const watchlist = await getWatchlist()
            setIsWatched(watchlist?.some((item: any) => item.ticker === ticker) || false)

            setLoading(false)
        }
        fetch()
    })

    const toggleWatchlist = async () => {
        setWatchingEffect(true)
        if (isWatched) {
            await removeFromWatchlist(ticker)
            setIsWatched(false)
        } else {
            await addToWatchlist(ticker)
            setIsWatched(true)
        }
        setWatchingEffect(false)
    }

    return (
        <div className="fixed inset-y-0 right-0 z-[150] w-full md:w-96 bg-white dark:bg-zinc-900 shadow-2xl animate-in slide-in-from-right duration-300 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto transition-colors">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Activity className="text-blue-600" />
                            {getStockName(ticker)}
                        </h2>
                        <button
                            onClick={toggleWatchlist}
                            disabled={watchingEffect}
                            className={`p-2 rounded-full transition-all ${isWatched ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            title={isWatched ? "관심종목에서 제거" : "관심종목에 추가"}
                        >
                            <Star size={18} fill={isWatched ? "currentColor" : "none"} />
                        </button>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        <X />
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <RefreshCw className="animate-spin mb-2" size={32} />
                        Analyzing Market Data...
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-md">
                        {error}
                    </div>
                )}

                {report && (
                    <div className="space-y-6">
                        {/* 1. Price Summary */}
                        <div className="flex items-end gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-3xl font-black text-zinc-900 dark:text-white">
                                {report.price.current.toLocaleString()}
                            </span>
                            <span className={`text-lg font-bold flex items-center ${report.price.changePercent >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                {report.price.changePercent > 0 ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                                {report.price.changePercent.toFixed(2)}%
                            </span>
                        </div>

                        {/* 2. AI/Rule Summary */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                            <h3 className="font-bold text-blue-800 dark:text-blue-400 text-xs uppercase tracking-wider mb-2">DailyPort Insight</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                                {report.summary}
                            </p>
                        </div>

                        {/* 3. Technical Indicators */}
                        <div>
                            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 mb-3 text-sm">기술 지표 (Technical)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">RSI (14)</div>
                                    <div className="font-black text-lg text-zinc-900 dark:text-white mt-1">
                                        {report.technical.rsi.value.toFixed(1)}
                                        <div className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full font-bold shadow-sm ${report.technical.rsi.status === 'OVERBOUGHT' ? 'bg-rose-500 text-white' :
                                            report.technical.rsi.status === 'OVERSOLD' ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                            }`}>
                                            {report.technical.rsi.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Trend (EMA)</div>
                                    <div className="font-black text-sm text-zinc-900 dark:text-white mt-2">
                                        {report.technical.trend.status}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Supply & Demand */}
                        <div>
                            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 mb-3 text-sm">수급 현황 (Supply & Demand)</h3>
                            {report.supplyDemand ? (
                                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">Foreign Net Buy</span>
                                        <span className={`font-mono font-black ${report.supplyDemand.foreignNetBuy > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                            {report.supplyDemand.foreignNetBuy.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">Inst. Net Buy</span>
                                        <span className={`font-mono font-black ${report.supplyDemand.instNetBuy > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                            {report.supplyDemand.instNetBuy.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-right text-zinc-500 mt-2 font-medium">
                                        Source: {report.supplyDemand.source} ({new Date(report.supplyDemand.updatedAt).toLocaleDateString()})
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                    데이터가 없습니다. 데이터 동기화를 진행해주세요.
                                </div>
                            )}
                        </div>

                        {/* Disclaimer */}
                        <div className="mt-8 pt-4 border-t border-gray-100">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={async () => {
                                        if (!report) return
                                        const btn = document.getElementById('btn-telegram') as HTMLButtonElement
                                        if (btn) btn.disabled = true;
                                        if (btn) btn.innerHTML = 'Sending...';

                                        const res = await import('@/app/actions_notification').then(m => m.sendAnalysisToTelegram(report))

                                        if (res.success) alert('Sent to Telegram!')
                                        else alert('Failed: ' + res.error)

                                        if (btn) btn.disabled = false;
                                        if (btn) btn.innerHTML = 'Send to Telegram';
                                    }}
                                    id="btn-telegram"
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
                                >
                                    <span>✈️ Send to Telegram</span>
                                </button>
                            </div>
                            <div className="flex gap-2 text-gray-500 text-xs">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>
                                    This report is for informational purposes only and does not constitute financial advice.
                                    Investment decisions are solely your responsibility.
                                    Data delayed by at least 15 minutes (Yahoo Finance).
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
