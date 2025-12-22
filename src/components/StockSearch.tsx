
'use client'

import { useState, useMemo } from 'react'
import stocksData from '@/data/stocks.json'
import { Search } from 'lucide-react'

type Stock = {
    ticker: string
    name: string
    market: string
    chosung: string
}

interface StockSearchProps {
    onSelect: (stock: Stock) => void
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search stock (Name, Ticker, Chosung)"
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {isOpen && filteredStocks.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredStocks.map((stock) => (
                        <li
                            key={stock.ticker}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                            onClick={() => {
                                onSelect(stock)
                                setQuery(stock.name)
                                setIsOpen(false)
                            }}
                        >
                            <div>
                                <span className="font-medium">{stock.name}</span>
                                <span className="text-gray-400 text-xs ml-2">{stock.market}</span>
                            </div>
                            <span className="text-sm text-gray-600 font-mono">{stock.ticker}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
