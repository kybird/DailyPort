'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface AnalysisContextType {
    openAnalysis: (ticker: string, mode?: 'watchlist' | 'portfolio', portfolioData?: { quantity: number; entryPrice: number }) => void
    closeAnalysis: () => void
    activeTicker: string | null
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [activeTicker, setActiveTicker] = useState<string | null>(null)

    // Automatically close any residual state on navigation
    useEffect(() => {
        setActiveTicker(null)
    }, [pathname])

    const openAnalysis = (ticker: string) => {
        // Instead of opening a side panel, we navigate to the full analysis page
        router.push(`/analysis/${ticker}?ref=dashboard`)
    }

    const closeAnalysis = () => {
        setActiveTicker(null)
    }

    return (
        <AnalysisContext.Provider value={{ openAnalysis, closeAnalysis, activeTicker }}>
            {children}
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
