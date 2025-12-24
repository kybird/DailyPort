
'use client'

import { useState, useEffect } from 'react'


import { Activity, X, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Star, Target, Wallet, ArrowLeftRight, Trash2 } from 'lucide-react'
import { getAnalysis, AnalysisReport } from '@/app/actions_analysis'
import { getStockName } from '@/utils/stockUtils'
import { addToWatchlist, removeFromWatchlist, getWatchlist, sellTicker } from '@/app/actions'
import { getSettings } from '@/app/actions_settings'
import TransactionDialog from './TransactionDialog'

interface AnalysisPanelProps {
    ticker: string
    onClose: () => void
    mode?: 'watchlist' | 'portfolio'
    portfolioData?: {
        quantity: number
        entryPrice: number
    }
}

export default function AnalysisPanel({ ticker, onClose, mode = 'portfolio', portfolioData }: AnalysisPanelProps) {
    const [report, setReport] = useState<AnalysisReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isWatched, setIsWatched] = useState(false)
    const [watchingEffect, setWatchingEffect] = useState(false)
    const [hasTelegramSettings, setHasTelegramSettings] = useState(false)
    const [showTradeDialog, setShowTradeDialog] = useState(false)
    const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')

    // Fetch on mount
    // Fetch on mount
    useEffect(() => {
        let mounted = true
        const fetch = async () => {
            setLoading(true)
            const result = await getAnalysis(ticker)
            if (!mounted) return

            if ('error' in result) {
                setError(result.error)
            } else {
                setReport(result)
            }

            // Check if already in watchlist
            const watchlist = await getWatchlist()
            if (!mounted) return
            setIsWatched(watchlist?.some((item: any) => item.ticker === ticker) || false)

            // Check telegram settings
            const settings = await getSettings()
            if (!mounted) return
            if (settings.data?.telegram_bot_token && settings.data?.telegram_chat_id) {
                setHasTelegramSettings(true)
            }

            setLoading(false)
        }
        fetch()

        return () => { mounted = false }
    }, [ticker])


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

                        {/* Portfolio Status (Only in Portfolio mode) */}
                        {mode === 'portfolio' && portfolioData && (
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
                                    <Wallet size={14} className="text-blue-500" />
                                    Portfolio Status
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase">보유 수량</div>
                                        <div className="text-lg font-black text-zinc-900 dark:text-white">{portfolioData.quantity.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase">평균 단가</div>
                                        <div className="text-lg font-black text-zinc-900 dark:text-white">₩{portfolioData.entryPrice.toLocaleString()}</div>
                                    </div>
                                </div>

                                {portfolioData.quantity > 0 && (
                                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">평가 손익</div>
                                        {(() => {
                                            const profit = (report.price.current - portfolioData.entryPrice) * portfolioData.quantity
                                            const profitPercent = ((report.price.current / portfolioData.entryPrice) - 1) * 100
                                            return (
                                                <div className={`text-xl font-black ${profit >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                                    {profit >= 0 ? '+' : ''}{profit.toLocaleString()} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <button
                                        onClick={() => { setTradeType('BUY'); setShowTradeDialog(true); }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        <ArrowLeftRight size={16} /> 포트폴리오 조정
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm('전량 매도 처리하시겠습니까?')) {
                                                await sellTicker(ticker, portfolioData.quantity, report.price.current);
                                                onClose();
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-black text-white py-2.5 rounded-xl text-xs font-black transition-all active:scale-95"
                                    >
                                        <Trash2 size={14} /> 전량 매도하기
                                    </button>
                                </div>
                            </div>
                        )}

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

                        {/* 3.5. Suggested Objectives */}
                        {report.technical.objectives && (
                            <div className="bg-zinc-900 dark:bg-black p-5 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Target size={40} className="text-white" />
                                </div>
                                <h3 className="font-black !text-white mb-4 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    진입 참고가 (SUGGESTED)
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { label: '단기', data: report.technical.objectives.short, color: 'text-zinc-400' },
                                        { label: '중기', data: report.technical.objectives.mid, color: 'text-zinc-200' },
                                        { label: '장기', data: report.technical.objectives.long, color: 'text-blue-400' }
                                    ].map((group) => (
                                        <div key={group.label} className="grid grid-cols-1 gap-2">
                                            <div className={`text-[10px] font-black uppercase tracking-widest ${group.color}`}>{group.label}</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
                                                    <div className="text-[8px] font-bold text-zinc-500 uppercase">진입</div>
                                                    <div className="text-xs font-mono font-bold text-zinc-300">₩{group.data.entry.toLocaleString()}</div>
                                                </div>
                                                <div className="bg-rose-900/20 p-2 rounded-lg border border-rose-900/30">
                                                    <div className="text-[8px] font-bold text-rose-500 uppercase">손절</div>
                                                    <div className="text-xs font-mono font-bold text-rose-400">₩{group.data.stop.toLocaleString()}</div>
                                                </div>
                                                <div className="bg-emerald-900/20 p-2 rounded-lg border border-emerald-900/30">
                                                    <div className="text-[8px] font-bold text-emerald-500 uppercase">목표</div>
                                                    <div className="text-xs font-mono font-bold text-emerald-400">₩{group.data.target.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {mode === 'watchlist' && (
                                    <div className="mt-4 text-[10px] text-zinc-500 leading-relaxed">
                                        💡 본 가격은 투자 참고 자료일 뿐, 투자 권유가 아닙니다.
                                    </div>
                                )}
                            </div>
                        )}
                        {/* 4. Supply & Demand */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">수급 현황 (Supply & Demand)</h3>
                            {report.supplyDemand ? (
                                <div className="space-y-4">
                                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Foreign</span>
                                                    {report.supplyDemand.dataDate && (
                                                        <span className="text-[8px] text-zinc-400 font-mono">({report.supplyDemand.dataDate})</span>
                                                    )}
                                                </div>
                                                <span className={`font-mono font-black text-lg ${report.supplyDemand.foreignNetBuy > 0 ? 'text-rose-500' : report.supplyDemand.foreignNetBuy < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                                    {report.supplyDemand.foreignNetBuy > 0 ? '+' : ''}{report.supplyDemand.foreignNetBuy.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Institution</span>
                                                    {report.supplyDemand.dataDate && (
                                                        <span className="text-[8px] text-zinc-400 font-mono">({report.supplyDemand.dataDate})</span>
                                                    )}
                                                </div>
                                                <span className={`font-mono font-black text-lg ${report.supplyDemand.instNetBuy > 0 ? 'text-rose-500' : report.supplyDemand.instNetBuy < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                                    {report.supplyDemand.instNetBuy > 0 ? '+' : ''}{report.supplyDemand.instNetBuy.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {report.supplyDemand.metrics && (
                                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 gap-3">
                                                <div className="flex justify-between items-center bg-white dark:bg-zinc-900/50 p-2 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">외인 매집 (5/20)</span>
                                                    <span className={`text-xs font-mono font-bold ${report.supplyDemand.metrics.foreigner_5d_net > 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
                                                        {report.supplyDemand.metrics.foreigner_5d_net > 0 ? '▲' : '▼'} {Math.round(report.supplyDemand.metrics.foreigner_5d_net / 1000000)}M / {Math.round(report.supplyDemand.metrics.foreigner_20d_net / 1000000)}M
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white dark:bg-zinc-900/50 p-2 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">기관 매집 (5/20)</span>
                                                    <span className={`text-xs font-mono font-bold ${report.supplyDemand.metrics.institution_5d_net > 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
                                                        {report.supplyDemand.metrics.institution_5d_net > 0 ? '▲' : '▼'} {Math.round(report.supplyDemand.metrics.institution_5d_net / 1000000)}M / {Math.round(report.supplyDemand.metrics.institution_20d_net / 1000000)}M
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-[9px] text-right text-zinc-400 mt-2">
                                            Report Generated: {new Date(report.supplyDemand.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Mini Supply Trend Chart - Improved Layout */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">최근 15회 추세</span>
                                            <span className="text-[9px] text-zinc-400">(단위: M)</span>
                                        </div>
                                        <div className="h-28 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-end justify-center p-3 gap-1 overflow-hidden">
                                            {(report.supplyDemand.chartData || []).slice(-15).map((d: any, i: number) => {
                                                const f_h = Math.min(Math.abs(d.foreigner) / 200000, 100)
                                                const i_h = Math.min(Math.abs(d.institution) / 200000, 100)
                                                return (
                                                    <div key={i} className="flex-1 max-w-[12px] flex flex-col justify-end gap-[1px] h-full group relative cursor-help">
                                                        <div className={`w-full rounded-t-[1px] ${d.institution > 0 ? 'bg-rose-500' : 'bg-blue-500/20'}`} style={{ height: `${i_h}%` }} />
                                                        <div className={`w-full rounded-b-[1px] ${d.foreigner > 0 ? 'bg-sky-500' : 'bg-red-500/20'}`} style={{ height: `${f_h}%` }} />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[200] bg-zinc-900/95 backdrop-blur-sm text-white text-[9px] p-2 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none ring-1 ring-white/10">
                                                            <div className="font-bold border-b border-white/10 pb-1 mb-1">{d.date}</div>
                                                            <div className="text-sky-300 flex justify-between gap-4"><span>For:</span> <span>{Math.round(d.foreigner / 1000000)}M</span></div>
                                                            <div className="text-rose-300 flex justify-between gap-4"><span>Inst:</span> <span>{Math.round(d.institution / 1000000)}M</span></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                                </div>
                        ) : (
                        <div className="text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                            분석 데이터가 없습니다 (Admin Tool 미실행).
                        </div>
                            )}
                    </div>

                        {/* Disclaimer */}
                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-end mb-4">
                        <button
                            disabled={!hasTelegramSettings}
                            title={hasTelegramSettings ? "현재 분석 리포트를 텔레그램으로 전송합니다." : "마이페이지에서 텔레그램 설정을 완료해주세요."}
                            onClick={async () => {
                                if (!report || !hasTelegramSettings) return
                                const btn = document.getElementById('btn-telegram') as HTMLButtonElement
                                if (btn) btn.disabled = true;
                                if (btn) btn.innerHTML = 'Sending...';

                                const res = await import('@/app/actions_notification').then(m => m.sendAnalysisToTelegram(report))

                                if (res.success) alert('Sent to Telegram!')
                                else alert('Failed: ' + res.error)

                                if (btn) {
                                    btn.disabled = false;
                                    btn.innerHTML = '<span>✈️ Send to Telegram</span>';
                                }
                            }}
                            id="btn-telegram"
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <span>✈️ Send to Telegram</span>
                        </button>
                    </div>
                    <div className="flex gap-2 text-gray-500 dark:text-zinc-500 text-xs">
                        <AlertTriangle size={16} className="shrink-0" />
                        <p>
                            본 정보는 투자 참고 자료일 뿐, 투자 권유가 아닙니다. 투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다.
                            {mode === 'portfolio' && ' 데이터는 최소 15분 지연될 수 있습니다 (Yahoo Finance).'}
                        </p>
                    </div>
                </div>
            </div>
                )}

        </div>

            {
        showTradeDialog && (
            <TransactionDialog
                ticker={ticker}
                currentQuantity={portfolioData?.quantity || 0}
                onClose={() => setShowTradeDialog(false)}
                initialType={tradeType}
            />
        )
    }
        </div >
    )
}
