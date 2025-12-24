import { getAnalysis } from '@/app/actions_analysis'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, RefreshCw } from 'lucide-react'


// TODO: Move Chart components to separate files if they get complex
// ensuring we use client-side charting library for charts


export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker: tickerParam } = await params
    const report = await getAnalysis(tickerParam)


    if ('error' in report) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Activity size={32} />
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                            데이터 수집 중...
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            현재 <b>{tickerParam}</b>에 대한 시장 데이터를 분석하고 있습니다.<br />
                            잠시 후 다시 확인해주세요.
                        </p>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-left text-xs text-zinc-400 space-y-2 font-mono">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="text-orange-500 font-bold">Waiting for Sync</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Ticker:</span>
                            <span>{tickerParam}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Error:</span>
                            <span className="truncate max-w-[150px]">{report.error}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/"
                            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            대시보드
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


    const { price, technical, supplyDemand, summary, generatedAt } = report

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-10">
            {/* Header */}
            <div className="space-y-4">
                <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">{report.ticker} Analysis</h1>
                        <p className="text-zinc-500 mt-2">Generated at {generatedAt ? new Date(generatedAt).toLocaleString() : 'Just now'}</p>
                    </div>
                    {price && (
                        <div className="text-right">
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">
                                ₩{price.current?.toLocaleString() || '-'}
                            </p>
                            <p className={`text-sm font-bold ${price.changePercent > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {price.changePercent > 0 ? '+' : ''}{price.changePercent?.toFixed(2) || '0.00'}%
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-900 dark:to-black p-8 rounded-2xl border border-indigo-100 dark:border-zinc-800">
                <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">Daily Insight</h2>
                <p className="text-xl font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {summary || "No summary available."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Technicals */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Technical Indicators</h3>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-zinc-500">Trend</span>
                            <span className={`font-bold ${technical?.trend?.status === 'UP_TREND' || technical?.trend?.status === 'GOLDEN_CROSS' ? 'text-red-500' : 'text-blue-500'}`}>
                                {technical?.trend?.status || 'NEUTRAL'}
                            </span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-zinc-500">RSI (14)</span>
                            <span className="font-bold text-zinc-900 dark:text-white">
                                {technical?.rsi?.value?.toFixed(1) || '-'} <span className="text-xs text-zinc-400">({technical?.rsi?.status || 'N/A'})</span>
                            </span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-zinc-500">MA (5 vs 20)</span>
                            <span className="font-bold text-zinc-900 dark:text-white">
                                {technical?.movingAverages?.ma5?.toLocaleString() || '-'} / {technical?.movingAverages?.ma20?.toLocaleString() || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Supply / Demand */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Supply & Demand</h3>
                    {supplyDemand ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Foreigner Net Buy (Latest)</div>
                                    <div className={`text-lg font-bold ${supplyDemand.foreignNetBuy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {supplyDemand.foreignNetBuy.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Institution Net Buy (Latest)</div>
                                    <div className={`text-lg font-bold ${supplyDemand.instNetBuy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {supplyDemand.instNetBuy.toLocaleString()}
                                    </div>
                                </div>
                            </div>


                            {/* Chart Placeholder - In a real app, use Recharts or Chart.js here with supplyDemand.chartData */}
                            <div className="mt-6 h-48 bg-zinc-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700">
                                <div className="text-center">
                                    <p className="text-zinc-400 text-sm">Supply Trend Chart</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Data Points: {supplyDemand.chartData ? supplyDemand.chartData.length : 0}
                                    </p>
                                    {/* Simple visualization using text bars for now to prove data flow */}
                                    <div className="flex items-end h-20 gap-1 mt-4 justify-center">
                                        {(supplyDemand.chartData || []).slice(-10).map((d: any, i: number) => (
                                            <div key={i} className={`w-2 ${d.institution > 0 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ height: `${Math.min(Math.abs(d.institution) / 10000, 100)}%` }} title={`Inst: ${d.institution}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-center">
                            No supply data available. Run the daily analyzer.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
