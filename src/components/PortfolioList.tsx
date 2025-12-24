'use client'

import { useState } from 'react'

import { Trash2, Activity, ArrowLeftRight } from 'lucide-react'
import { removeTicker } from '@/app/actions'
import AnalysisPanel from './AnalysisPanel'
import TransactionDialog from './TransactionDialog'
import { getStockName } from '@/utils/stockUtils'

interface PortfolioItem {
    id: string
    ticker: string
    quantity: number
    entry_price: number
    realized_gain?: number
    currency: string
}

export default function PortfolioList({ items }: { items: PortfolioItem[] }) {
    const [deleting, setDeleting] = useState<string | null>(null)
    const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null)
    const [tradingItem, setTradingItem] = useState<PortfolioItem | null>(null)

    const handleDelete = async (ticker: string) => {
        if (!confirm('포트폴리오에서 이 종목을 완전히 삭제할까요? (종목 자체가 사라집니다)')) return
        setDeleting(ticker)
        await removeTicker(ticker)
        setDeleting(null)
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-16 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors">
                보유 중인 주식이 없습니다. 종목을 추가해보세요!
            </div>
        )
    }

    return (
        <>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden overflow-x-auto transition-colors">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">종목명</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">수량</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">평균 단가</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">평가금액 (매수기준)</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">실현손익</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
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
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${item.realized_gain && item.realized_gain > 0 ? 'text-red-500' : item.realized_gain && item.realized_gain < 0 ? 'text-blue-500' : 'text-zinc-500'}`}>
                                    {item.realized_gain ? (item.realized_gain > 0 ? '+' : '') + item.realized_gain.toLocaleString() : '0'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end items-center gap-3">
                                        <button
                                            onClick={() => setTradingItem(item)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="거래 (매수/매도)"
                                        >
                                            <ArrowLeftRight size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.ticker)}
                                            disabled={deleting === item.ticker}
                                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                                            title="완전 삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
                    mode="portfolio"
                    portfolioData={(() => {
                        const item = items.find(i => i.ticker === analyzingTicker);
                        return item ? { quantity: item.quantity, entryPrice: item.entry_price } : undefined;
                    })()}
                />
            )}

            {tradingItem && (
                <TransactionDialog
                    ticker={tradingItem.ticker}
                    currentQuantity={tradingItem.quantity}
                    onClose={() => setTradingItem(null)}
                />
            )}
        </>
    )
}
