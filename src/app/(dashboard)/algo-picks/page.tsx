
import { getGuruPicks } from '@/app/actions_analysis'
import { getStockName } from '@/utils/stockUtils'
import Link from 'next/link'
import { ArrowRight, Trophy, TrendingUp, DollarSign, Zap, Box, Info, LineChart } from 'lucide-react'

// Strategy Icon Mapping
const strategyIcons: Record<string, any> = {
    'Value_Picks': DollarSign,
    'Twin_Engines': Zap,
    'Foreigner_Accumulation': Box,
    'Trend_Following': LineChart,
    'default': Trophy
}

const strategyDescriptions: Record<string, string> = {
    'Value_Picks': '저평가 우량주: 낮은 PER/PBR 지표를 가진 가치주',
    'Twin_Engines': '쌍끌이 매수: 외인과 기관이 동시 매수하는 강세 종목',
    'Foreigner_Accumulation': '외인 매집: 주가 횡보 중 외국인 비중이 늘어나는 종목',
    'Trend_Following': '추세추종: 상승 추세(정배열)를 그리며 신고가에 근접한 종목'
}

export default async function GuruPage() {
    const picks = await getGuruPicks()

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                        <Zap className="text-amber-500" />
                        Algo Picks
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        실시간 수급과 펀더멘털을 분석한 알고리즘 스크리닝 결과입니다.
                    </p>
                </div>
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

                            return (
                                <div key={`${pick.strategy_name}-${pick.date}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all group">
                                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-700">
                                                <Icon className="text-blue-600 dark:text-blue-400" size={24} />
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
                                            {pick.tickers.map((ticker) => (
                                                <Link
                                                    key={ticker}
                                                    href={`/analysis/${ticker}`}
                                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group/item"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-zinc-700 dark:text-zinc-200">
                                                            {getStockName(ticker)}
                                                        </span>
                                                        <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                            {ticker}
                                                        </span>
                                                    </div>
                                                    <ArrowRight size={14} className="text-zinc-300 group-hover/item:text-blue-500 transition-colors" />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            }
        </div >
    )
}
