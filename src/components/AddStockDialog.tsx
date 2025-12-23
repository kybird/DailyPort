
'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import StockSearch from './StockSearch'
import { addTicker } from '@/app/actions'

export default function AddStockDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedStock, setSelectedStock] = useState<{ ticker: string, name: string } | null>(null)
    const [quantity, setQuantity] = useState('')
    const [price, setPrice] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStock || !quantity) return

        setLoading(true)
        setError('')

        // Server Action
        const result = await addTicker(
            selectedStock.ticker,
            Number(quantity),
            Number(price) || 0
        )

        setLoading(false)

        if (result.error) {
            setError(result.error)
            return
        }

        // Success
        setIsOpen(false)
        resetForm()
    }

    const resetForm = () => {
        setSelectedStock(null)
        setQuantity('')
        setPrice('')
        setError('')
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
                <Plus size={16} /> Add Stock
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800 transition-colors">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-black mb-6 text-zinc-900 dark:text-white">종목 추가</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">종목 검색</label>
                        <StockSearch onSelect={setSelectedStock} />
                        {selectedStock && (
                            <div className="mt-2 text-sm text-blue-600 font-medium">
                                Selected: {selectedStock.name} ({selectedStock.ticker})
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">수량</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white font-medium"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">평균 단가 (KRW)</label>
                            <input
                                type="number"
                                step="1"
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white font-medium"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-6 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedStock}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            {loading ? '추가 중...' : '확인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
