'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Coins } from 'lucide-react'
import { addTicker } from '@/app/actions'

interface CashDialogProps {
    onClose: () => void
}

export default function CashDialog({ onClose }: CashDialogProps) {
    const [amount, setAmount] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Cash uses ticker '_CASH_', quantity = amount, price = 1
            const res = await addTicker('_CASH_', amount, 1)
            if (res.error) {
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
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <h3 className="text-xl font-black text-yellow-900 dark:text-yellow-500 flex items-center gap-2">
                        <Coins size={24} />
                        현금 자산 추가
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">추가할 현금 (원)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₩</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl pl-10 pr-4 py-3 text-lg font-black focus:ring-2 focus:ring-yellow-500 transition-all text-right"
                                    placeholder="0"
                                    required
                                    min="1"
                                />
                            </div>
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
                            className="flex-[2] px-6 py-4 font-black rounded-xl text-white shadow-lg bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            <Plus size={18} />
                            추가하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
