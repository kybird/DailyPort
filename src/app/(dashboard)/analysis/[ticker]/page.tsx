import { getAnalysis } from '@/app/actions-analysis'
import Link from 'next/link'
import { ArrowLeft, Activity, RefreshCw, TrendingUp, TrendingDown, Wallet, ShieldAlert, ArrowRightCircle, ExternalLink } from 'lucide-react'
import CompositeStockChart from '@/components/CompositeStockChart'
import { formatKoreanUnit } from '@/utils/format-utils'
import { getStockName } from '@/utils/stock-utils'

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
                            <span className="text-xs font-black px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-700">{tickerParam.split('.')[0]}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
                            {fundamentals?.market_cap && (
                                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                    시가총액 {formatKoreanUnit(fundamentals.market_cap)}
                                </span>
                            )}
                            {fundamentals?.revenue && (
                                <span className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800/50">
                                    매출 {formatKoreanUnit(fundamentals.revenue)}
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

            {/* Smart Caution Banner for AVOID Status */}
            {(technical.trend.status === 'DOWN_TREND' || technical.trend.status === 'DEAD_CROSS' || technical.objectives?.mid?.status === 'AVOID') && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-500">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shrink-0">
                        <ShieldAlert size={24} />
                    </div>
                    <div className="space-y-1 flex-1 text-center md:text-left">
                        <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter">투자 주의: 기술적/수급 지표 부진</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500 font-medium break-keep">
                            현재 수급 또는 가격 추세가 불안정한 상태입니다. 펀더멘털 지표가 우수하더라도 **지배구조, 공시, 뉴스 등 회사 외적 요인**이 작용하고 있을 가능성이 높으므로, 반드시 아래 외부 정보를 연계하여 다각도로 검토하시기 바랍니다.
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <a
                            href={`https://finance.naver.com/item/main.naver?code=${tickerParam.split('.')[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center gap-2"
                        >
                            네이버 Pay증권 <ExternalLink size={14} />
                        </a>
                        <a
                            href={`https://dart.fss.or.kr/dsbd001/main.do?text=${tickerParam.split('.')[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center gap-2"
                        >
                            DART 공시 <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            )}

            {/* 1. Main Focus: Enlarged Composite Chart */}
            <div className="w-full">
                <CompositeStockChart
                    priceData={historical || []}
                    supplyData={supplyDemand?.chartData}
                    objectives={technical.objectives || undefined}
                />
            </div>

            {/* 2. Insight & Secondary Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* AI Insight Card - Spans 3 columns in large layout */}
                <div className="lg:col-span-3 bg-white dark:bg-neutral-900/50 rounded-3xl p-10 relative overflow-hidden shadow-md border border-neutral-200/60 dark:border-white/5 backdrop-blur-sm transition-colors">
                    <div className="absolute top-0 right-0 p-10 opacity-5 dark:opacity-10 rotate-12 text-neutral-900 dark:text-white">
                        <Activity size={180} />
                    </div>
                    <div className="relative space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Activity size={22} />
                            </div>
                            <h2 className="text-lg font-black tracking-widest uppercase text-blue-600 dark:text-blue-400">Daily Insight</h2>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold leading-tight break-keep text-neutral-900 dark:text-neutral-100">
                            {summary?.replace('[AI 진단] ', '') || "분석 데이터를 불러오는 중입니다."}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                            <span className="px-4 py-2 bg-white/5 rounded-full text-[11px] font-black uppercase tracking-widest text-neutral-400 border border-white/10">추세 상태: {technical.trend.status === 'UP_TREND' || technical.trend.status === 'GOLDEN_CROSS' ? '상승 추세' : technical.trend.status === 'DOWN_TREND' || technical.trend.status === 'DEAD_CROSS' ? '하락 추세' : '중립'}</span>
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
                                    <Wallet size={16} /> 나의 보유 현황
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-4">
                                    <div>
                                        <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">Holdings</div>
                                        <div className="text-2xl font-black">{portfolio.quantity.toLocaleString()} <span className="text-sm opacity-60">주</span></div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">평단가</div>
                                        <div className="text-2xl font-black">₩{portfolio.entryPrice.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-white/10 mt-6">
                                <div className="text-[10px] text-blue-200 font-bold uppercase mb-1">예상 실현 손익 (P&L)</div>
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
                        <div className="h-full bg-white dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 text-neutral-400 shadow-md backdrop-blur-sm transition-colors">
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
                <div className="bg-white dark:bg-neutral-900/50 rounded-3xl p-8 border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm space-y-8 transition-colors">
                    <h3 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                        <ArrowRightCircle size={18} className="text-blue-500" />
                        매매 전략 및 목표
                    </h3>
                    {/* Handle Missing Objectives Gracefully */}
                    {!technical.objectives ? (
                        <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 flex flex-col items-center gap-2">
                            <Activity size={32} className="opacity-20 mb-2" />
                            <p className="text-sm font-bold">분석 데이터 부족으로 전략을 산출할 수 없습니다.</p>
                            <p className="text-xs opacity-60">(최근 상장주거나 거래일수 부족)</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {(['short', 'mid', 'long'] as const).map((tf) => {
                                const data = technical.objectives![tf];
                                if (!data) return null;
                                const labelMap = { short: '단기 매매', mid: '중기 스윙', long: '장기 투자' };
                                const colorMap = { short: 'text-neutral-500', mid: 'text-neutral-900 dark:text-neutral-100', long: 'text-blue-600 font-black' };
                                const statusColor = data.status === 'ACTIVE' ? 'bg-emerald-500' :
                                    data.status === 'WAIT' ? 'bg-amber-500' : 'bg-neutral-400';

                                return (
                                    <div key={labelMap[tf]} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className={`text-[11px] font-black uppercase tracking-wider ${colorMap[tf]}`}>{labelMap[tf]}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${statusColor}`}>
                                                        {data.status === 'ACTIVE' ? '진입 가능' : data.status === 'WAIT' ? '대기' : '관망'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-neutral-500">
                                                        {data.strategy === 'PULLBACK_TREND' ? '추세 눌림목' :
                                                            data.strategy === 'BREAKOUT' ? '돌파 매매' :
                                                                data.strategy === 'MEAN_REVERSION' ? '평균 회귀' :
                                                                    data.strategy === 'NO_TRADE' ? '매매 없음' : data.strategy}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                                {data.confidenceFlags.map(flag => (
                                                    <span
                                                        key={flag}
                                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${flag.includes('UPTREND') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                            flag.includes('BROKEN') ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                                                flag.includes('WEAK') ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                    'bg-neutral-500/10 border-neutral-500/20 text-neutral-500'
                                                            }`}
                                                    >
                                                        {flag === 'UPTREND_CONFIRMED' ? '상승 추세' :
                                                            flag === 'BROKEN_TREND' ? '추세 이탈' :
                                                                flag === 'TREND_WEAK' ? '추세 약화' :
                                                                    flag === 'OVERBOUGHT' ? '과매수' :
                                                                        flag === 'OVERSOLD' ? '과매도' :
                                                                            flag === 'HIGH_VOLATILITY' ? '변동성 확대' : flag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Score Bar (Qualitative) */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400 uppercase">
                                                <span>신뢰도 수준</span>
                                                <span className="text-neutral-600 dark:text-neutral-300 font-black">
                                                    {data.score >= 80 ? '매우 높음' :
                                                        data.score >= 60 ? '높음' :
                                                            data.score >= 40 ? '보통' : '낮음'}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${statusColor}`}
                                                    style={{ width: `${data.score}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className={`p-3 rounded-2xl border text-center transition-all ${data.status === 'ACTIVE'
                                                ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'
                                                : 'bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                                                <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">진입가</div>
                                                <div className="text-[12px] font-mono font-black text-zinc-900 dark:text-white">₩{data.entry?.toLocaleString()}</div>
                                            </div>
                                            <div className={`p-3 rounded-2xl border text-center transition-all ${data.status === 'ACTIVE'
                                                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                                                : 'bg-rose-50/30 dark:bg-rose-950/5 border-dashed border-rose-200/50 dark:border-rose-900/20 opacity-60'}`}>
                                                <div className="text-[8px] font-black text-rose-400 uppercase mb-1">손절가</div>
                                                <div className={`text-[12px] font-mono font-black ${data.status === 'ACTIVE' ? 'text-rose-500' : 'text-rose-400'}`}>₩{data.stop?.toLocaleString()}</div>
                                            </div>
                                            <div className={`p-3 rounded-2xl border text-center transition-all ${data.status === 'ACTIVE'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                                                : 'bg-emerald-50/30 dark:bg-emerald-950/5 border-dashed border-emerald-200/50 dark:border-emerald-900/20 opacity-60'}`}>
                                                <div className="text-[8px] font-black text-emerald-400 uppercase mb-1">목표가</div>
                                                <div className={`text-[12px] font-mono font-black ${data.status === 'ACTIVE' ? 'text-emerald-500' : 'text-emerald-400'}`}>₩{data.target?.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {data.status !== 'ACTIVE' && (
                                            <div className={`p-4 rounded-2xl border border-dashed ${data.status === 'WAIT' ? 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30' :
                                                'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                                                }`}>
                                                <div className={`text-[10px] font-bold italic flex items-center gap-2 ${data.status === 'WAIT' ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'
                                                    }`}>
                                                    <ShieldAlert size={14} className={data.status === 'WAIT' ? 'text-amber-500' : 'text-zinc-400'} />
                                                    {data.reason}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Accumulation & Data Scales */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                        <TrendingUp size={18} className="text-amber-500" />
                        상대 강도 및 수급 동향
                    </h3>

                    <div className="space-y-8">
                        {/* Numerical Supply Metrics (Explicit scale requested) */}
                        {/* Numerical Supply Metrics (Fixed Lint) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">외인 순매수(20일)</div>
                                <div className={`text-xl font-mono font-black ${(supplyDemand?.metrics?.foreigner_20d_net ?? 0) > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                    {(supplyDemand?.metrics?.foreigner_20d_net ?? 0) > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.foreigner_20d_net ?? 0)}
                                </div>
                            </div>
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">기관 순매수(20일)</div>
                                <div className={`text-xl font-mono font-black ${(supplyDemand?.metrics?.institution_20d_net ?? 0) > 0 ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {(supplyDemand?.metrics?.institution_20d_net ?? 0) > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.institution_20d_net ?? 0)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">외인 매집 (5일)</div>
                                <div className={`text-xl font-mono font-black ${(supplyDemand?.metrics?.foreigner_5d_net ?? 0) > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                    {(supplyDemand?.metrics?.foreigner_5d_net ?? 0) > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.foreigner_5d_net ?? 0)}
                                </div>
                            </div>
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">기관 매집 (5일)</div>
                                <div className={`text-xl font-mono font-black ${(supplyDemand?.metrics?.institution_5d_net ?? 0) > 0 ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {(supplyDemand?.metrics?.institution_5d_net ?? 0) > 0 ? '+' : ''}{formatKoreanUnit(supplyDemand?.metrics?.institution_5d_net ?? 0)}
                                </div>
                            </div>
                        </div>

                        {/* RSI Scale */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tighter text-neutral-500">
                                <span>RSI (14)</span>
                                <span className="text-neutral-900 dark:text-white font-black">{technical.rsi.value.toFixed(1)}</span>
                            </div>
                            <div className="relative pt-2">
                                <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex shadow-inner">
                                    <div className="h-full bg-blue-500/20 border-r border-blue-500/20" style={{ width: '30%' }} />
                                    <div className="h-full bg-transparent" style={{ width: '40%' }} />
                                    <div className="h-full bg-rose-500/20 border-l border-rose-500/20" style={{ width: '30%' }} />
                                </div>
                                <div className="absolute top-0 h-4 w-1 bg-neutral-900 dark:bg-white rounded-full shadow-lg transition-all duration-1000" style={{ left: `${technical.rsi.value}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] font-black text-neutral-400 uppercase opacity-60">
                                <span>과매도 (30)</span>
                                <span>과매수 (70)</span>
                            </div>
                        </div>

                        {/* MA Trends */}
                        <div className="p-5 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-800/50 dark:to-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-800 space-y-3">
                            <div className="text-[10px] font-black text-neutral-400 uppercase">시장 및 재무 진단</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-neutral-500 font-bold">PER</div>
                                    <div className="text-lg font-black text-neutral-900 dark:text-white">{fundamentals?.per?.toFixed(2) || '-'}배</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] text-neutral-500 font-bold">PBR</div>
                                    <div className="text-lg font-black text-neutral-900 dark:text-white">{fundamentals?.pbr?.toFixed(2) || '-'}배</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="space-y-1">
                                    <div className="text-[8px] font-bold text-neutral-400 uppercase">5일 이동평균</div>
                                    <div className="text-base font-black text-neutral-900 dark:text-white">₩{technical.movingAverages?.ma5?.toLocaleString() || '-'}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-[8px] font-bold text-neutral-400 uppercase">20일 이동평균</div>
                                    <div className="text-base font-black text-neutral-900 dark:text-white">₩{technical.movingAverages?.ma20?.toLocaleString() || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fundamentals & Key Details */}
                <div className="bg-white dark:bg-neutral-900/50 rounded-3xl p-8 border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm space-y-8 transition-colors">
                    <h3 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                        <ShieldAlert size={18} className="text-blue-500" />
                        기초 가치 평가
                    </h3>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">PER</div>
                                <div className="text-3xl font-black text-neutral-900 dark:text-white">
                                    {fundamentals?.per?.toFixed(2) || 'N/A'}
                                    <span className="text-xs font-medium text-neutral-400 ml-1">배</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">PBR</div>
                                <div className="text-3xl font-black text-neutral-900 dark:text-white">
                                    {fundamentals?.pbr?.toFixed(2) || 'N/A'}
                                    <span className="text-xs font-medium text-neutral-400 ml-1">배</span>
                                </div>
                            </div>
                        </div>

                        {/* Revenue & Net Income (Moved here) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">연간 매출액</div>
                                <div className="text-xl font-black text-neutral-900 dark:text-white">
                                    {fundamentals?.revenue ? formatKoreanUnit(fundamentals.revenue) : 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-colors">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">당기순이익</div>
                                <div className={`text-xl font-black ${fundamentals?.netIncome && fundamentals.netIncome >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {fundamentals?.netIncome ? formatKoreanUnit(fundamentals.netIncome) : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 space-y-3">
                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">투자 분석 의견</div>
                            <p className="text-sm font-medium leading-relaxed text-neutral-600 dark:text-neutral-300 italic">
                                &ldquo;{(() => {
                                    const per = fundamentals?.per || 0;
                                    const pbr = fundamentals?.pbr || 0;
                                    if (per > 0 && per < 8) return '수익성 대비 주가가 상당히 저평가되어 있는 기술적 저평가 구간입니다.';
                                    if (per > 35) return '미래 성장성에 대한 기대치가 높거나, 현재 실적 대비 고평가 판단이 필요합니다.';
                                    if (pbr < 0.8) return '자산 가치 대비 거래 가격이 낮아 자산주로서의 매력이 부각될 수 있습니다.';
                                    return '현재 시장의 표준적인 밸류에이션 범위 내에서 거래되고 있습니다.';
                                })()}&rdquo;
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
