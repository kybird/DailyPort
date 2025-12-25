import { getAnalysis } from '@/app/actions_analysis'
import Link from 'next/link'
import { ArrowLeft, Activity, RefreshCw, TrendingUp, TrendingDown, Target, Wallet, ShieldAlert, ArrowRightCircle, AlertTriangle } from 'lucide-react'
import CompositeStockChart from '@/components/CompositeStockChart'
import { formatKoreanUnit } from '@/utils/formatUtils'
import { getStockName } from '@/utils/stockUtils'

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
    const backLabel = ref === 'algo' ? (ref === 'algo' ? 'Algo Picks' : 'Dashboard') : 'Dashboard'

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
                            href={backPath}
                            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-center"
                        >
                            {backLabel}로 이동
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

    const { price, technical, supplyDemand, fundamentals, portfolio, summary, generatedAt, name: reportName, historical } = report

    // Prioritize local stock name if available, then report name, then ticker
    const displayName = getStockName(tickerParam) || reportName || tickerParam

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700">
            {/* Top Navigation & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Link href={backPath} className="inline-flex items-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">Back to {backLabel}</span>
                </Link>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Live Analysis Sync Active
                </div>
            </div>

            {/* Header Section - Priority on Stock Name */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-3xl rounded-full -mr-40 -mt-40" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900 dark:text-white">
                                {displayName}
                            </h1>
                            <span className="text-xs font-black px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-700">{tickerParam}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
                            {fundamentals?.market_cap && (
                                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                    시가총액 {formatKoreanUnit(fundamentals.market_cap)}
                                </span>
                            )}
                            <span className="opacity-50">갱신: {generatedAt ? new Date(generatedAt).toLocaleString() : 'Just now'}</span>
                        </div>
                    </div>

                    <div className="text-left md:text-right space-y-1">
                        <div className="text-5xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            ₩{price.current?.toLocaleString() || '-'}
                        </div>
                        <div className={`text-xl font-black flex items-center md:justify-end ${price.changePercent > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                            {price.changePercent > 0 ? <TrendingUp size={24} className="mr-2" /> : <TrendingDown size={24} className="mr-2" />}
                            {price.changePercent > 0 ? '+' : ''}{price.changePercent?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Main Focus: Enlarged Composite Chart */}
            <div className="w-full">
                <CompositeStockChart
                    priceData={historical || []}
                    supplyData={supplyDemand?.chartData}
                />
            </div>

            {/* 2. Insight & Secondary Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* AI Insight Card - Spans 3 columns in large layout */}
                <div className="lg:col-span-3 bg-zinc-900 dark:bg-black rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                        <Activity size={180} />
                    </div>
                    <div className="relative space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Activity size={22} />
                            </div>
                            <h2 className="text-lg font-black tracking-widest uppercase text-blue-400">DailyPort Expert Insight</h2>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold leading-tight break-keep text-zinc-100">
                            {summary || "분석 데이터를 불러오는 중입니다."}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                            <span className="px-4 py-2 bg-white/5 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-400 border border-white/10">Trend Status: {technical.trend.status}</span>
                            {technical.rsi.status !== 'NEUTRAL' && (
                                <span className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border ${technical.rsi.status === 'OVERBOUGHT' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                    RSI Index {technical.rsi.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Portfolio Status (if owned) */}
                <div className="lg:col-span-1">
                    {portfolio ? (
                        <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-100">
                                    <Wallet size={16} /> Portfolio Position
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-4">
                                    <div>
                                        <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Holdings</div>
                                        <div className="text-2xl font-black">{portfolio.quantity.toLocaleString()} <span className="text-sm opacity-60">주</span></div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Avg Price</div>
                                        <div className="text-2xl font-black">₩{portfolio.entryPrice.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-white/10 mt-6">
                                <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Total P&L Result</div>
                                {(() => {
                                    const profit = (price.current - portfolio.entryPrice) * portfolio.quantity
                                    const profitPercent = ((price.current / portfolio.entryPrice) - 1) * 100
                                    return (
                                        <div className="text-3xl font-black flex flex-col">
                                            <span>{profit >= 0 ? '+' : ''}{profit.toLocaleString()}</span>
                                            <span className={`text-base font-bold ${profitPercent >= 0 ? 'text-rose-300' : 'text-blue-300'}`}>
                                                ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                                            </span>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 text-zinc-400">
                            <Wallet size={40} className="opacity-20" />
                            <p className="text-xs font-bold leading-relaxed px-4">
                                현재 포트폴리오에 등록되지 않은 종목입니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Detailed Data Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Trading Objectives (Suggested) */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                        <ArrowRightCircle size={18} className="text-blue-500" />
                        Trading Objectives
                    </h3>
                    {technical.objectives ? (
                        <div className="space-y-8">
                            {technical.objectives.isAbnormal && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                        변동성 과다로 인해 표준 ATR 전략 대신 보수적 예외 전략(-5% 손절)이 적용되었습니다. 투자 시 유의 바랍니다.
                                    </div>
                                </div>
                            )}
                            {[
                                { label: 'Short-term (단기)', data: technical.objectives.short, color: 'text-zinc-500' },
                                { label: 'Mid-term (중기)', data: technical.objectives.mid, color: 'text-zinc-900 dark:text-zinc-100' },
                                { label: 'Long-term (장기)', data: technical.objectives.long, color: 'text-blue-600 font-black' }
                            ].map((group) => (
                                <div key={group.label} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`text-[11px] font-black uppercase tracking-wider ${group.color}`}>{group.label}</div>
                                        <div className="flex gap-1">
                                            {group.data.confidenceFlags.map(flag => (
                                                <span
                                                    key={flag}
                                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${flag.includes('UPTREND') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                            flag.includes('BROKEN') ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                                                flag.includes('WEAK') ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                    'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                                        }`}
                                                >
                                                    {flag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {group.data.status === 'ACTIVE' ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                                <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">진입</div>
                                                <div className="text-[12px] font-mono font-black text-zinc-900 dark:text-white">₩{group.data.entry?.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center">
                                                <div className="text-[8px] font-black text-rose-400 uppercase mb-1">손절</div>
                                                <div className="text-[12px] font-mono font-black text-rose-500">₩{group.data.stop?.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                                                <div className="text-[8px] font-black text-emerald-400 uppercase mb-1">목표</div>
                                                <div className="text-[12px] font-mono font-black text-emerald-500">₩{group.data.target?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                                            <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 italic flex items-center gap-2">
                                                <ShieldAlert size={14} className="text-zinc-400" />
                                                {group.data.reason || "관망(WAIT) 구간입니다."}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-medium">데이터 로딩 중...</div>
                    )}
                </div>

                {/* Accumulation & Data Scales */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                        <TrendingUp size={18} className="text-amber-500" />
                        Relative Strength & Accumulation
                    </h3>

                    <div className="space-y-8">
                        {/* Numerical Supply Metrics (Explicit scale requested) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div className="text-[10px] text-zinc-400 font-bold uppercase mb-2">외인 순매수(20일)</div>
                                <div className={`text-xl font-mono font-black ${supplyDemand?.metrics?.foreigner_20d_net! > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                    {supplyDemand?.metrics?.foreigner_20d_net! > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.foreigner_20d_net! || 0)}
                                </div>
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div className="text-[10px] text-zinc-400 font-bold uppercase mb-2">기관 순매수(20일)</div>
                                <div className={`text-xl font-mono font-black ${supplyDemand?.metrics?.institution_20d_net! > 0 ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {supplyDemand?.metrics?.institution_20d_net! > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.institution_20d_net! || 0)}
                                </div>
                            </div>
                        </div>

                        {/* RSI Scale */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tighter text-zinc-500">
                                <span>RSI Oscillator (14)</span>
                                <span className="text-zinc-900 dark:text-white font-black">{technical.rsi.value.toFixed(1)}</span>
                            </div>
                            <div className="relative pt-2">
                                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                                    <div className="h-full bg-blue-500/20 border-r border-blue-500/20" style={{ width: '30%' }} />
                                    <div className="h-full bg-transparent" style={{ width: '40%' }} />
                                    <div className="h-full bg-rose-500/20 border-l border-rose-500/20" style={{ width: '30%' }} />
                                </div>
                                <div className="absolute top-0 h-4 w-1 bg-zinc-900 dark:bg-white rounded-full shadow-lg transition-all duration-1000" style={{ left: `${technical.rsi.value}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase opacity-60">
                                <span>Oversold (30)</span>
                                <span>Overbought (70)</span>
                            </div>
                        </div>

                        {/* MA Trends */}
                        <div className="p-5 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                            <div className="text-[10px] font-black text-zinc-400 uppercase">Moving Average Comparison</div>
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <div className="text-[8px] font-bold text-zinc-400 uppercase">MA(5) Short</div>
                                    <div className="text-base font-black text-zinc-900 dark:text-white">₩{technical.movingAverages?.ma5?.toLocaleString() || '-'}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-[8px] font-bold text-zinc-400 uppercase">MA(20) Signal</div>
                                    <div className="text-base font-black text-zinc-900 dark:text-white">₩{technical.movingAverages?.ma20?.toLocaleString() || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fundamentals & Key Details */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                        <ShieldAlert size={18} className="text-blue-500" />
                        Fundamental Valuation
                    </h3>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Trailing PER</div>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                    {fundamentals?.per?.toFixed(2) || 'N/A'}
                                    <span className="text-xs font-medium text-zinc-400 ml-1">배</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Current PBR</div>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                    {fundamentals?.pbr?.toFixed(2) || 'N/A'}
                                    <span className="text-xs font-medium text-zinc-400 ml-1">배</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 space-y-3">
                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Valuation Context</div>
                            <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300 italic">
                                "{(() => {
                                    const per = fundamentals?.per || 0;
                                    const pbr = fundamentals?.pbr || 0;
                                    if (per > 0 && per < 8) return '수익성 대비 주가가 상당히 저평가되어 있는 기술적 저평가 구간입니다.';
                                    if (per > 35) return '미래 성장성에 대한 기대치가 높거나, 현재 실적 대비 고평가 판단이 필요합니다.';
                                    if (pbr < 0.8) return '자산 가치 대비 거래 가격이 낮아 자산주로서의 매력이 부각될 수 있습니다.';
                                    return '현재 시장의 표준적인 밸류에이션 범위 내에서 거래되고 있습니다.';
                                })()}"
                            </p>
                        </div>

                        <div className="pt-4 space-y-2">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase">Market Segment</div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-black">
                                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md">KOR SECTOR SYNC</span>
                                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md">ALPHA Pick Candidate</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
