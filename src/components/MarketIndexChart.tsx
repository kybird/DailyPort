'use client'

import { useEffect, useRef, useState } from 'react'
import { getKOSPIIntradayData, getKOSDAQIntradayData } from '@/utils/market-index'
import { TrendingUp, TrendingDown } from 'lucide-react'

// Dynamic import for lightweight-charts to avoid SSR issues
let createChart: any = null
let LineSeries: any = null

interface MarketIndexChartProps {
    index: 'KOSPI' | 'KOSDAQ'
}

export default function MarketIndexChart({ index }: MarketIndexChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
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

        const isDark = document.documentElement.classList.contains('dark')

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: isDark ? '#18181b' : '#ffffff' }, // zinc-900 or white
                textColor: isDark ? '#a1a1aa' : '#333333',         // zinc-400 or gray-800
            },
            grid: {
                vertLines: { color: isDark ? '#27272a' : '#f0f0f0' }, // zinc-800 or light gray
                horzLines: { color: isDark ? '#27272a' : '#f0f0f0' },
            },
            localization: {
                timeFormatter: (time: number) => {
                    return new Intl.DateTimeFormat('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Seoul',
                    }).format(new Date(time * 1000));
                },
                priceFormatter: (price: number) => price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            },
            width: chartContainerRef.current.clientWidth,
            height: 200,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: isDark ? '#27272a' : '#cccccc',
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Seoul',
                    }).format(date);
                },
            },
            rightPriceScale: {
                borderColor: isDark ? '#27272a' : '#cccccc',
            },
            handleScroll: false,
            handleScale: false,
        })

        const lineSeries = chart.addSeries(LineSeries, {
            color: index === 'KOSPI' ? '#dc2626' : '#2563eb', // Red for KOSPI, Blue for KOSDAQ
            lineWidth: 2,
        })

        // Convert data to chart format
        const chartData = data.map(item => ({
            time: Math.floor(new Date(item.time).getTime() / 1000) as any,
            value: item.price
        }))

        lineSeries.setData(chartData)

        // Fit content
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
    }, [data, index])

    const currentPrice = data.length > 0 ? data[data.length - 1].price : 0
    const previousPrice = data.length > 1 ? data[data.length - 2].price : currentPrice
    const change = currentPrice - previousPrice
    const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{index} Index</h3>
                <div className="text-xl font-black text-zinc-900 dark:text-white">
                    {data.length > 0 ? data[data.length - 1].price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
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
