'use client'

import { useEffect, useRef, useState } from 'react'
import { getKOSPIIntradayData, getKOSDAQIntradayData } from '@/utils/market-index'
import { useTheme } from '@/context/ThemeContext'
import type { IChartApi } from 'lightweight-charts'

// Dynamic import for lightweight-charts to avoid SSR issues
let createChart: typeof import('lightweight-charts').createChart | null = null
let LineSeries: typeof import('lightweight-charts').LineSeries | null = null

interface MarketIndexChartProps {
    index: 'KOSPI' | 'KOSDAQ'
}

export default function MarketIndexChart({ index }: MarketIndexChartProps) {
    const { theme } = useTheme()
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const [data, setData] = useState<{ time: string, price: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Load chart library dynamically
    useEffect(() => {
        const loadChart = async () => {
            try {
                const chartModule = await import('lightweight-charts')
                createChart = chartModule.createChart
                LineSeries = chartModule.LineSeries
            } catch (err) {
                console.error('Failed to load chart library:', err)
                setError('차트 라이브러리를 로드할 수 없습니다.')
            }
        }
        loadChart()
    }, [])

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const result = index === 'KOSPI'
                    ? await getKOSPIIntradayData()
                    : await getKOSDAQIntradayData()
                setData(result)
            } catch (err) {
                console.error('Failed to fetch market data:', err)
                setError('시장 데이터를 가져올 수 없습니다.')
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        // Set up real-time updates every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [index])

    // Create chart
    useEffect(() => {
        if (!chartContainerRef.current || !createChart || !LineSeries || data.length === 0) return

        const isDark = theme === 'dark'

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: isDark ? '#171717' : '#ffffff' }, // neutral-900 : white
                textColor: isDark ? '#a3a3a3' : '#333333', // neutral-400 : gray-800
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: isDark ? '#262626' : '#f5f5f5' }, // neutral-800 : neutral-100
                horzLines: { color: isDark ? '#262626' : '#f5f5f5' },
            },
            localization: {
                locale: 'ko-KR',
                priceFormatter: (price: number) => price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            },
            width: chartContainerRef.current.clientWidth,
            height: 200,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: isDark ? '#262626' : '#cccccc',
                barSpacing: 10,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            rightPriceScale: {
                borderColor: isDark ? '#262626' : '#cccccc',
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
            },
            crosshair: {
                vertLine: {
                    color: isDark ? '#525252' : '#94a3b8', // neutral-600
                    width: 1,
                    style: 2, // Dashed
                    labelBackgroundColor: isDark ? '#262626' : '#475569',
                },
                horzLine: {
                    color: isDark ? '#525252' : '#94a3b8',
                    width: 1,
                    style: 2, // Dashed
                    labelBackgroundColor: isDark ? '#262626' : '#475569',
                },
            },
            handleScroll: false,
            handleScale: false,
        })

        const lineSeries = chart.addSeries(LineSeries, {
            color: index === 'KOSPI' ? '#ef4444' : '#3b82f6', // Bright Red/Blue
            lineWidth: 3,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: true,
        })

        // Convert data to chart format
        const chartData = data.map(item => ({
            time: (Math.floor(new Date(item.time).getTime() / 1000) as unknown) as import('lightweight-charts').Time,
            value: item.price
        }))

        lineSeries.setData(chartData)

        // Fit content to show the full range
        chart.timeScale().fitContent()

        chartRef.current = chart

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                })
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [data, index, theme])

    const currentPrice = data.length > 0 ? data[data.length - 1].price : 0

    return (
        <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{index} Index</h3>
                <div className="text-xl font-black text-neutral-900 dark:text-white">
                    {data.length > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-48 text-gray-500">
                    차트 로딩 중...
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center h-48 text-red-500">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div ref={chartContainerRef} className="w-full h-48" />
            )}
        </div>
    )
}
