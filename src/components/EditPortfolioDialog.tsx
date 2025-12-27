'use client'

import { useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { updatePortfolioItem } from '@/app/actions'
import { getStockName } from '@/utils/stock-utils'

interface EditPortfolioDialogProps {
    ticker: string
    currentQuantity: number
    currentEntryPrice: number
    currentTargetWeight: number
    onClose: () => void
}

export default function EditPortfolioDialog({
    ticker,
    currentQuantity,
    currentEntryPrice,
    currentTargetWeight,
    onClose
}: EditPortfolioDialogProps) {
    const [quantity, setQuantity] = useState<number>(currentQuantity)
    const [price, setPrice] = useState<number>(currentEntryPrice)
    const [targetWeight, setTargetWeight] = useState<number>(currentTargetWeight)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await updatePortfolioItem(ticker, quantity, price, targetWeight)
            if (res?.error) {
                setError(res.error)
            } else {
                onClose()
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '오류가 발생했습니다.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                        {getStockName(ticker)} 편집
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">보유 수량</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">평균 단가 (평단)</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">목표 비중 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(Number(e.target.value))}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-black rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-4 font-black rounded-xl text-white shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            <Save size={18} />
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
