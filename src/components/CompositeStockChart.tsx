'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
    createChart,
    ColorType,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    AreaSeries,
    CrosshairMode,
    Time,
    IChartApi
} from 'lightweight-charts'
import { Settings2, Eye, EyeOff, X, SlidersHorizontal } from 'lucide-react'

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

// --- Calculation Helpers ---

function calculateSMA(data: { time: Time, value: number }[], period: number) {
    if (data.length < period) return []
    const result = []
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue
        let sum = 0
        for (let j = 0; j < period; j++) sum += data[i - j].value
        result.push({ time: data[i].time, value: sum / period })
    }
    return result
}

function calculateEMA(data: { time: Time, value: number }[], period: number) {
    if (data.length === 0) return []
    const result = []
    const k = 2 / (period + 1)
    let ema = data[0].value
    result.push({ time: data[0].time, value: ema })
    for (let i = 1; i < data.length; i++) {
        ema = data[i].value * k + ema * (1 - k)
        result.push({ time: data[i].time, value: ema })
    }
    return result
}

function calculateBollingerBands(data: { time: Time, value: number }[], period: number, stdDev: number) {
    if (data.length < period) return []
    const result = []
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue
        const slice = data.slice(i - period + 1, i + 1)
        const mean = slice.reduce((acc, d) => acc + d.value, 0) / period
        const variance = slice.reduce((acc, d) => acc + Math.pow(d.value - mean, 2), 0) / period
        const sd = Math.sqrt(variance)
        result.push({
            time: data[i].time,
            upper: mean + stdDev * sd,
            middle: mean,
            lower: mean - stdDev * sd
        })
    }
    return result
}

