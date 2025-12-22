
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4">Add Portfolio Item</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                        <StockSearch onSelect={setSelectedStock} />
                        {selectedStock && (
                            <div className="mt-2 text-sm text-blue-600 font-medium">
                                Selected: {selectedStock.name} ({selectedStock.ticker})
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-3 py-2 border rounded-md"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Price (KRW)</label>
                            <input
                                type="number"
                                step="1"
                                className="w-full px-3 py-2 border rounded-md"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedStock}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
