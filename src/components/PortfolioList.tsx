'use client'

import { useState, useMemo } from 'react'
import { Trash2, Activity, Pencil, TrendingUp, Coins, Plus, ArrowUpDown } from 'lucide-react'
import { removeTicker } from '@/app/actions'
import EditPortfolioDialog from './EditPortfolioDialog'
import CashDialog from './CashDialog'
import RebalancingAnalysis from './RebalancingAnalysis'
import { getStockName } from '@/utils/stock-utils'
import { useAnalysis } from '@/context/AnalysisContext'
import { getPriceColor, formatChangeRate, formatChangePrice } from '@/utils/format-utils'

interface PortfolioItem {
    id: string
    ticker: string
    quantity: number
    entry_price: number
    target_weight: number
    realized_gain?: number
    currency: string
    marketData?: {
        currentPrice: number
        changePrice?: number
        changePercent?: number
        historical?: any[]
    } | null
}

type SortKey = 'name' | 'quantity' | 'entryPrice' | 'currentPrice' | 'weight' | 'return' | 'valuation' | 'realized'

export default function PortfolioList({ items }: { items: PortfolioItem[] }) {
    const { openAnalysis } = useAnalysis()
    const [deleting, setDeleting] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
    const [showRebalancing, setShowRebalancing] = useState(false)
    const [showCashDialog, setShowCashDialog] = useState(false)
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null)

    // 총 평가금액 계산 (리밸런싱 분석용)
    const totalValuation = items.reduce((sum, item) => {
        const isCash = item.ticker === '_CASH_'
        const price = item.marketData?.currentPrice || (isCash ? 1 : item.entry_price)
        return sum + price * item.quantity
    }, 0)

    // Data Enrichment & Sorting
    const sortedItems = useMemo(() => {
        const enriched = items.map((item) => {
            const isCash = item.ticker === '_CASH_'
            const currentPrice = isCash ? 1 : (item.marketData?.currentPrice || 0)
            const itemValuation = currentPrice ? item.quantity * currentPrice : item.quantity * item.entry_price
            const currentWeight = totalValuation > 0 ? (itemValuation / totalValuation) * 100 : 0
            const returnPct = !isCash && currentPrice > 0 ? ((currentPrice - item.entry_price) / item.entry_price) * 100 : 0
            const name = isCash ? '현금' : getStockName(item.ticker)

            return {
                ...item,
                isCash,
                currentPrice,
                itemValuation,
                currentWeight,
                returnPct,
                name
            }
        })

        if (!sortConfig) return enriched

        return [...enriched].sort((a, b) => {
            const { key, direction } = sortConfig
            let valA: any = a[key as keyof typeof a]
            let valB: any = b[key as keyof typeof b]

            switch (key) {
                case 'name':
                    valA = a.name
                    valB = b.name
                    break
                case 'weight':
                    valA = a.currentWeight
                    valB = b.currentWeight
                    break
                case 'return':
                    valA = a.returnPct
                    valB = b.returnPct
                    break
                case 'valuation':
                    valA = a.itemValuation
                    valB = b.itemValuation
                    break
                case 'realized':
                    valA = a.realized_gain || 0
                    valB = b.realized_gain || 0
                    break
                case 'entryPrice':
                    valA = a.entry_price
                    valB = b.entry_price
                    break
                case 'currentPrice':
                    valA = a.currentPrice
                    valB = b.currentPrice
                    break
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1
            if (valA > valB) return direction === 'asc' ? 1 : -1
            return 0
        })
    }, [items, sortConfig, totalValuation])

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null
            }
            return { key, direction: 'desc' } // Default desc for numbers usually
        })
    }

    const startDelete = async (ticker: string) => {
        if (!confirm('포트폴리오에서 이 종목을 완전히 삭제할까요? (종목 자체가 사라집니다)')) return
        setDeleting(ticker)
        await removeTicker(ticker)
        setDeleting(null)
    }

    const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
        <th
            className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors select-none group"
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center justify-end gap-1">
                {label}
                <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortConfig?.key === sortKey ? 'opacity-100 text-blue-500' : ''}`} />
            </div>
        </th>
    )

    // Name header is left aligned
    const NameHeader = () => (
        <th
            className="px-6 py-3 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors select-none group"
            onClick={() => handleSort('name')}
        >
            <div className="flex items-center gap-1">
                종목명
                <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortConfig?.key === 'name' ? 'opacity-100 text-blue-500' : ''}`} />
            </div>
        </th>
    )

    if (items.length === 0) {
        return (
            <div className="text-center py-16 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <p>보유 중인 자산이 없습니다.</p>
                    <button
                        onClick={() => setShowCashDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all"
                    >
                        <Plus size={16} />
                        현금 자산 시작하기
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    보유 종목 리스트
                    <span className="text-xs font-bold text-zinc-400">({items.length})</span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCashDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-black rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-105"
                    >
                        <Plus size={14} />
                        현금 추가
                    </button>
                    <button
                        onClick={() => setShowRebalancing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        <TrendingUp size={14} />
                        리밸런싱 분석
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden overflow-x-auto transition-colors">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                        <tr>
                            <NameHeader />
                            <SortHeader label="수량" sortKey="quantity" />
                            <SortHeader label="평균 단가" sortKey="entryPrice" />
                            <SortHeader label="현재가" sortKey="currentPrice" />
                            <SortHeader label="비중 (목표/현재)" sortKey="weight" />
                            <SortHeader label="총수익률" sortKey="return" />
                            <SortHeader label="평가금액" sortKey="valuation" />
                            <SortHeader label="실현손익" sortKey="realized" />
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
                        {sortedItems.map((item) => (
                            <tr key={item.ticker} className={item.isCash ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            {item.isCash ? (
                                                <>
                                                    <span className="text-yellow-600 dark:text-yellow-500"><Coins size={16} /></span>
                                                    <span>현금 (KRW)</span>
                                                </>
                                            ) : (
                                                <>
                                                    {item.name}
                                                    <button
                                                        onClick={() => openAnalysis(item.ticker, 'portfolio', { quantity: item.quantity, entryPrice: item.entry_price })}
                                                        className="text-blue-500 hover:text-blue-700 transition-colors" title="분석하기">
                                                        <Activity size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {!item.isCash && (
                                            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500">
                                                {item.ticker}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.quantity.toLocaleString()} {item.isCash && '원'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.isCash ? '-' : `${item.entry_price.toLocaleString()} `} {!item.isCash && <span className="text-xs text-zinc-500 font-normal">{item.currency}</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.isCash ? '1' : (item.marketData?.currentPrice ? item.marketData.currentPrice.toLocaleString() : '-')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs ${item.isCash ? 'text-zinc-300' : 'text-zinc-400'} font-normal`}>목표 {item.target_weight || 0}%</span>
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.currentWeight.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-black ${getPriceColor(item.returnPct)}`}>
                                    {item.isCash ? '-' : formatChangeRate(item.returnPct)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-zinc-900 dark:text-white">
                                    {item.itemValuation.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${getPriceColor(item.realized_gain)}`}>
                                    {item.isCash ? '-' : formatChangePrice(item.realized_gain || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end items-center gap-3">
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="편집"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => startDelete(item.ticker)}
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


            {editingItem && (
                <EditPortfolioDialog
                    ticker={editingItem.ticker}
                    currentQuantity={editingItem.quantity}
                    currentEntryPrice={editingItem.entry_price}
                    currentTargetWeight={editingItem.target_weight || 0}
                    onClose={() => setEditingItem(null)}
                />
            )}

            {showCashDialog && (
                <CashDialog onClose={() => setShowCashDialog(false)} />
            )}

            {showRebalancing && (
                <RebalancingAnalysis
                    items={items}
                    totalValuation={totalValuation}
                    onClose={() => setShowRebalancing(false)}
                />
            )}
        </>
    )
}