export default function CompositeStockChart({ priceData, supplyData }: CompositeStockChartProps) {
    const priceContainerRef = useRef<HTMLDivElement>(null)
    const foreignContainerRef = useRef<HTMLDivElement>(null)
    const institutionContainerRef = useRef<HTMLDivElement>(null)

    // --- State Management ---
    const [showSettings, setShowSettings] = useState(false)
    const [config, setConfig] = useState({
        ma: { show: true, p1: 5, p2: 20, p3: 60 },
        ema: { show: false, p1: 12, p2: 26 },
        bb: { show: false, p: 20, sd: 2 }
    })

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
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: {
                borderVisible: false,
                visible: true,
                fixLeftEdge: true,
                fixRightEdge: true,
                minBarSpacing: 0.5,
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: { time: true, price: true } }
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

        const masterDates = formattedPrice.map(p => p.time)
        const supplyMap = new Map()
        if (supplyData) {
            supplyData.forEach(d => {
                const date = formatDate(d.date)
                supplyMap.set(date, { foreigner: d.foreigner, institution: d.institution })
            })
        }

        const normalizedForeigner = masterDates.map(time => {
            const data = supplyMap.get(time as string)
            const val = data ? data.foreigner : 0
            return {
                time,
                value: val,
                color: val >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)'
            }
        })

        const normalizedInstitution = masterDates.map(time => {
            const data = supplyMap.get(time as string)
            const val = data ? data.institution : 0
            return {
                time,
                value: val,
                color: val >= 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(99, 102, 241, 0.8)'
            }
        })

        // 1. Price Chart Init
        const priceChart = createChart(priceContainerRef.current, {
            ...commonOptions,
            width: priceContainerRef.current.clientWidth,
            height: 400,
            timeScale: { ...commonOptions.timeScale, visible: false },
        }) as IChartApi

        const candleSeries = priceChart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
        })
        candleSeries.setData(formattedPrice)

        const closeValues = formattedPrice.map(p => ({ time: p.time, value: p.close }))

        // SMA Series
        if (config.ma.show) {
            const ma1 = priceChart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, title: `MA${config.ma.p1}` })
            const ma2 = priceChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: `MA${config.ma.p2}` })
            const ma3 = priceChart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: `MA${config.ma.p3}` })
            ma1.setData(calculateSMA(closeValues, config.ma.p1))
            ma2.setData(calculateSMA(closeValues, config.ma.p2))
            ma3.setData(calculateSMA(closeValues, config.ma.p3))
        }

        // EMA Series
        if (config.ema.show) {
            const e1 = priceChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: `EMA${config.ema.p1}`, lineStyle: 2 })
            const e2 = priceChart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 1, title: `EMA${config.ema.p2}`, lineStyle: 2 })
            e1.setData(calculateEMA(closeValues, config.ema.p1))
            e2.setData(calculateEMA(closeValues, config.ema.p2))
        }

        // Bollinger Bands
        if (config.bb.show) {
            const bb = calculateBollingerBands(closeValues, config.bb.p, config.bb.sd)
            const upper = priceChart.addSeries(LineSeries, { color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1, title: 'BB Upper' })
            const lower = priceChart.addSeries(LineSeries, { color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1, title: 'BB Lower' })
            const bg = priceChart.addSeries(AreaSeries, {
                topColor: 'rgba(56, 189, 248, 0.05)',
                bottomColor: 'rgba(56, 189, 248, 0.05)',
                lineVisible: false,
                priceLineVisible: false,
            })
            upper.setData(bb.map(d => ({ time: d.time, value: d.upper })))
            lower.setData(bb.map(d => ({ time: d.time, value: d.lower })))
            bg.setData(bb.map(d => ({ time: d.time, value: d.upper, bottomValue: d.lower })))
        }

        // 2. Foreigner Chart Init
        const foreignChart = createChart(foreignContainerRef.current, {
            ...commonOptions,
            width: foreignContainerRef.current.clientWidth,
            height: 120,
            timeScale: { ...commonOptions.timeScale, visible: false },
        }) as IChartApi

        const foreignSeries = foreignChart.addSeries(HistogramSeries, {
            color: '#ef4444',
            priceFormat: { type: 'volume' },
        })
        foreignSeries.setData(normalizedForeigner)

        // 3. Institution Chart Init
        const instChart = createChart(institutionContainerRef.current, {
            ...commonOptions,
            width: institutionContainerRef.current.clientWidth,
            height: 120,
            timeScale: { ...commonOptions.timeScale, visible: true },
        }) as IChartApi

        const instSeries = instChart.addSeries(HistogramSeries, {
            color: '#f59e0b',
            priceFormat: { type: 'volume' },
        })
        instSeries.setData(normalizedInstitution)

        const charts = [priceChart, foreignChart, instChart]
        const seriesList = [candleSeries, foreignSeries, instSeries]

        // --- Synchronization Logic ---
        charts.forEach((chart, index) => {
            chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                if (!range) return
                charts.forEach((oc: any, oi) => { if (index !== oi) oc.timeScale().setVisibleLogicalRange(range) })
            })

            chart.subscribeCrosshairMove((param: any) => {
                if (!param.time || !param.point) {
                    charts.forEach((oc: any, oi) => { if (index !== oi) oc.setCrosshairPosition(undefined, undefined, seriesList[oi]) })
                    return
                }
                charts.forEach((oc: any, oi) => { if (index !== oi) oc.setCrosshairPosition(param.point, param.time, seriesList[oi]) })
            })
        })

        priceChart.timeScale().fitContent()

        const handleResize = () => {
            const containers = [priceContainerRef, foreignContainerRef, institutionContainerRef]
            charts.forEach((chart, i) => { if (containers[i].current) chart.applyOptions({ width: containers[i].current!.clientWidth }) })
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            charts.forEach(c => c.remove())
        }
    }, [priceData, supplyData, config])

    return (
        <div className="relative flex flex-col gap-0 w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* --- Chart Settings Modal --- */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                                Indicator Settings
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* SMA Settings */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Moving Average (SMA)</label>
                                    <input type="checkbox" checked={config.ma.show} onChange={e => setConfig({ ...config, ma: { ...config.ma, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {['p1', 'p2', 'p3'].map((p, i) => (
                                        <div key={p} className="space-y-1">
                                            <span className="text-[10px] font-bold text-zinc-400">Period {i + 1}</span>
                                            <input
                                                type="number"
                                                value={(config.ma as unknown as Record<string, number>)[p]}
                                                onChange={e => setConfig({ ...config, ma: { ...config.ma, [p]: parseInt(e.target.value) || 1 } })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* EMA Settings */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Exponential MA (EMA)</label>
                                    <input type="checkbox" checked={config.ema.show} onChange={e => setConfig({ ...config, ema: { ...config.ema, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {['p1', 'p2'].map((p, i) => (
                                        <div key={p} className="space-y-1">
                                            <span className="text-[10px] font-bold text-zinc-400">EMA {i + 1}</span>
                                            <input
                                                type="number"
                                                value={(config.ema as unknown as Record<string, number>)[p]}
                                                onChange={e => setConfig({ ...config, ema: { ...config.ema, [p]: parseInt(e.target.value) || 1 } })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* BB Settings */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Bollinger Bands (BB)</label>
                                    <input type="checkbox" checked={config.bb.show} onChange={e => setConfig({ ...config, bb: { ...config.bb, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-400">Period</span>
                                        <input
                                            type="number"
                                            value={config.bb.p}
                                            onChange={e => setConfig({ ...config, bb: { ...config.bb, p: parseInt(e.target.value) || 1 } })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-400">Std Dev</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={config.bb.sd}
                                            onChange={e => setConfig({ ...config, bb: { ...config.bb, sd: parseFloat(e.target.value) || 0.1 } })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all uppercase tracking-widest text-xs"
                        >
                            Apply Indicators
                        </button>
                    </div>
                </div>
            )}

            <div className="px-4 pt-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        Advanced Market Diagnostics
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold">
                        {config.ma.show && (
                            <>
                                <span className="flex items-center gap-1.5 text-pink-500"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full" /> MA{config.ma.p1}</span>
                                <span className="flex items-center gap-1.5 text-amber-500"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> MA{config.ma.p2}</span>
                                <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> MA{config.ma.p3}</span>
                            </>
                        )}
                        {config.ema.show && (
                            <>
                                <span className="flex items-center gap-1.5 text-violet-500"><div className="w-1.5 h-0.5 bg-violet-500 rounded-full" /> EMA{config.ema.p1}</span>
                                <span className="flex items-center gap-1.5 text-orange-400"><div className="w-1.5 h-0.5 bg-orange-400 rounded-full" /> EMA{config.ema.p2}</span>
                            </>
                        )}
                        {config.bb.show && (
                            <span className="flex items-center gap-1.5 text-sky-400"><div className="w-2 h-1.5 bg-sky-400/20 border border-sky-400/40 rounded-sm" /> Bollinger Bands ({config.bb.p}, {config.bb.sd})</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex gap-1 pr-2 border-r border-zinc-200 dark:border-zinc-700">
                        <button
                            onClick={() => setConfig({ ...config, ma: { ...config.ma, show: !config.ma.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.ma.show ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {config.ma.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} MA
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, ema: { ...config.ema, show: !config.ema.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.ema.show ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {config.ema.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} EMA
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, bb: { ...config.bb, show: !config.bb.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.bb.show ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {config.bb.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} BB
                        </button>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
                    >
                        <Settings2 className="w-3.5 h-3.5" /> 설정
                    </button>
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
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Synchronized 3-Pane (Pro Mode)</span>
                </div>
                <span>MA/EMA/BB Customizable Toolset</span>
            </div>
        </div>
    )
}
