'use client'

import { useState } from 'react'
import { Trash2, Activity } from 'lucide-react'
import { removeTicker } from '@/app/actions'
import AnalysisPanel from './AnalysisPanel'
import { getStockName } from '@/utils/stockUtils'

interface PortfolioItem {
    id: string
    ticker: string
    quantity: number
    entry_price: number
    currency: string
}

export default function PortfolioList({ items }: { items: PortfolioItem[] }) {
    const [deleting, setDeleting] = useState<string | null>(null)
    const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null)

    const handleDelete = async (ticker: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return
        setDeleting(ticker)
        await removeTicker(ticker)
        setDeleting(null)
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                No stocks in portfolio. Start by adding one!
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-lg shadowoverflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">종목명</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">수량</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">평균 단가</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">평가금액 (추정)</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                            <tr key={item.ticker}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            {getStockName(item.ticker)}
                                            <button
                                                onClick={() => setAnalyzingTicker(item.ticker)}
                                                className="text-blue-500 hover:text-blue-700 transition-colors" title="분석하기">
                                                <Activity size={14} />
                                            </button>
                                        </div>
                                        <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500">
                                            {item.ticker}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.quantity.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.entry_price.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">{item.currency}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-zinc-900 dark:text-white">
                                    {(item.quantity * item.entry_price).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(item.ticker)}
                                        disabled={deleting === item.ticker}
                                        className="text-red-600 hover:text-red-900 disabled:opacity-30"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {analyzingTicker && (
                <AnalysisPanel
                    ticker={analyzingTicker}
                    onClose={() => setAnalyzingTicker(null)}
                />
            )}
        </>
    )
}
