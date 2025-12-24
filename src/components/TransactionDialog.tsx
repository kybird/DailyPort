
'use client'

import { useState } from 'react'
import { Plus, Minus, X, Loader2 } from 'lucide-react'
import { addTicker, sellTicker } from '@/app/actions'
import { getStockName } from '@/utils/stockUtils'

interface TransactionDialogProps {
    ticker: string
    currentQuantity: number
    onClose: () => void
    initialType?: 'BUY' | 'SELL'
}

export default function TransactionDialog({ ticker, currentQuantity, onClose, initialType = 'BUY' }: TransactionDialogProps) {
    const [type, setType] = useState<'BUY' | 'SELL'>(initialType)
    const [quantity, setQuantity] = useState<number>(0)
    const [price, setPrice] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (quantity <= 0 || price <= 0) {
            setError('수량과 가격을 입력해주세요.')
            return
        }

        if (type === 'SELL' && quantity > currentQuantity) {
            setError('보유 수량보다 많이 팔 수 없습니다.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = type === 'BUY'
                ? await addTicker(ticker, quantity, price)
                : await sellTicker(ticker, quantity, price)

            if (res?.error) {
                setError(res.error)
            } else {
                onClose()
            }
        } catch (err: any) {
            setError(err.message || '오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                        {getStockName(ticker)} {type === 'BUY' ? '추가 매수' : '일부 매도'}
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('BUY')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${type === 'BUY' ? 'bg-white dark:bg-zinc-700 text-red-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <Plus size={16} /> 매수
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('SELL')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${type === 'SELL' ? 'bg-white dark:bg-zinc-700 text-blue-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <Minus size={16} /> 매도
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">수량</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={quantity || ''}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                    required
                                />
                                {type === 'SELL' && (
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(currentQuantity)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded"
                                    >
                                        MAX
                                    </button>
                                )}
                            </div>
                            {type === 'SELL' && (
                                <p className="text-[10px] text-zinc-500 font-medium">잔여 수량: {currentQuantity.toLocaleString()}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">가격 (단가)</label>
                            <input
                                type="number"
                                value={price || ''}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                placeholder="0"
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
                            className={`flex-[2] px-6 py-4 font-black rounded-xl text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${type === 'BUY' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            {type === 'BUY' ? '매수하기' : '매도하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
