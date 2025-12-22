
'use client'

import { useState } from 'react'
import { Activity, X, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { getAnalysis, AnalysisReport } from '@/app/actions_analysis'

interface AnalysisPanelProps {
    ticker: string
    onClose: () => void
}

export default function AnalysisPanel({ ticker, onClose }: AnalysisPanelProps) {
    const [report, setReport] = useState<AnalysisReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Fetch on mount
    useState(() => {
        const fetch = async () => {
            setLoading(true)
            const result = await getAnalysis(ticker)
            if ('error' in result) {
                setError(result.error)
            } else {
                setReport(result)
            }
            setLoading(false)
        }
        fetch()
    })

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-white shadow-2xl animate-in slide-in-from-right duration-300 border-l overflow-y-auto">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="text-blue-600" />
                        Analysis: {ticker}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                    <div className="p-4 bg-red-50 text-red-600 rounded-md">
                        {error}
                    </div>
                )}

                {report && (
                    <div className="space-y-6">
                        {/* 1. Price Summary */}
                        <div className="flex items-end gap-3 pb-4 border-b">
                            <span className="text-3xl font-bold">
                                {report.price.current.toLocaleString()}
                            </span>
                            <span className={`text-lg font-medium flex items-center ${report.price.changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {report.price.changePercent > 0 ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                                {report.price.changePercent.toFixed(2)}%
                            </span>
                        </div>

                        {/* 2. AI/Rule Summary */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-bold text-blue-800 text-sm mb-2">DailyPort Insight</h3>
                            <p className="text-sm text-blue-700 leading-relaxed">
                                {report.summary}
                            </p>
                        </div>

                        {/* 3. Technical Indicators */}
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3">Technical Indicators</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <div className="text-xs text-gray-500">RSI (14)</div>
                                    <div className="font-bold text-lg">
                                        {report.technical.rsi.value.toFixed(1)}
                                        <span className={`text-xs ml-2 px-2 py-0.5 rounded ${report.technical.rsi.status === 'OVERBOUGHT' ? 'bg-red-100 text-red-600' :
                                            report.technical.rsi.status === 'OVERSOLD' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {report.technical.rsi.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <div className="text-xs text-gray-500">Trend (EMA)</div>
                                    <div className="font-bold text-sm mt-1">
                                        {report.technical.trend.status}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Supply & Demand */}
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3">Supply & Demand (KRX/KIS)</h3>
                            {report.supplyDemand ? (
                                <div className="border rounded-md p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Foreign Net Buy</span>
                                        <span className={`font-mono font-bold ${report.supplyDemand.foreignNetBuy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            {report.supplyDemand.foreignNetBuy.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Inst. Net Buy</span>
                                        <span className={`font-mono font-bold ${report.supplyDemand.instNetBuy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            {report.supplyDemand.instNetBuy.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-xs text-right text-gray-400 mt-2">
                                        Source: {report.supplyDemand.source} ({new Date(report.supplyDemand.updatedAt).toLocaleDateString()})
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 italic">
                                    No supply data available. Run admin tool.
                                </div>
                            )}
                        </div>

                        {/* Disclaimer */}
                        <div className="mt-8 pt-4 border-t border-gray-100">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={async () => {
                                        if (!report) return
                                        const btn = document.getElementById('btn-telegram') as HTMLButtonElement
                                        if (btn) btn.disabled = true;
                                        if (btn) btn.innerHTML = 'Sending...';

                                        const res = await import('@/app/actions_notification').then(m => m.sendAnalysisToTelegram(report))

                                        if (res.success) alert('Sent to Telegram!')
                                        else alert('Failed: ' + res.error)

                                        if (btn) btn.disabled = false;
                                        if (btn) btn.innerHTML = 'Send to Telegram';
                                    }}
                                    id="btn-telegram"
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
                                >
                                    <span>✈️ Send to Telegram</span>
                                </button>
                            </div>
                            <div className="flex gap-2 text-gray-400 text-xs">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>
                                    This report is for informational purposes only and does not constitute financial advice.
                                    Investment decisions are solely your responsibility.
                                    Data delayed by at least 15 minutes (Yahoo Finance).
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
