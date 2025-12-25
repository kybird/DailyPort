
'use client'

import { useState, useMemo } from 'react'
import stocksData from '@/data/stocks.json'
import { Search } from 'lucide-react'

interface StockSearchProps {
    onSelect: (stock: { code: string, name: string }) => void
}

export default function StockSearch({ onSelect }: StockSearchProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const filteredStocks = useMemo(() => {
        if (!query) return []
        const lowerQuery = query.toLowerCase()

        // Simple improvement: Prioritize matches
        return stocksData.filter((stock) =>
            stock.name.includes(query) ||
            stock.ticker.toLowerCase().includes(lowerQuery) ||
            stock.chosung.includes(lowerQuery)
        ).slice(0, 5) // Limit results
    }, [query])

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="종목명, 티커, 또는 초성으로 검색"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white font-medium"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredStocks.length > 0) {
                            e.preventDefault()
                            const stock = filteredStocks[0]
                            onSelect({ code: stock.code, name: stock.name })
                            setQuery(stock.name)
                            setIsOpen(false)
                        }
                    }}
                />

            </div>

            {isOpen && filteredStocks.length > 0 && (
                <ul className="absolute z-[250] w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-auto transition-colors">
                    {filteredStocks.map((stock) => (
                        <li
                            key={stock.ticker}
                            className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-950 cursor-pointer flex justify-between items-center transition-colors"
                            onClick={() => {
                                onSelect({ code: stock.code, name: stock.name })
                                setQuery(stock.name)
                                setIsOpen(false)
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">
                                    {stock.name[0]}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-zinc-900 dark:text-white leading-tight">{stock.name}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{stock.market}</span>
                                </div>
                            </div>
                            <span className="text-xs text-zinc-600 dark:text-zinc-500 font-mono font-bold bg-stone-200 dark:bg-zinc-800 px-2 py-1 rounded-md">{stock.ticker}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
