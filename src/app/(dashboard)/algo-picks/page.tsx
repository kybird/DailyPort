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
    'Twin_Engines': '외인/기관 동반 수급: 수급강도 0.05%↑ 외인/기관 동반 유입 (Flow Power 정렬)',
    'Foreigner_Accumulation': '외인 매집: 박스권 12%↓ 내 21일 누적 매집 (Density 정렬)',
    'TREND_FOLLOWING': '추세 모델: 거래폭발 1.5x↑ 양봉 마감 (Vol Power 정렬, 과열 필터)',
    'Confluence_Top': '통합 순위: Flow/Price/Fundamental 그룹 가중 점수 기반 Top 5'
}

const strategyDisplayNames: Record<string, string> = {
    'Value_Picks': '가치 모델',
    'Twin_Engines': '쌍끌이 수급',
    'Foreigner_Accumulation': '외국인 매집',
    'Trend_Following': '추세 신호',
    'Confluence_Top': '통합 순위'
}

// Metric labels mapping
const metricLabels: Record<string, string> = {
    roe: 'ROE',
    opm: '영업이익률',
    per: 'PER',
    pbr: 'PBR',
    flow_power: '수급강도',
    density: '매집밀도',
    vol_power: '거래강도',
    score: '종합점수'
}

// Helper to format metric values
const formatMetric = (key: string, value: number) => {
    if (key === 'roe' || key === 'opm' || key === 'density') return `${value.toFixed(1)}%`
    if (key === 'flow_power') return `${value.toFixed(2)}`
    if (key === 'vol_power') return `${value.toFixed(1)}x`
    if (key === 'score') return value.toFixed(0)
    if (key === 'per' || key === 'pbr') return value.toFixed(2)
    return value.toLocaleString()
}


// Helper to generate detailed selection reasons based on strategy and metrics
const getSelectionReasons = (strategy: string, metrics: Record<string, number>) => {
    const reasons: string[] = []

    // Value Model
    if (strategy === 'Value_Picks') {
        if (metrics.roe) reasons.push(`ROE ${metrics.roe.toFixed(1)}% (기준 8%↑)`)
        if (metrics.opm) reasons.push(`이익률 ${metrics.opm.toFixed(1)}% (기준 5%↑)`)
        if (metrics.per) reasons.push(`PER ${metrics.per.toFixed(2)} (저평가)`)
        if (metrics.pbr) reasons.push(`PBR ${metrics.pbr.toFixed(2)} (자산주)`)
    }
    // Twin Force
    else if (strategy === 'Twin_Engines') {
        if (metrics.flow_power) reasons.push(`수급강도 ${metrics.flow_power.toFixed(2)} (기준 0.05↑)`)
    }
    // Foreigner Accumulation
    else if (strategy === 'Foreigner_Accumulation') {
        if (metrics.density) reasons.push(`매집밀도 ${metrics.density.toFixed(2)}% (집중매수)`)
        if (metrics.accumulation_20d) reasons.push(`20일누적 ${(metrics.accumulation_20d / 1000).toFixed(0)}k`)
    }
    // Trend Signal
    else if (strategy === 'TREND_FOLLOWING' || strategy === 'Trend_Following') {
        if (metrics.vol_power) reasons.push(`거래강도 ${metrics.vol_power.toFixed(1)}x (기준 1.5배↑)`)
        if (metrics.score) reasons.push(`추세점수 ${metrics.score.toFixed(0)}점`)
    }

    // Default fallback if no specific logic or metrics
    if (reasons.length === 0 && metrics) {
        return Object.entries(metrics).slice(0, 2).map(([k, v]) =>
            `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`
        )
    }

    return reasons
}

export default async function AlgoPage() {
    const picks = await getAlgoPicks()

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                        <Zap className="text-amber-500" />
                        검증 알고리즘
                    </h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2">
                        <p className="text-neutral-500">
                            마지막 분석일 기준으로 수급과 펀더멘털을 스크리닝한 결과입니다. (장중 실시간 데이터는 미포함)
                        </p>
                        {picks.length > 0 && (
                            <span className="text-xs font-bold px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-lg w-fit">
                                최근 분석일: {picks[0].date}
                            </span>
                        )}
                    </div>
                </div>
                <Link
                    href="/algo-picks/about"
                    className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                    검증 기법 상세설명
                    <ArrowRight size={16} />
                </Link>
            </header>

            {
                picks.length === 0 ? (
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-10 text-center border border-neutral-200 dark:border-neutral-800">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="text-neutral-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-300">No Signals Generated</h3>
                        <p className="text-neutral-500 mt-2">
                            Run the daily analyzer to generate new simulation data.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {picks.map((pick) => {
                            const Icon = strategyIcons[pick.strategy_name] || strategyIcons['default']
                            const isNoResults = pick.details?.status === 'NO_QUALIFIED_CANDIDATES'

                            return (
                                <div key={`${pick.strategy_name}-${pick.date}`} className="space-y-4">
                                    {/* Strategy Header */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm ring-1 ring-neutral-100 dark:ring-neutral-700 shrink-0">
                                            <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                                                {strategyDisplayNames[pick.strategy_name] || pick.strategy_name.replace(/_/g, ' ')}
                                            </h3>
                                            <p className="text-sm text-neutral-500 mt-1">
                                                {strategyDescriptions[pick.strategy_name]}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Items Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {isNoResults ? (
                                            <div className="col-span-full p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                                <p className="text-sm font-bold text-neutral-400">조건을 만족하는 종목이 없습니다</p>
                                            </div>
                                        ) : (
                                            pick.tickers.map((ticker) => {
                                                const candInfo = pick.details?.candidates?.[ticker] ||
                                                    pick.details?.items?.find((i: { ticker: string }) => i.ticker === ticker)
                                                const isAvoid = candInfo?.technical_status === 'AVOID'
                                                const reasons = candInfo?.metrics ? getSelectionReasons(pick.strategy_name, candInfo.metrics) : []

                                                return (
                                                    <Link
                                                        key={ticker}
                                                        href={`/analysis/${ticker}?ref=algo`}
                                                        className="flex flex-col p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all group relative"
                                                    >
                                                        {/* Top Row: Caution + Name */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                {isAvoid && (
                                                                    <div className="relative group/tooltip">
                                                                        <AlertTriangle size={16} className="text-rose-500" />
                                                                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-neutral-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                                                                            기술적 주의: 추세 점수 미달. 외부 요인 확인 필요.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <span className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                    {getStockName(ticker)}
                                                                </span>
                                                            </div>
                                                            <ArrowRight size={16} className="text-neutral-300 group-hover:text-blue-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                                        </div>

                                                        {/* Bottom Row: Detailed Reasons */}
                                                        <div className="space-y-1.5">
                                                            {reasons.length > 0 ? (
                                                                reasons.map((reason, idx) => (
                                                                    <div key={idx} className="text-xs font-mono text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                                                                        <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                                                                        {reason}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-neutral-400">데이터 세부 정보 없음</span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                )
                                            })
                                        )}
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
