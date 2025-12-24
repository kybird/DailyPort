'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import AnalysisPanel from '@/components/AnalysisPanel'

interface AnalysisContextType {
    openAnalysis: (ticker: string, mode?: 'watchlist' | 'portfolio', portfolioData?: { quantity: number; entryPrice: number }) => void
    closeAnalysis: () => void
    activeTicker: string | null
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: ReactNode }) {
    const [activeTicker, setActiveTicker] = useState<string | null>(null)
    const [mode, setMode] = useState<'watchlist' | 'portfolio'>('portfolio')
    const [portfolioData, setPortfolioData] = useState<{ quantity: number; entryPrice: number } | undefined>(undefined)

    const openAnalysis = (ticker: string, m: 'watchlist' | 'portfolio' = 'portfolio', pData?: { quantity: number; entryPrice: number }) => {
        setActiveTicker(ticker)
        setMode(m)
        setPortfolioData(pData)
    }

    const closeAnalysis = () => {
        setActiveTicker(null)
    }

    return (
        <AnalysisContext.Provider value={{ openAnalysis, closeAnalysis, activeTicker }}>
            {children}
            {activeTicker && (
                <AnalysisPanel
                    key={activeTicker}
                    ticker={activeTicker}
                    mode={mode}
                    portfolioData={portfolioData}
                    onClose={closeAnalysis}
                />
            )}
        </AnalysisContext.Provider>
    )
}

export function useAnalysis() {
    const context = useContext(AnalysisContext)
    if (context === undefined) {
        throw new Error('useAnalysis must be used within an AnalysisProvider')
    }
    return context
}
