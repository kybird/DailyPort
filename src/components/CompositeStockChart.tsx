'use client'

import React, { useEffect, useRef } from 'react'
import {
    createChart,
    ColorType,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
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

// SMA Calculation Helper
function calculateSMA(data: { time: Time, value: number }[], period: number) {
    const result = []
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue
        let sum = 0
        for (let j = 0; j < period; j++) {
            sum += data[i - j].value
        }
        result.push({
            time: data[i].time,
            value: sum / period
        })
    }
    return result
}

export default function CompositeStockChart({ priceData, supplyData }: CompositeStockChartProps) {
    const priceContainerRef = useRef<HTMLDivElement>(null)
    const foreignContainerRef = useRef<HTMLDivElement>(null)
    const institutionContainerRef = useRef<HTMLDivElement>(null)

    const chartsRef = useRef<any[]>([])

    useEffect(() => {
        if (!priceContainerRef.current || !foreignContainerRef.current || !institutionContainerRef.current) return

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
            if (date.includes('T')) return date.split('T')[0]
            if (date.length === 8 && !date.includes('-')) {
                return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
            }
            return date
        }

        const formattedPrice = priceData
            .map(d => ({
                time: formatDate(d.date) as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }))
            .sort((a, b) => (a.time as string).localeCompare(b.time as string))

        // 1. Price Chart
        const priceChart = createChart(priceContainerRef.current, {
            ...commonOptions,
            width: priceContainerRef.current.clientWidth,
            height: 400,
            timeScale: { ...commonOptions.timeScale, visible: false },
        }) as any

        const candleSeries = priceChart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
        })
        candleSeries.setData(formattedPrice)

        const closeValues = formattedPrice.map(p => ({ time: p.time, value: p.close }))
        const ma5Series = priceChart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 1.5, title: 'MA5' })
        const ma20Series = priceChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, title: 'MA20' })
        const ma60Series = priceChart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1.5, title: 'MA60' })

        ma5Series.setData(calculateSMA(closeValues, 5))
        ma20Series.setData(calculateSMA(closeValues, 20))
        ma60Series.setData(calculateSMA(closeValues, 60))

        // 2. Foreigner Chart
        const foreignChart = createChart(foreignContainerRef.current, {
            ...commonOptions,
            width: foreignContainerRef.current.clientWidth,
            height: 120,
            timeScale: { ...commonOptions.timeScale, visible: false },
        }) as any

        const foreignSeries = foreignChart.addSeries(HistogramSeries, {
            color: '#ef4444',
            priceFormat: { type: 'volume' },
        })

        // 3. Institution Chart
        const instChart = createChart(institutionContainerRef.current, {
            ...commonOptions,
            width: institutionContainerRef.current.clientWidth,
            height: 120,
            timeScale: { ...commonOptions.timeScale, visible: true },
        }) as any

        const instSeries = instChart.addSeries(HistogramSeries, {
            color: '#f59e0b',
            priceFormat: { type: 'volume' },
        })

        if (supplyData && supplyData.length > 0) {
            const fData = supplyData.map(d => ({
                time: formatDate(d.date) as Time,
                value: d.foreigner,
                color: d.foreigner >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
            })).sort((a, b) => (a.time as string).localeCompare(b.time as string))

            const iData = supplyData.map(d => ({
                time: formatDate(d.date) as Time,
                value: d.institution,
                color: d.institution >= 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(99, 102, 241, 0.8)',
            })).sort((a, b) => (a.time as string).localeCompare(b.time as string))

            foreignSeries.setData(fData)
            instSeries.setData(iData)
        }

        const charts = [priceChart, foreignChart, instChart]
        const series = [candleSeries, foreignSeries, instSeries]
        chartsRef.current = charts

        // Synchronization
        charts.forEach((chart, index) => {
            // Time sync
            chart.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
                if (!range) return
                charts.forEach((otherChart, otherIndex) => {
                    if (index !== otherIndex) {
                        otherChart.timeScale().setVisibleRange(range)
                    }
                })
            })

            // Crosshair sync
            chart.subscribeCrosshairMove((param: any) => {
                if (!param.time || !param.point) {
                    charts.forEach((otherChart, otherIndex) => {
                        if (index !== otherIndex) otherChart.setCrosshairPosition(null, null, series[otherIndex])
                    })
                    return
                }
                charts.forEach((otherChart, otherIndex) => {
                    if (index !== otherIndex) {
                        otherChart.setCrosshairPosition(param.point, param.time, series[otherIndex])
                    }
                })
            })
        })

        priceChart.timeScale().fitContent()

        const handleResize = () => {
            const containers = [priceContainerRef.current, foreignContainerRef.current, institutionContainerRef.current]
            charts.forEach((chart, i) => {
                if (containers[i]) {
                    chart.applyOptions({ width: containers[i].clientWidth })
                }
            })
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            charts.forEach(c => c.remove())
        }
    }, [priceData, supplyData])

    return (
        <div className="flex flex-col gap-0 w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-4 pt-2 flex justify-between items-center mb-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        Advanced Market Diagnostics
                    </h3>
                    <div className="flex gap-4 text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-pink-500"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full" /> MA5</span>
                        <span className="flex items-center gap-1.5 text-amber-500"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> MA20</span>
                        <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> MA60</span>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <div className="relative group">
                    <div className="absolute top-4 left-4 z-10 text-[10px] font-black text-zinc-400 dark:text-zinc-500 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">Price (Candles)</div>
                    <div ref={priceContainerRef} className="w-full" />
                </div>

                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800" />

                <div className="relative group">
                    <div className="absolute top-2 left-4 z-10 text-[10px] font-black text-rose-400 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">Foreigner Supply</div>
                    <div ref={foreignContainerRef} className="w-full" />
                </div>

                <div className="relative group">
                    <div className="absolute top-2 left-4 z-10 text-[10px] font-black text-amber-500 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">Institution Supply</div>
                    <div ref={institutionContainerRef} className="w-full" />
                </div>
            </div>

            <div className="px-4 pb-2 pt-4 flex justify-between items-center text-[10px] text-zinc-400 font-medium border-t border-zinc-50 dark:border-zinc-800 mt-2">
                <span>Zoom & Scroll Synchronized (3-Pane Mode)</span>
                <span>SMA: International Standard Colors</span>
            </div>
        </div>
    )
}
