
'use client'

import { useState, useEffect } from 'react'


import { Activity, X, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Star, Target, Wallet, ArrowLeftRight, Trash2 } from 'lucide-react'
import { getAnalysis, AnalysisReport, SupplyChartItem } from '@/app/actions-analysis'
import { getStockName } from '@/utils/stock-utils'
import { addToWatchlist, removeFromWatchlist, getWatchlist, sellTicker } from '@/app/actions'
import { getSettings } from '@/app/actions-settings'
import { formatKoreanUnit } from '@/utils/format-utils'
import TransactionDialog from './TransactionDialog'

interface WatchlistItem {
    ticker: string;
}



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

    // Fetch on mount and when ticker changes
    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            setError('') // Clear previous errors

            const analysisResult = await getAnalysis(ticker)
            if ('error' in analysisResult) {
                setError(analysisResult.error)
                setReport(null)
            } else {
                setReport(analysisResult)
            }

            // Check if already in watchlist
            const watchlist = await getWatchlist()
            setIsWatched(watchlist?.some((item: WatchlistItem) => item.ticker === ticker) || false)

            // Check telegram settings
            const settings = await getSettings()
            if (settings.data?.telegram_bot_token && settings.data?.telegram_chat_id) {
                setHasTelegramSettings(true)
            } else {
                setHasTelegramSettings(false)
            }

            setLoading(false)
        }
        fetch()
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
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center space-y-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                            <RefreshCw className="text-blue-600 dark:text-blue-400 animate-spin" size={24} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-sm font-bold text-blue-900 dark:text-blue-100">분석 자료 준비 중</div>
                            <div className="text-xs text-blue-600 dark:text-blue-300">내일 아침 업데이트 예정입니다</div>
                        </div>
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
                            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 mb-3 text-sm">기술 지표</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-stone-200 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">RSI</div>
                                    <div className="font-black text-lg text-zinc-900 dark:text-white mt-1">
                                        {report.technical.rsi.value.toFixed(1)}
                                        <div className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full font-bold shadow-sm ${report.technical.rsi.status === 'OVERBOUGHT' ? 'bg-rose-500 text-white' :
                                            report.technical.rsi.status === 'OVERSOLD' ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                            }`}>
                                            {report.technical.rsi.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-stone-200 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">추세</div>
                                    <div className="font-black text-sm text-zinc-900 dark:text-white mt-2">
                                        {report.technical.trend.status}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3.5. Calculated Objectives V3 */}
                        {report.technical.objectives && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6 shadow-xl">
                                {[
                                    { label: '단기 매매', data: report.technical.objectives.short, color: 'text-zinc-400' },
                                    { label: '중기 스윙', data: report.technical.objectives.mid, color: 'text-zinc-600' },
                                    { label: '장기 투자', data: report.technical.objectives.long, color: 'text-blue-500' }
                                ].map((group) => {
                                    if (!group.data) return null;

                                    const statusColor = group.data.status === 'ACTIVE' ? 'bg-emerald-500' :
                                        group.data.status === 'WAIT' ? 'bg-amber-500' : 'bg-zinc-600';

                                    return (
                                        <div key={group.label} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className={`text-[10px] font-black uppercase tracking-wider ${group.color}`}>{group.label}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white ${statusColor}`}>
                                                            {group.data.status}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-zinc-500">{group.data.strategy}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                                                    {group.data.confidenceFlags.map(flag => (
                                                        <span
                                                            key={flag}
                                                            className={`px-1 py-0.5 rounded-[4px] text-[7px] font-bold border ${flag.includes('UPTREND') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                flag.includes('BROKEN') ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                                                    flag.includes('WEAK') ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                        'bg-white/5 border-white/10 text-zinc-400'
                                                                }`}
                                                        >
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Score Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-500 uppercase">
                                                    <span>Confidence</span>
                                                    <span>{group.data.score}/100</span>
                                                </div>
                                                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${statusColor}`}
                                                        style={{ width: `${group.data.score}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {group.data.status === 'ACTIVE' ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-zinc-800/30 p-2 rounded-xl border border-zinc-800 text-center">
                                                        <div className="text-[7px] font-black text-zinc-500 uppercase mb-0.5">진입</div>
                                                        <div className="text-[10px] font-mono font-black text-zinc-100">₩{group.data.entry?.toLocaleString()}</div>
                                                    </div>
                                                    <div className="bg-rose-950/20 p-2 rounded-xl border border-rose-900/30 text-center">
                                                        <div className="text-[7px] font-black text-rose-400 uppercase mb-0.5">손절</div>
                                                        <div className="text-[10px] font-mono font-black text-rose-500">₩{group.data.stop?.toLocaleString()}</div>
                                                    </div>
                                                    <div className="bg-emerald-950/20 p-2 rounded-xl border border-emerald-900/30 text-center">
                                                        <div className="text-[7px] font-black text-emerald-400 uppercase mb-0.5">목표</div>
                                                        <div className="text-[10px] font-mono font-black text-emerald-500">₩{group.data.target?.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`p-3 rounded-xl border border-dashed ${group.data.status === 'WAIT' ? 'bg-amber-950/10 border-amber-900/30' : 'bg-zinc-800/30 border-zinc-700/50'
                                                    }`}>
                                                    <div className={`text-[9px] font-bold italic flex items-center gap-2 ${group.data.status === 'WAIT' ? 'text-amber-400' : 'text-zinc-500'
                                                        }`}>
                                                        <Target size={12} className={group.data.status === 'WAIT' ? 'text-amber-500' : 'text-zinc-600'} />
                                                        {group.data.reason}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* 4. Supply & Demand */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">수급 현황</h3>
                            {report.supplyDemand ? (
                                <div className="space-y-4">
                                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter">외국인 (오늘)</span>
                                                        {report.supplyDemand.dataDate && (
                                                            <span className="text-[8px] text-zinc-400 font-mono">[{report.supplyDemand.dataDate}]</span>
                                                        )}
                                                    </div>
                                                    <div className={`font-mono font-black text-lg leading-none ${report.supplyDemand.foreignNetBuy > 0 ? 'text-rose-500' : report.supplyDemand.foreignNetBuy < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                                        {report.supplyDemand.foreignNetBuy > 0 ? '+' : ''}{formatKoreanUnit(report.supplyDemand.foreignNetBuy)}
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">KRW</div>
                                            </div>
                                            <div className="flex justify-between items-end border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter">기관 (오늘)</span>
                                                        {report.supplyDemand.dataDate && (
                                                            <span className="text-[8px] text-zinc-400 font-mono">[{report.supplyDemand.dataDate}]</span>
                                                        )}
                                                    </div>
                                                    <div className={`font-mono font-black text-lg leading-none ${report.supplyDemand.instNetBuy > 0 ? 'text-rose-500' : report.supplyDemand.instNetBuy < 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                                        {report.supplyDemand.instNetBuy > 0 ? '+' : ''}{formatKoreanUnit(report.supplyDemand.instNetBuy)}
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">KRW</div>
                                            </div>
                                        </div>

                                        {report.supplyDemand.metrics && (
                                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 gap-3">
                                                <div className="flex justify-between items-center bg-white dark:bg-zinc-900/50 p-2 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800 group relative border-l-4 border-rose-500">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">외인 매집 (5일/20일)</span>
                                                    <span className={`text-xs font-mono font-bold ${report.supplyDemand.metrics.foreigner_5d_net > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                                        {report.supplyDemand.metrics.foreigner_5d_net > 0 ? '▲' : '▼'} {formatKoreanUnit(report.supplyDemand.metrics.foreigner_5d_net)} / {formatKoreanUnit(report.supplyDemand.metrics.foreigner_20d_net)}
                                                    </span>
                                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-[210] bg-zinc-800 text-white text-[9px] p-2 rounded shadow-lg whitespace-nowrap">
                                                        최근 5거래일 및 20거래일 누적 순매수 대금
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center bg-white dark:bg-zinc-900/50 p-2 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800 group relative border-l-4 border-amber-500">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">기관 매집 (5일/20일)</span>
                                                    <span className={`text-xs font-mono font-bold ${report.supplyDemand.metrics.institution_5d_net > 0 ? 'text-amber-500' : 'text-indigo-500'}`}>
                                                        {report.supplyDemand.metrics.institution_5d_net > 0 ? '▲' : '▼'} {formatKoreanUnit(report.supplyDemand.metrics.institution_5d_net)} / {formatKoreanUnit(report.supplyDemand.metrics.institution_20d_net)}
                                                    </span>
                                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-[210] bg-zinc-800 text-white text-[9px] p-2 rounded shadow-lg whitespace-nowrap">
                                                        최근 5거래일 및 20거래일 누적 순매수 대금
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-[9px] text-right text-zinc-400 mt-2">
                                            Report Generated: {new Date(report.supplyDemand.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Mini Supply Trend Chart - Bar Chart with Zero Line */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">최근 수급 추세 (Buy/Sell)</span>
                                            <span className="text-[9px] text-zinc-400">단위: {report.supplyDemand!.foreignNetBuy >= 1_000_000_000_000 ? '조' : '억'}</span>
                                        </div>
                                        <div className="h-40 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 relative p-3 flex items-center justify-center gap-1.5">
                                            {/* Zero Line */}
                                            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-200 dark:bg-zinc-800 z-0" />

                                            {(() => {
                                                const visibleData = (report.supplyDemand!.chartData || []).slice(-20)
                                                if (visibleData.length === 0) return null

                                                const maxVal = Math.max(
                                                    ...visibleData.map((d: SupplyChartItem) => Math.max(Math.abs(d.foreigner), Math.abs(d.institution))),
                                                    100_000_000 // floor to 1억
                                                )

                                                return (
                                                    <>
                                                        {/* Scale Labels */}
                                                        <div className="absolute left-1 top-1 text-[8px] font-mono text-zinc-400 z-10">{formatKoreanUnit(maxVal)}</div>
                                                        <div className="absolute left-1 bottom-1 text-[8px] font-mono text-zinc-400 z-10">-{formatKoreanUnit(maxVal)}</div>
                                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-zinc-300 z-10">0</div>

                                                        {visibleData.map((d: SupplyChartItem, i: number) => {
                                                            const f_h = (Math.abs(d.foreigner) / maxVal) * 50
                                                            const i_h = (Math.abs(d.institution) / maxVal) * 50

                                                            return (
                                                                <div key={i} className="flex-1 max-w-[14px] h-full relative group cursor-help">
                                                                    {/* Foreigner Bar (Left half of slot) - Rose/Blue */}
                                                                    <div
                                                                        className={`absolute left-0 w-[45%] rounded-sm shadow-sm transition-all z-10 ${d.foreigner > 0 ? 'bg-rose-500' : d.foreigner < 0 ? 'bg-blue-500' : 'bg-transparent'}`}
                                                                        style={{
                                                                            height: `${Math.max(1, f_h)}%`,
                                                                            bottom: d.foreigner >= 0 ? '50%' : 'auto',
                                                                            top: d.foreigner < 0 ? '50%' : 'auto'
                                                                        }}
                                                                    />
                                                                    {/* Institution Bar (Right half of slot) - Amber/Indigo */}
                                                                    <div
                                                                        className={`absolute right-0 w-[45%] rounded-sm shadow-sm transition-all z-10 ${d.institution > 0 ? 'bg-amber-500' : d.institution < 0 ? 'bg-indigo-500' : 'bg-transparent'}`}
                                                                        style={{
                                                                            height: `${Math.max(1, i_h)}%`,
                                                                            bottom: d.institution >= 0 ? '50%' : 'auto',
                                                                            top: d.institution < 0 ? '50%' : 'auto'
                                                                        }}
                                                                    />

                                                                    {/* Tooltip - Fixed at top to avoid clipping */}
                                                                    <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 hidden group-hover:block z-[300] bg-zinc-900/95 backdrop-blur-sm text-white text-[9px] p-2 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none ring-1 ring-white/10">
                                                                        <div className="font-bold border-b border-white/10 pb-1 mb-1">{d.date}</div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="text-zinc-300 flex justify-between gap-4">
                                                                                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 외인:</span>
                                                                                <span className={d.foreigner > 0 ? 'text-rose-400' : 'text-blue-400'}>{formatKoreanUnit(d.foreigner)}</span>
                                                                            </div>
                                                                            <div className="text-zinc-300 flex justify-between gap-4">
                                                                                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> 기관:</span>
                                                                                <span className={d.institution > 0 ? 'text-amber-400' : 'text-indigo-400'}>{formatKoreanUnit(d.institution)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </>
                                                )
                                            })()}
                                        </div>
                                        <div className="flex justify-between items-center px-1 text-[8px] text-zinc-400">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 외인 매수</div>
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> 외인 매도</div>
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> 기관 매수</div>
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 기관 매도</div>
                                            </div>
                                            <span className="shrink-0">과거 20거래일</span>
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

                                        const res = await import('@/app/actions-notification').then(m => m.sendAnalysisToTelegram(report))

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
