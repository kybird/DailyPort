import { getAnalysis } from '@/app/actions_analysis'
import Link from 'next/link'
import { ArrowLeft, Activity, RefreshCw, BarChart3, TrendingUp, TrendingDown, Target, Wallet, ShieldAlert, ArrowRightCircle } from 'lucide-react'
import DailyPriceChart from '@/components/DailyPriceChart'
import { formatKoreanUnit } from '@/utils/formatUtils'

export default async function AnalysisPage({
    params,
    searchParams
}: {
    params: Promise<{ ticker: string }>,
    searchParams: Promise<{ ref?: string }>
}) {
    const { ticker: tickerParam } = await params
    const { ref } = await searchParams
    const report = await getAnalysis(tickerParam)

    const backPath = ref === 'algo' ? '/algo-picks' : '/dashboard'
    const backLabel = ref === 'algo' ? 'Back to Algo Picks' : 'Back to Dashboard'

    if ('error' in report) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Activity size={32} />
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                            분석 리포트 없음
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            현재 <b>{tickerParam}</b>에 대한 관리자 분석 리포트가 업로드되지 않았습니다.<br />
                            <span className="text-sm mt-2 block">
                                ※ 상세 리포트와 수급 데이터는 <b>관심종목(Watchlist)</b>에 등록된 종목에 대해 Admin Tool이 매일 아침 생성합니다.
                            </span>
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/dashboard"
                            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            대시보드로
                        </Link>
                        <a
                            href={`/analysis/${tickerParam}`}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            새로고침
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    const { price, technical, supplyDemand, fundamentals, portfolio, summary, generatedAt, name, historical } = report

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Top Navigation & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Link href={backPath} className="inline-flex items-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">{backLabel}</span>
                </Link>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Live Market Data Sync
                </div>
            </div>

            {/* Header Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md">Ticker: {report.ticker}</span>
                            {fundamentals?.market_cap && (
                                <span className="text-xs font-bold text-zinc-400">시가총액 {formatKoreanUnit(fundamentals.market_cap)}</span>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
                            {name || report.ticker}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
                            분석 갱신: {generatedAt ? new Date(generatedAt).toLocaleString() : 'Just now'}
                        </p>
                    </div>

                    <div className="text-left md:text-right space-y-1">
                        <div className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            ₩{price.current?.toLocaleString() || '-'}
                        </div>
                        <div className={`text-lg font-black flex items-center md:justify-end ${price.changePercent > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                            {price.changePercent > 0 ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                            {price.changePercent > 0 ? '+' : ''}{price.changePercent?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: AI Insight & Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* AI Insight Card */}
                    <div className="bg-zinc-900 dark:bg-black rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                            <Activity size={120} />
                        </div>
                        <div className="relative space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Activity size={18} />
                                </div>
                                <h2 className="text-lg font-black tracking-tight uppercase">DailyPort Insight</h2>
                            </div>
                            <p className="text-xl md:text-2xl font-bold leading-snug break-keep text-zinc-100">
                                {summary || "분석 데이터를 불러오는 중입니다."}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-white/10">Technical Score: {technical.trend.status}</span>
                                {technical.rsi.status !== 'NEUTRAL' && (
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${technical.rsi.status === 'OVERBOUGHT' ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-blue-500/20 border-blue-500/50 text-blue-300'}`}>
                                        RSI {technical.rsi.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Technical Chart */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        {historical && historical.length > 0 ? (
                            <DailyPriceChart data={historical} />
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-4">
                                <BarChart3 size={48} className="opacity-20" />
                                <p className="font-bold text-sm">주가 히스토리 데이터를 불러오는 중입니다.</p>
                            </div>
                        )}
                    </div>

                    {/* Fundamentals & Technical Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fundamentals */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert size={14} className="text-blue-500" />
                                Fundamental Ratios
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase">PER</div>
                                    <div className="text-lg font-black text-zinc-900 dark:text-white">{fundamentals?.per?.toFixed(2) || 'N/A'} <span className="text-xs font-medium text-zinc-400 ml-1">배</span></div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase">PBR</div>
                                    <div className="text-lg font-black text-zinc-900 dark:text-white">{fundamentals?.pbr?.toFixed(2) || 'N/A'} <span className="text-xs font-medium text-zinc-400 ml-1">배</span></div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-zinc-50 dark:border-zinc-800">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase">Valuation Insight</div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                    {(fundamentals?.per || 0) < 10 && (fundamentals?.per || 0) > 0 ? '업종 평균 대비 저평가 국면일 수 있습니다.' : (fundamentals?.per || 0) > 30 ? '성장성이 높게 평가되거나 고평가 우려가 있습니다.' : '시장 평균 수준의 밸류에이션을 보여줍니다.'}
                                </p>
                            </div>
                        </div>

                        {/* Technical Details */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Target size={14} className="text-emerald-500" />
                                Market Position
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Relative Strength (RSI)</span>
                                    <span className="text-sm font-black text-zinc-900 dark:text-white">{technical.rsi.value.toFixed(1)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-blue-500/20" style={{ width: '30%' }} />
                                    <div className="h-full bg-zinc-400/10" style={{ width: '40%' }} />
                                    <div className="h-full bg-rose-500/20" style={{ width: '30%' }} />
                                    {/* Indicator dot */}
                                    <div className="absolute h-3 w-1.5 bg-zinc-900 dark:bg-white -translate-y-0.75 rounded-full shadow-md" style={{ left: `${technical.rsi.value}%` }} />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Trend Status</div>
                                        <div className={`text-sm font-black ${technical.trend.status.includes('UP') || technical.trend.status.includes('GOLDEN') ? 'text-rose-500' : 'text-blue-500'}`}>{technical.trend.status}</div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase">MA(5) vs MA(20)</div>
                                        <div className="text-sm font-black text-zinc-900 dark:text-white whitespace-nowrap">₩{technical.movingAverages?.ma5?.toLocaleString() || '-'} / ₩{technical.movingAverages?.ma20?.toLocaleString() || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Portfolio, Supply, Objectives */}
                <div className="space-y-8">
                    {/* 1. Portfolio Status (If owned) */}
                    {portfolio && (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-100 mb-6">
                                <Wallet size={14} /> My Portfolio Status
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Holdings</div>
                                    <div className="text-lg font-black">{portfolio.quantity.toLocaleString()} <span className="text-xs font-medium opacity-70">shares</span></div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Average Price</div>
                                    <div className="text-lg font-black">₩{portfolio.entryPrice.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/10">
                                <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Total P&L</div>
                                {(() => {
                                    const profit = (price.current - portfolio.entryPrice) * portfolio.quantity
                                    const profitPercent = ((price.current / portfolio.entryPrice) - 1) * 100
                                    return (
                                        <div className="text-3xl font-black flex items-baseline gap-2">
                                            {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                                            <span className={`text-base font-bold ${profitPercent >= 0 ? 'text-rose-300' : 'text-blue-300'}`}>
                                                ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                                            </span>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 2. Suggested Objectives */}
                    {technical.objectives && (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <ArrowRightCircle size={16} className="text-blue-500" />
                                Trading Objectives (Suggested)
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { label: '단기 (Short-term)', data: technical.objectives.short, color: 'text-zinc-500' },
                                    { label: '중기 (Mid-term)', data: technical.objectives.mid, color: 'text-zinc-900 dark:text-zinc-100' },
                                    { label: '장기 (Long-term)', data: technical.objectives.long, color: 'text-blue-600' }
                                ].map((group) => (
                                    <div key={group.label} className="space-y-3">
                                        <div className={`text-[10px] font-black uppercase tracking-wider ${group.color}`}>{group.label}</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                <div className="text-[8px] font-black text-zinc-400 uppercase">진입</div>
                                                <div className="text-[11px] font-mono font-black text-zinc-900 dark:text-white">₩{group.data.entry.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-100 dark:border-rose-900/30">
                                                <div className="text-[8px] font-black text-rose-400 uppercase">손절</div>
                                                <div className="text-[11px] font-mono font-black text-rose-500">₩{group.data.stop.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                <div className="text-[8px] font-black text-emerald-400 uppercase">목표</div>
                                                <div className="text-[11px] font-mono font-black text-emerald-500">₩{group.data.target.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Detailed Supply & Demand Histograph */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={16} className="text-blue-500" />
                                Accumulation Trend
                            </h3>
                        </div>

                        {supplyDemand ? (
                            <div className="space-y-6">
                                {/* Accumulation Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">외인 매집(20일)</div>
                                        <div className={`text-sm font-mono font-black ${supplyDemand.metrics?.foreigner_20d_net! > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                            {supplyDemand.metrics?.foreigner_20d_net! > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand.metrics?.foreigner_20d_net!)}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">기관 매집(20일)</div>
                                        <div className={`text-sm font-mono font-black ${supplyDemand.metrics?.institution_20d_net! > 0 ? 'text-amber-500' : 'text-indigo-500'}`}>
                                            {supplyDemand.metrics?.institution_20d_net! > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand.metrics?.institution_20d_net!)}
                                        </div>
                                    </div>
                                </div>

                                {/* Zero-line Histogram */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Recent 20 Trading Days</span>
                                        <span className="text-[9px] text-zinc-400">단위: {supplyDemand.foreignNetBuy >= 1_000_000_000_000 ? '조' : '억'}</span>
                                    </div>
                                    <div className="h-44 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 relative p-4 flex items-center justify-center gap-2">
                                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-200 dark:bg-zinc-800 z-0" />
                                        {(() => {
                                            const visibleData = (supplyDemand.chartData || []).slice(-20)
                                            const maxVal = Math.max(
                                                ...visibleData.map((d) => Math.max(Math.abs(d.foreigner), Math.abs(d.institution))),
                                                100_000_000
                                            )
                                            return visibleData.map((d, i: number) => {
                                                const f_h = (Math.abs(d.foreigner) / maxVal) * 50
                                                const i_h = (Math.abs(d.institution) / maxVal) * 50
                                                return (
                                                    <div key={i} className="flex-1 max-w-[12px] h-full relative group">
                                                        <div className={`absolute left-0 w-[45%] rounded-sm transition-all z-10 ${d.foreigner > 0 ? 'bg-rose-500' : d.foreigner < 0 ? 'bg-blue-500' : 'bg-transparent'}`}
                                                            style={{ height: `${Math.max(1, f_h)}%`, bottom: d.foreigner >= 0 ? '50%' : 'auto', top: d.foreigner < 0 ? '50%' : 'auto' }} />
                                                        <div className={`absolute right-0 w-[45%] rounded-sm transition-all z-10 ${d.institution > 0 ? 'bg-amber-500' : d.institution < 0 ? 'bg-indigo-500' : 'bg-transparent'}`}
                                                            style={{ height: `${Math.max(1, i_h)}%`, bottom: d.institution >= 0 ? '50%' : 'auto', top: d.institution < 0 ? '50%' : 'auto' }} />
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                    <div className="flex justify-between items-center px-1 text-[8px] text-zinc-400">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 외인</div>
                                            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> 기관</div>
                                        </div>
                                        <span>Buy / Sell Trend</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-center font-medium">
                                수급 분석 리포트가 아직 준비되지 않았습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
