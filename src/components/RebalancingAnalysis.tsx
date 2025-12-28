'use client'

import { useState, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import {
    STRATEGIES,
    StrategyType,
    getRebalancingSuggestions,
    PortfolioAnalysisItem,
    calculateMomentum,
    calculateVolatility
} from '@/utils/rebalancing'
import { getStockName } from '@/utils/stock-utils'

interface RebalancingAnalysisProps {
    items: any[]
    totalValuation: number
    onClose: () => void
}

export default function RebalancingAnalysis({ items, totalValuation, onClose }: RebalancingAnalysisProps) {
    const [strategy, setStrategy] = useState<StrategyType>('BALANCED')

    const analysisData = useMemo(() => {
        return items.map(item => {
            const currentVal = (item.marketData?.currentPrice || item.entry_price) * item.quantity;
            const currentWeight = totalValuation > 0 ? (currentVal / totalValuation) * 100 : 0;
            const historical = item.marketData?.historical || [];

            const momentum = calculateMomentum(historical);
            const volatility = calculateVolatility(historical);
            const totalReturn = item.marketData?.currentPrice
                ? ((item.marketData.currentPrice - item.entry_price) / item.entry_price) * 100
                : 0;

            return {
                ticker: item.ticker,
                name: getStockName(item.ticker),
                currentWeight,
                targetWeight: item.target_weight || 0,
                momentum,
                volatility,
                totalReturn,
                currentValue: currentVal
            } as PortfolioAnalysisItem;
        });
    }, [items, totalValuation]);

    const suggestions = useMemo(() => {
        return getRebalancingSuggestions(analysisData, strategy);
    }, [analysisData, strategy]);

    const totalTargetWeight = useMemo(() => {
        return analysisData.reduce((sum, item) => sum + (item.targetWeight || 0), 0);
    }, [analysisData]);

    const isWeightZero = totalTargetWeight === 0;
    const isWeightInbalanced = totalTargetWeight > 0 && Math.abs(totalTargetWeight - 100) > 0.1;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white">리밸런싱 분석 제안</h3>
                            <p className="text-xs text-zinc-500 font-medium">목표 비중과 시장 상황(모멘텀/변동성)을 고려한 제안입니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Strategy Selector */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">분석 전략 선택</label>
                        <div className="grid grid-cols-3 gap-3 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                            {(Object.keys(STRATEGIES) as StrategyType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setStrategy(type)}
                                    className={`relative p-3 rounded-xl transition-all ${strategy === type
                                        ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-md scale-[1.02]'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    <div className="text-sm font-black">{STRATEGIES[type].name}</div>
                                    {strategy === type && (
                                        <div className="text-[10px] font-medium mt-1 opacity-80 leading-tight hidden md:block">
                                            {STRATEGIES[type].description}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Validation Warnings */}
                    {isWeightZero ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-4">
                            <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                                <Info size={32} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-black text-zinc-900 dark:text-white">목표 비중이 설정되지 않았습니다</h4>
                                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                    리밸런싱 분석을 시작하려면 각 종목의 [편집] 버튼을 눌러<br />
                                    원하는 목표 비중(%)을 먼저 입력해주세요.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {isWeightInbalanced && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                                    <p className="text-xs font-bold text-red-900 dark:text-red-300">
                                        경고: 설정된 목표 비중의 합계가 {totalTargetWeight.toFixed(1)}%입니다. (100%가 되어야 정확한 분석이 가능합니다)
                                    </p>
                                </div>
                            )}

                            {/* Suggestions Table */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">수행 제안 리스트</label>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                        <Info size={12} />
                                        오차 범위: ±{STRATEGIES[strategy].tolerance}%
                                    </div>
                                </div>

                                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                <th className="p-4 text-[11px] font-black text-zinc-500 uppercase">종목</th>
                                                <th className="p-4 text-right text-[11px] font-black text-zinc-500 uppercase">현재 비중</th>
                                                <th className="p-4 text-right text-[11px] font-black text-zinc-500 uppercase">목표 비중</th>
                                                <th className="p-4 text-center text-[11px] font-black text-zinc-500 uppercase">제안</th>
                                                <th className="p-4 text-[11px] font-black text-zinc-500 uppercase">사유</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {suggestions.map((s) => (
                                                <tr key={s.ticker} className="dark:bg-zinc-900/30">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.name}</div>
                                                        <div className="text-[10px] font-mono text-zinc-500">{s.ticker}</div>
                                                    </td>
                                                    <td className="p-4 text-right text-sm font-mono text-zinc-600 dark:text-zinc-400">
                                                        {(analysisData.find(d => d.ticker === s.ticker)?.currentWeight || 0).toFixed(1)}%
                                                    </td>
                                                    <td className="p-4 text-right text-sm font-mono font-bold text-zinc-900 dark:text-white">
                                                        {(analysisData.find(d => d.ticker === s.ticker)?.targetWeight || 0).toFixed(1)}%
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${s.action === 'BUY'
                                                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20'
                                                            : s.action === 'SELL'
                                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                                                : 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800'
                                                            }`}>
                                                            {s.action === 'BUY' && <TrendingUp size={10} />}
                                                            {s.action === 'SELL' && <TrendingDown size={10} />}
                                                            {s.action === 'HOLD' && <CheckCircle2 size={10} />}
                                                            {s.action === 'BUY' ? '매수' : s.action === 'SELL' ? '매도' : '유지'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                                        {s.reason}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Summary Caution */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex gap-3">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">리밸런싱 주의사항</p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                위 분석 결과는 과거 데이터를 기반으로 한 수학적 제안일 뿐이며, 투자 결과에 대한 책임은 본인에게 있습니다.
                                거래 비용(수수료, 세금) 등 실제 시장 환경에 따라 차이가 발생할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-xl hover:scale-105 transition-all shadow-lg"
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    )
}
