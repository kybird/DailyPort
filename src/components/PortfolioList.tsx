'use client'

import { Trash2, Activity } from 'lucide-react'
import { removeTicker } from '@/app/actions'
import { useState } from 'react'
import AnalysisPanel from './AnalysisPanel'

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
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value (Est)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                            <tr key={item.ticker}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {item.ticker}
                                        <button
                                            onClick={() => setAnalyzingTicker(item.ticker)}
                                            className="text-blue-400 hover:text-blue-600" title="Analyze">
                                            <Activity size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                    {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                    {item.entry_price.toLocaleString()} {item.currency}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
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
