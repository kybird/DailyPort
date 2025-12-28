import { getAlgoFilterResults } from '@/app/actions-analysis'
import { getStockName } from '@/utils/stock-utils'
import Link from 'next/link'
import { ArrowRight, Trophy, DollarSign, Zap, Box, LineChart, AlertTriangle } from 'lucide-react'
import React from 'react'
import AlgoDashboard from './AlgoDashboard'

export default async function AlgoFilterPage() {
    // Fetch initial data on the server
    const results = await getAlgoFilterResults()

    return (
        <div className="space-y-10">
            {/* The Dashboard Component handles all UI logic (Tabs, Backtest View, etc.) */}
            <AlgoDashboard initialResults={results} />
        </div>
    )
}
