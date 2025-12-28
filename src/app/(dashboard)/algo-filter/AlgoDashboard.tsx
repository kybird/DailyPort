
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import type { AlgoFilterResult } from '@/app/actions-analysis'
import { getBacktestStats } from '@/app/backtest-actions'
import type { BacktestResult } from '@/app/backtest-actions'
import { ArrowRight, Trophy, DollarSign, Zap, Box, LineChart, AlertTriangle, TrendingUp, Activity, Calendar, PlayCircle } from 'lucide-react'
import { getStockName } from '@/utils/stock-utils'

// Types
interface AlgoDashboardProps {
    initialResults: AlgoFilterResult[]
}

// Constants
const STRATEGIES = [
    { id: 'Value_Picks', label: '가치 투자', icon: DollarSign },
    { id: 'Twin_Engines', label: '쌍끌이 수급', icon: Zap },
    { id: 'Foreigner_Accumulation', label: '외인 매집', icon: Box },
    { id: 'Trend_Following', label: '추세 추종', icon: LineChart },
    { id: 'Confluence_Top', label: '통합 순위', icon: Trophy },
]

const strategyDescriptions: Record<string, string> = {
    'Value_Picks': '저평가 우량주: ROE 10%↑, 영업이익률 5%↑ 고배당/저PBR 기업 (Basic Profit Quality)',
    'Twin_Engines': '외인/기관 동반 수급: 수급강도 0.05%↑ 외인/기관 동반 유입 (Flow Power 정렬)',
    'Foreigner_Accumulation': '외인 매집: 박스권 12%↓ 내 21일 누적 매집 (Density 정렬)',
    'Trend_Following': '추세 모델: 거래폭발(1.5x↑) 및 이평선 정배열(MA5>20) 초기 돌파',
    'Confluence_Top': '통합 순위: Flow/Price/Fundamental 그룹 가중 점수 기반 Top 5'
}

const metricLabels: Record<string, string> = {
    roe: 'ROE', opm: '영업이익률', per: 'PER', pbr: 'PBR',
    flow_power: '수급강도', density: '매집밀도', vol_power: '거래강도', score: '종합점수',
    ma_align: '이평선', weighted_group_score: '가중점수'
}

// Helpers
const formatMetric = (key: string, value: any) => {
    if (typeof value !== 'number') return value
    if (key === 'roe' || key === 'opm' || key === 'density') return `${value.toFixed(1)}%`
    if (key === 'flow_power') return `${value.toFixed(2)}`
    if (key === 'vol_power') return `${value.toFixed(1)}x`
    if (key === 'score') return value.toFixed(0)
    if (key === 'per' || key === 'pbr') return value.toFixed(2)
    return value.toLocaleString()
}

const getSelectionReasons = (strategy: string, metrics: any) => {
    const reasons: string[] = []
    if (!metrics) return []

    if (strategy === 'Value_Picks') {
        if (metrics.roe) reasons.push(`ROE ${metrics.roe.toFixed(1)}%`)
        if (metrics.opm) reasons.push(`이익률 ${metrics.opm.toFixed(1)}%`)
        if (metrics.per) reasons.push(`PER ${metrics.per.toFixed(2)}`)
    } else if (strategy === 'Twin_Engines') {
        if (metrics.co_momentum) {
            const bill = Math.round(metrics.co_momentum / 100000000)
            reasons.push(`동반 매수금 ${bill.toLocaleString()}억`)
        }
        if (metrics.demand_power) {
            reasons.push(`수급 강도 ${metrics.demand_power.toFixed(1)}배`)
        }
        if (metrics.flow_power) reasons.push(`수급 집중도 ${metrics.flow_power.toFixed(2)}%`)
    } else if (strategy === 'Foreigner_Accumulation') {
        if (metrics.acc_density) reasons.push(`매집밀도 ${metrics.acc_density.toFixed(2)}%`)
        if (metrics.box_range) reasons.push(`박스권 ${(metrics.box_range * 100).toFixed(1)}%`)
    } else if (strategy === 'Trend_Following') {
        if (metrics.vol_power) reasons.push(`거래강도 ${metrics.vol_power.toFixed(1)}x`)
        if (metrics.ma_align) reasons.push(`${metrics.ma_align}`)
    } else if (strategy === 'Confluence_Top') {
        if (metrics.weighted_group_score) reasons.push(`상수 ${metrics.weighted_group_score.toFixed(1)}`)
    }

    if (reasons.length === 0) {
        return Object.entries(metrics).slice(0, 2).map(([k, v]) => `${k}: ${v}`)
    }
    return reasons
}

