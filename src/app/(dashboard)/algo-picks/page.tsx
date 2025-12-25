import { getAlgoPicks } from '@/app/actions-analysis'
import { getStockName } from '@/utils/stock-utils'
import Link from 'next/link'
import { ArrowRight, Trophy, DollarSign, Zap, Box, LineChart, AlertTriangle } from 'lucide-react'
import React from 'react'

// Strategy Icon Mapping
const strategyIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Value_Picks': DollarSign,
    'Twin_Engines': Zap,
    'Foreigner_Accumulation': Box,
    'Trend_Following': LineChart,
    'Confluence_Top': Trophy,
    'default': Trophy
}

const strategyDescriptions: Record<string, string> = {
    'Value_Picks': '저평가 우량주: ROE 8%↑, 영업이익률 5%↑ (Profit Quality → PER → PBR 정렬)',
    'Twin_Engines': '쌍끌이 매수: 수급강도 0.05%↑ 외인/기관 동반 순매수 (Demand Power 정렬)',
    'Foreigner_Accumulation': '외인 매집: 박스권 12%↓ 내 21일 누적 매집 (Density 정렬)',
    'Trend_Following': '추세추종: 거래폭발 1.5x↑ 양봉 마감 (Vol Power 정렬, 윗꼬리 필터)',
    'Confluence_Top': '통합 순위: Flow/Price/Fundamental 그룹 가중 점수 기반 Top 5'
}

export default async function AlgoPage() {
    const picks = await getAlgoPicks()

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                        <Zap className="text-amber-500" />
                        Algo Picks
                    </h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2">
                        <p className="text-zinc-500">
                            마지막 분석일 기준으로 수급과 펀더멘털을 스크리닝한 결과입니다. (장중 실시간 데이터는 미포함)
                        </p>
                        {picks.length > 0 && (
                            <span className="text-xs font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg w-fit">
                                최근 분석일: {picks[0].date}
                            </span>
                        )}
                    </div>
                </div>
                <Link
                    href="/algo-picks/about"
                    className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                    알고리즘 기법 소개
                    <ArrowRight size={16} />
                </Link>
            </header>

            {
                picks.length === 0 ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-10 text-center border border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="text-zinc-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">No Picks Available</h3>
                        <p className="text-zinc-500 mt-2">
                            Run the daily analyzer to generate new screening results.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {picks.map((pick) => {
                            const Icon = strategyIcons[pick.strategy_name] || strategyIcons['default']
                            const isNoResults = pick.details?.status === 'NO_QUALIFIED_CANDIDATES'

                            return (
                                <div
                                    key={`${pick.strategy_name}-${pick.date}`}
                                    className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all group ${isNoResults ? 'grayscale opacity-60' : ''}`}
                                >
                                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-700">
                                                <Icon className={isNoResults ? 'text-zinc-400' : 'text-blue-600 dark:text-blue-400'} size={24} />
                                            </div>
                                            <span className="text-xs font-mono text-zinc-400">{pick.date}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
                                            {pick.strategy_name.replace(/_/g, ' ')}
                                        </h3>
                                        <p className="text-sm text-zinc-500 leading-relaxed">
                                            {strategyDescriptions[pick.strategy_name] || 'Algorithmic screening strategy.'}
                                        </p>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-2">
                                            {isNoResults ? (
                                                <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                                    <p className="text-xs font-bold text-zinc-400">조건을 만족하는 종목이 없습니다</p>
                                                </div>
                                            ) : (
                                                pick.tickers.map((ticker) => {
                                                    // Handle both 'candidates' object (individual strategies) and 'items' array (Confluence)
                                                    const candInfo = pick.details?.candidates?.[ticker] ||
                                                        pick.details?.items?.find((i: { ticker: string }) => i.ticker === ticker)
                                                    const isAvoid = candInfo?.technical_status === 'AVOID'

                                                    return (
                                                        <Link
                                                            key={ticker}
                                                            href={`/analysis/${ticker}?ref=algo`}
                                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group/item"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-zinc-700 dark:text-zinc-200">
                                                                    {getStockName(ticker)}
                                                                </span>
                                                                <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                                    {ticker}
                                                                </span>
                                                                {isAvoid && (
                                                                    <div className="flex items-center gap-1 group/tooltip relative">
                                                                        <AlertTriangle size={14} className="text-rose-500 animate-pulse" />
                                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Caution</span>

                                                                        {/* Simple Tooltip */}
                                                                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                                                                            기술적 주의: 추세 점수 미달(AVOID). 외부 요인 및 공시를 반드시 확인하세요.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <ArrowRight size={14} className="text-zinc-300 group-hover/item:text-blue-500 transition-colors" />
                                                        </Link>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            }
        </div>
    )
}
