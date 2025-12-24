'use client'

import React, { useEffect, useRef } from 'react'
import {
    createChart,
    ColorType,
    IChartApi,
    ISeriesApi,
    CandlestickSeries,
    HistogramSeries,
    CrosshairMode,
    Time
} from 'lightweight-charts'

interface CompositeStockChartProps {
    priceData: {
        date: string
        open: number
        high: number
        low: number
        close: number
    }[]
    supplyData?: {
        date: string
        foreigner: number
        institution: number
    }[] | null
}

export default function CompositeStockChart({ priceData, supplyData }: CompositeStockChartProps) {
    const mainContainerRef = useRef<HTMLDivElement>(null)
    const supplyContainerRef = useRef<HTMLDivElement>(null)

    const mainChartRef = useRef<IChartApi | null>(null)
    const supplyChartRef = useRef<IChartApi | null>(null)

    useEffect(() => {
        if (!mainContainerRef.current || !supplyContainerRef.current) return

        const isDark = document.documentElement.classList.contains('dark')
        const textColor = isDark ? '#a1a1aa' : '#71717a'
        const gridColor = isDark ? '#27272a' : '#f4f4f5'

        const commonOptions = {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                borderVisible: false,
                visible: true,
            },
        }

        const formatDate = (date: string) => {
            if (!date) return ''
            // Handle ISO string (YYYY-MM-DDTHH:mm:SS...)
            if (date.includes('T')) return date.split('T')[0]
            // Handle YYYYMMDD (Python Analyzer format: 20250925)
            if (date.length === 8 && !date.includes('-')) {
                return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
            }
            // Already YYYY-MM-DD or other format
            return date
        }

        // 1. Main Price Chart (Candlesticks)
        mainChartRef.current = createChart(mainContainerRef.current, {
            ...commonOptions,
            width: mainContainerRef.current.clientWidth,
            height: 400,
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                ...commonOptions.timeScale,
                visible: false, // Hide time scale on top chart
            }
        })

        const candleSeries = mainChartRef.current.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
        })

        const formattedPrice = priceData
            .map(d => ({
                time: formatDate(d.date) as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }))
            .sort((a, b) => (a.time as string).localeCompare(b.time as string))

        candleSeries.setData(formattedPrice)

        // 2. Supply Chart (Histograms)
        supplyChartRef.current = createChart(supplyContainerRef.current, {
            ...commonOptions,
            width: supplyContainerRef.current.clientWidth,
            height: 150,
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.1,
                },
            },
            timeScale: {
                ...commonOptions.timeScale,
                visible: true,
            }
        })

        const foreignSeries = supplyChartRef.current.addSeries(HistogramSeries, {
            color: '#ef4444',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'right',
        })

        const instSeries = supplyChartRef.current.addSeries(HistogramSeries, {
            color: '#f59e0b',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'right',
        })

        if (supplyData && supplyData.length > 0) {
            const formattedForeign = supplyData.map(d => ({
                time: formatDate(d.date) as Time,
                value: d.foreigner,
                color: d.foreigner >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
            }))
            const formattedInst = supplyData.map(d => ({
                time: formatDate(d.date) as Time,
                value: d.institution,
                color: d.institution >= 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(99, 102, 241, 0.8)',
            }))

            foreignSeries.setData(formattedForeign)
            instSeries.setData(formattedInst)
        }

        // 3. Synchronization Logic
        const mainTimeScale = mainChartRef.current.timeScale()
        const supplyTimeScale = supplyChartRef.current.timeScale()

        mainChartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (range) supplyTimeScale.setVisibleRange(range)
        })

        supplyChartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (range) mainTimeScale.setVisibleRange(range)
        })

        // Synchronize crosshair
        mainChartRef.current.subscribeCrosshairMove((param) => {
            if (param.time) {
                supplyChartRef.current?.setCrosshairPosition(param.point as any, param.time, foreignSeries)
            }
        })

        supplyChartRef.current.subscribeCrosshairMove((param) => {
            if (param.time) {
                mainChartRef.current?.setCrosshairPosition(param.point as any, param.time, candleSeries)
            }
        })

        mainChartRef.current.timeScale().fitContent()

        const handleResize = () => {
            if (mainChartRef.current && mainContainerRef.current) {
                mainChartRef.current.applyOptions({ width: mainContainerRef.current.clientWidth })
            }
            if (supplyChartRef.current && supplyContainerRef.current) {
                supplyChartRef.current.applyOptions({ width: supplyContainerRef.current.clientWidth })
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            mainChartRef.current?.remove()
            supplyChartRef.current?.remove()
        }
    }, [priceData, supplyData])

    return (
        <div className="flex flex-col gap-0 w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-4 pt-2 flex justify-between items-center">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    Price & Supply Trend (Candlestick)
                </h3>
                <div className="flex gap-4 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-sm" /> 외인</span>
                    <span className="flex items-center gap-1.5 text-amber-500"><div className="w-2 h-2 bg-amber-500 rounded-sm" /> 기관</span>
                </div>
            </div>

            <div ref={mainContainerRef} className="w-full relative" />
            <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 mx-4" />
            <div ref={supplyContainerRef} className="w-full relative" />

            <div className="px-4 pb-2 flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                <span>Drag to pan · Scroll to zoom</span>
                <span>Data Synchronized by Date</span>
            </div>
        </div>
    )
}