export default function AlgoDashboard({ initialResults }: AlgoDashboardProps) {
    const [activeTab, setActiveTab] = useState('Value_Picks')
    const [viewMode, setViewMode] = useState<'filter' | 'backtest'>('filter')
    const [backtestData, setBacktestData] = useState<BacktestResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Filter results for active strategy (for Daily Filter View)
    // Note: initialResults contains ALL strategies from the server (limit 10 dates). 
    // We only show the LATEST date for the "Daily Filter" view usually, or a list of recent.
    // Let's show the Latest one.
    const activeResults = initialResults.filter(p => p.strategy_name === activeTab)
    const latestResult = activeResults.length > 0 ? activeResults[0] : null

    // Load Backtest Data
    useEffect(() => {
        if (viewMode === 'backtest') {
            setIsLoading(true)
            getBacktestStats(activeTab)
                .then(data => {
                    setBacktestData(data)
                    setIsLoading(false)
                })
                .catch(err => {
                    console.error(err)
                    setIsLoading(false)
                })
        }
    }, [viewMode, activeTab])

    const ActiveIcon = STRATEGIES.find(s => s.id === activeTab)?.icon || Trophy

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                        <ActiveIcon className="text-blue-600 dark:text-blue-500" size={32} />
                        백테스팅 (전략 검증)
                    </h1>
                    <p className="text-neutral-500 mt-2">
                        {strategyDescriptions[activeTab]}
                    </p>
                </div>

                {/* View Mode Toggle */}
                <div className="bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg flex items-center gap-1">
                    <button
                        onClick={() => setViewMode('filter')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'filter'
                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                    >
                        일일 필터링
                    </button>
                    <button
                        onClick={() => setViewMode('backtest')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'backtest'
                            ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                    >
                        <Activity size={16} />
                        결과 검증
                    </button>
                </div>
            </div>

            {/* Strategy Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-1">
                {STRATEGIES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => { setActiveTab(s.id); setBacktestData(null); }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-t-lg text-sm font-bold transition-colors relative top-[1px] ${activeTab === s.id
                            ? 'bg-white dark:bg-neutral-950 text-blue-600 border-x border-t border-neutral-200 dark:border-neutral-800 z-10'
                            : 'bg-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                            }`}
                    >
                        <s.icon size={16} />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[400px]">
                {viewMode === 'filter' ? (
                    // DAILY FILTER VIEW
                    latestResult ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                                    📅 기준일: {latestResult.date}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(latestResult.details?.status === 'NO_QUALIFIED_CANDIDATES' || latestResult.tickers.length === 0) ? (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                                        <p className="text-neutral-400 font-bold">해당 날짜에 조건 만족 종목이 없습니다.</p>
                                    </div>
                                ) : (
                                    latestResult.tickers.map((ticker) => {
                                        const candInfo = (latestResult.details?.candidates?.[ticker] ||
                                            latestResult.details?.items?.find((i: { ticker: string }) => i.ticker === ticker)) as any
                                        const isAvoid = candInfo?.technical_status === 'AVOID'
                                        const reasons = candInfo?.metrics ? getSelectionReasons(activeTab, candInfo.metrics) : []
                                        const rank = candInfo?.rank || 0

                                        return (
                                            <Link
                                                key={ticker}
                                                href={`/analysis/${ticker}?ref=algo`}
                                                className="flex flex-col p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all group relative"
                                            >
                                                {/* Rank Badge */}
                                                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                                    <span className="text-xs font-black text-neutral-300 dark:text-neutral-700">#{rank}</span>
                                                    {isAvoid && <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] rounded font-bold">⚠️ 기술적 유의</span>}
                                                </div>

                                                <div className="mb-4">
                                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                                        {getStockName(ticker)}
                                                        <span className="text-xs font-normal text-neutral-400 font-mono no-underline">{ticker}</span>
                                                    </h3>
                                                    <div className="text-sm text-neutral-500 mt-1 font-mono">
                                                        진입: @{candInfo?.price?.toLocaleString() || '-'}
                                                    </div>
                                                </div>

                                                {/* Targets Display */}
                                                {candInfo?.targets && candInfo.targets.length > 0 && (
                                                    <div className="flex items-center gap-3 mb-4 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg">
                                                        <div className="flex flex-col">
                                                            <span className="text-neutral-400 text-[10px]">1차 목표</span>
                                                            <span className="font-bold text-red-500">@{candInfo.targets[0].toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-neutral-400 text-[10px]">2차 목표</span>
                                                            <span className="font-bold text-red-600">@{candInfo.targets[1]?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 mt-auto">
                                                    {reasons.map((r, idx) => (
                                                        <div key={idx} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                                            {r}
                                                        </div>
                                                    ))}
                                                </div>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                            데이터가 없습니다.
                        </div>
                    )
                ) : (
                    // BACKTEST VIEW
                    <div className="animate-in fade-in duration-300 space-y-8">
                        {/* 1. Control Panel */}
                        {/* 1. Simulation Rules Panel */}
                        <div className="bg-white dark:bg-neutral-900 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                <PlayCircle size={20} className="text-blue-600 dark:text-blue-400" />
                                결과 검증 규칙 (Simulation Rules)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                    <label className="block text-neutral-500 mb-1.5 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> 진입 (Entry)
                                    </label>
                                    <div className="font-bold text-neutral-800 dark:text-neutral-200">
                                        신호 발생 당일 <span className="text-green-600">종가 매수</span>
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1">이전 신호 보유 중엔 중복 진입 금지</div>
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                    <label className="block text-neutral-500 mb-1.5 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> 청산 (Exit)
                                    </label>
                                    <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                                        <span className="text-red-500">익절 +15%</span>
                                        <span className="text-neutral-300">|</span>
                                        <span className="text-blue-500">손절 -10%</span>
                                        <span className="text-neutral-300">|</span>
                                        <span className="text-yellow-600">본절 0%</span>
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1">장중 도달 시 즉시 청산 가정</div>
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                    <label className="block text-neutral-500 mb-1.5 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div> 검증 기간
                                    </label>
                                    <div className="font-bold text-neutral-800 dark:text-neutral-200">최근 60일 (Signals)</div>
                                    <div className="text-xs text-neutral-400 mt-1">조건 미달성 시 현재까지 보유</div>
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 animate-pulse">
                                <Activity size={48} className="mb-4 text-neutral-300 dark:text-neutral-700" />
                                <p>과거 데이터 시뮬레이션 중...</p>
                            </div>
                        ) : !backtestData ? (
                            <div className="py-20 text-center text-neutral-400">
                                데이터 로드 실패
                            </div>
                        ) : (
                            <>
                                {/* 2. KPI Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <KPICard label="신호 정확도 (Win Rate)" value={`${backtestData.winRate.toFixed(1)}%`} icon={Trophy}
                                        highlight={backtestData.winRate >= 50 ? 'text-rose-500' : 'text-neutral-500'} />
                                    <KPICard label="신호당 평균 수익" value={`${backtestData.avgReturn > 0 ? '+' : ''}${backtestData.avgReturn.toFixed(1)}%`} icon={TrendingUp}
                                        highlight={backtestData.avgReturn > 0 ? 'text-rose-500' : 'text-blue-500'} />
                                    <KPICard label="총 발생 신호" value={`${backtestData.totalTrades}건`} icon={Activity} />
                                    <KPICard label="손익비 (Profit Factor)" value={`${backtestData.profitFactor.toFixed(2)}`} icon={DollarSign} />
                                </div>

                                {/* 3. Trade List */}
                                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 font-bold flex items-center gap-2">
                                        <LineChart size={18} className="text-neutral-400" />
                                        상세 검증 내역 (Verification History)
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 sticky top-0 z-10 font-medium">
                                                <tr>
                                                    <th className="px-6 py-3 text-left">종목</th>
                                                    <th className="px-6 py-3 text-right">진입 (Entry)</th>
                                                    <th className="px-6 py-3 text-right">청산/현재 (Exit)</th>
                                                    <th className="px-6 py-3 text-right">보유일</th>
                                                    <th className="px-6 py-3 text-right">수익률</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                {backtestData.trades.map((trade, i) => (
                                                    <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                        <td className="px-6 py-3 font-medium text-neutral-900 dark:text-white">
                                                            <div>{getStockName(trade.ticker)}</div>
                                                            <div className="text-xs text-neutral-400 font-mono">{trade.ticker}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="text-neutral-600 dark:text-neutral-400 font-mono text-xs">{trade.date}</div>
                                                            <div className="text-neutral-800 dark:text-neutral-200 font-bold font-mono">@{trade.entryPrice.toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold mb-0.5 ${trade.status === 'WIN' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                                    trade.status === 'LOSS' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                        trade.status === 'BREAKEVEN' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                            'bg-neutral-100 text-neutral-500'
                                                                    }`}>
                                                                    {trade.status === 'WIN' ? '익절 (Win)' :
                                                                        trade.status === 'LOSS' ? '손절 (Loss)' :
                                                                            trade.status === 'BREAKEVEN' ? '본절 (BE)' : '보유중'}
                                                                </span>
                                                                {trade.note && <span className="text-[10px] text-neutral-400 font-mono mb-0.5">{trade.note}</span>}
                                                                <span className="font-mono text-neutral-600 dark:text-neutral-400 font-bold text-sm">
                                                                    @{trade.currentPrice.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-neutral-500 font-mono text-xs">
                                                            {trade.daysHeld}일
                                                        </td>
                                                        <td className={`px-6 py-3 text-right font-bold ${trade.returnPercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                                            {trade.returnPercent > 0 ? '+' : ''}{trade.returnPercent.toFixed(1)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function KPICard({ label, value, icon: Icon, highlight }: any) {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">
                <Icon size={14} />
                {label}
            </div>
            <div className={`text-2xl font-black ${highlight || 'text-neutral-900 dark:text-white'}`}>
                {value}
            </div>
        </div>
    )
}
