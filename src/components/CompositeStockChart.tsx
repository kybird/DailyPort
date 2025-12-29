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
    IChartApi,
    BaselineSeries
} from 'lightweight-charts'
import { Settings2, Eye, EyeOff, X, SlidersHorizontal } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

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
    objectives?: {
        short?: any
        mid?: any
        long?: any
    }
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

export default function CompositeStockChart({ priceData, supplyData, objectives }: CompositeStockChartProps) {
    const priceContainerRef = useRef<HTMLDivElement>(null)
    const foreignContainerRef = useRef<HTMLDivElement>(null)
    const institutionContainerRef = useRef<HTMLDivElement>(null)

    // --- State Management ---
    const [showSettings, setShowSettings] = useState(false)
    const [config, setConfig] = useState({
        ma: { show: true, p1: 5, p2: 20, p3: 60, p4: 120 },
        ema: { show: false, p1: 5, p2: 20, p3: 60, p4: 120 },
        bb: { show: false, p: 20, sd: 2 }
    })
    const [selectedObjective, setSelectedObjective] = useState<'short' | 'mid' | 'long' | null>(null)

    const { theme } = useTheme()

    useEffect(() => {
        if (!priceContainerRef.current || !foreignContainerRef.current || !institutionContainerRef.current) return

        const isDark = theme === 'dark'
        const textColor = isDark ? '#a3a3a3' : '#333333' // neutral-400 : gray-800
        const gridColor = isDark ? '#262626' : '#f5f5f5' // neutral-800 : neutral-100
        const borderColor = isDark ? '#262626' : '#e5e5e5' // neutral-800 : neutral-200

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
            rightPriceScale: {
                borderColor: borderColor,
                minimumWidth: 90,
            },
            timeScale: {
                borderVisible: false,
                visible: true,
                fixLeftEdge: true,
                fixRightEdge: false,
                rightOffset: 15,
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

        // 🎯 Trading Objectives Price Lines & Visual Zones (RR Boxes)
        if (selectedObjective && objectives?.[selectedObjective]) {
            const obj = objectives[selectedObjective]
            const lastBar = formattedPrice[formattedPrice.length - 1]
            const boxWidth = 50 // Show zone for the last 50 bars
            const startIndex = Math.max(0, formattedPrice.length - boxWidth)
            const zoneData = formattedPrice.slice(startIndex).map(p => ({ time: p.time }))



            // 🟩 Profit Zone (Target) - Green filling Up from Entry
            if (obj.entry && obj.target) {
                const profitZone = priceChart.addSeries(BaselineSeries, {
                    baseValue: { type: 'price', price: obj.entry },
                    topLineColor: 'rgba(16, 185, 129, 0.5)', // Green Line
                    topFillColor1: 'rgba(16, 185, 129, 0.2)', // Green Grad 1
                    topFillColor2: 'rgba(16, 185, 129, 0.05)', // Green Grad 2
                    bottomLineColor: 'transparent',
                    bottomFillColor1: 'transparent',
                    bottomFillColor2: 'transparent',
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    autoscaleInfoProvider: () => null,
                })
                profitZone.setData(zoneData.map(d => ({ ...d, value: obj.target })))
            }

            // 🟥 Loss Zone (Stop) - Red filling Down from Entry
            if (obj.entry && obj.stop) {
                const lossZone = priceChart.addSeries(BaselineSeries, {
                    baseValue: { type: 'price', price: obj.entry },
                    topLineColor: 'transparent',
                    topFillColor1: 'transparent',
                    topFillColor2: 'transparent',
                    bottomLineColor: 'rgba(239, 68, 68, 0.5)', // Red Line
                    bottomFillColor1: 'rgba(239, 68, 68, 0.05)', // Red Grad 1
                    bottomFillColor2: 'rgba(239, 68, 68, 0.2)', // Red Grad 2
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    autoscaleInfoProvider: () => null,
                })
                lossZone.setData(zoneData.map(d => ({ ...d, value: obj.stop })))
            }

            // Price Lines for levels
            if (obj.entry) {
                candleSeries.createPriceLine({
                    price: obj.entry,
                    color: '#a1a1aa',
                    lineWidth: 2,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: `📍 모델 진입선 (손익비: ${obj.rr?.toFixed(1)})`,
                })
            }
            if (obj.target) {
                candleSeries.createPriceLine({
                    price: obj.target,
                    color: '#10b981', // Green
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: '🎯 모델 상한선',
                })
            }
            if (obj.stop) {
                candleSeries.createPriceLine({
                    price: obj.stop,
                    color: '#ef4444', // Red
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: '🛑 모델 하한선',
                })
            }
        }

        const closeValues = formattedPrice.map(p => ({ time: p.time, value: p.close }))

        // SMA Series
        if (config.ma.show) {
            const ma1 = priceChart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, title: `MA${config.ma.p1}` }) // Pink
            const ma2 = priceChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: `MA${config.ma.p2}` }) // Amber
            const ma3 = priceChart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: `MA${config.ma.p3}` }) // Emerald
            const ma4 = priceChart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 2, title: `MA${config.ma.p4}` }) // Indigo
            ma1.setData(calculateSMA(closeValues, config.ma.p1))
            ma2.setData(calculateSMA(closeValues, config.ma.p2))
            ma3.setData(calculateSMA(closeValues, config.ma.p3))
            ma4.setData(calculateSMA(closeValues, config.ma.p4))
        }

        // EMA Series
        if (config.ema.show) {
            const e1 = priceChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: `EMA${config.ema.p1}`, lineStyle: 2 }) // Violet
            const e2 = priceChart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 1, title: `EMA${config.ema.p2}`, lineStyle: 2 }) // Orange
            const e3 = priceChart.addSeries(LineSeries, { color: '#0ea5e9', lineWidth: 1, title: `EMA${config.ema.p3}`, lineStyle: 2 }) // Sky
            const e4 = priceChart.addSeries(LineSeries, { color: '#f43f5e', lineWidth: 1, title: `EMA${config.ema.p4}`, lineStyle: 2 }) // Rose
            e1.setData(calculateEMA(closeValues, config.ema.p1))
            e2.setData(calculateEMA(closeValues, config.ema.p2))
            e3.setData(calculateEMA(closeValues, config.ema.p3))
            e4.setData(calculateEMA(closeValues, config.ema.p4))
        }

        // Bollinger Bands
        if (config.bb.show) {
            const bb = calculateBollingerBands(closeValues, config.bb.p, config.bb.sd)
            const upper = priceChart.addSeries(LineSeries, { color: 'rgba(56, 189, 248, 0.6)', lineWidth: 1, title: 'BB Upper' })
            const lower = priceChart.addSeries(LineSeries, { color: 'rgba(56, 189, 248, 0.6)', lineWidth: 1, title: 'BB Lower' })
            upper.setData(bb.map(d => ({ time: d.time, value: d.upper })))
            lower.setData(bb.map(d => ({ time: d.time, value: d.lower })))
            // Note: Single AreaSeries range fill is not supported in standard lightweight-charts
            // Removing problematic bg series that was filling to bottom.
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
                charts.forEach((oc: any, oi) => {
                    if (index !== oi) {
                        // Ensure series exists before syncing
                        const targetSeries = seriesList[oi];
                        if (!targetSeries) return;

                        if (!param.time || !param.point) {
                            // If clearing, we pass explicitly null or use clearCrosshairPosition if available?
                            // Lightweight charts requires setCrosshairPosition(0, 0, series) to clear, or null.
                            // But some versions crash on null. Let's try skipping clear if it crashes, 
                            // or better: Check if we have valid data.
                            // For now, let's wrap in try-catch to prevent crashing the whole app.
                            try {
                                oc.clearCrosshairPosition(); // Try clear method
                            } catch {
                                try {
                                    oc.setCrosshairPosition(null, null, targetSeries);
                                } catch (e) {
                                    // Ignore clear errors
                                }
                            }
                        } else {
                            try {
                                oc.setCrosshairPosition(0, param.time, targetSeries);
                            } catch (e) {
                                // Ignore sync errors
                            }
                        }
                    }
                });
            });
        });

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
    }, [priceData, supplyData, config, objectives, selectedObjective, theme])

    return (
        <div className="relative flex flex-col gap-0 w-full bg-white dark:bg-neutral-900/50 rounded-3xl p-4 border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm overflow-hidden">
            {/* --- Chart Settings Modal --- */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                                보조지표 설정 (Settings)
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">단순 이동평균 (SMA)</label>
                                    <input type="checkbox" checked={config.ma.show} onChange={e => setConfig({ ...config, ma: { ...config.ma, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {['p1', 'p2', 'p3', 'p4'].map((p, i) => (
                                        <div key={p} className="space-y-1">
                                            <span className="text-[10px] font-bold text-zinc-400">기간 {i + 1}</span>
                                            <input
                                                type="number"
                                                value={(config.ma as unknown as Record<string, number>)[p]}
                                                onChange={e => setConfig({ ...config, ma: { ...config.ma, [p]: parseInt(e.target.value) || 1 } })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* EMA Settings */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">지수 이동평균 (EMA)</label>
                                    <input type="checkbox" checked={config.ema.show} onChange={e => setConfig({ ...config, ema: { ...config.ema, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {['p1', 'p2', 'p3', 'p4'].map((p, i) => (
                                        <div key={p} className="space-y-1">
                                            <span className="text-[10px] font-bold text-zinc-400">EMA {i + 1}</span>
                                            <input
                                                type="number"
                                                value={(config.ema as unknown as Record<string, number>)[p]}
                                                onChange={e => setConfig({ ...config, ema: { ...config.ema, [p]: parseInt(e.target.value) || 1 } })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* BB Settings */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">볼린저 밴드</label>
                                    <input type="checkbox" checked={config.bb.show} onChange={e => setConfig({ ...config, bb: { ...config.bb, show: e.target.checked } })} className="w-10 h-5 accent-indigo-500 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-400">기간</span>
                                        <input
                                            type="number"
                                            value={config.bb.p}
                                            onChange={e => setConfig({ ...config, bb: { ...config.bb, p: parseInt(e.target.value) || 1 } })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-400">표준편차 (Std Dev)</span>
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
                            지표 설정 완료
                        </button>
                    </div>
                </div>
            )}

            <div className="px-4 pt-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        정밀 차트 진단
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold">
                        {config.ma.show && (
                            <>
                                <span className="flex items-center gap-1.5 text-pink-500"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full" /> MA{config.ma.p1}</span>
                                <span className="flex items-center gap-1.5 text-amber-500"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> MA{config.ma.p2}</span>
                                <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> MA{config.ma.p3}</span>
                                <span className="flex items-center gap-1.5 text-indigo-500"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> MA{config.ma.p4}</span>
                            </>
                        )}
                        {config.ema.show && (
                            <>
                                <span className="flex items-center gap-1.5 text-violet-500"><div className="w-1.5 h-0.5 bg-violet-500 rounded-full" /> EMA{config.ema.p1}</span>
                                <span className="flex items-center gap-1.5 text-orange-400"><div className="w-1.5 h-0.5 bg-orange-400 rounded-full" /> EMA{config.ema.p2}</span>
                                <span className="flex items-center gap-1.5 text-sky-500"><div className="w-1.5 h-0.5 bg-sky-500 rounded-full" /> EMA{config.ema.p3}</span>
                                <span className="flex items-center gap-1.5 text-rose-500"><div className="w-1.5 h-0.5 bg-rose-500 rounded-full" /> EMA{config.ema.p4}</span>
                            </>
                        )}
                        {config.bb.show && (
                            <span className="flex items-center gap-1.5 text-sky-400"><div className="w-2 h-1.5 bg-sky-400/20 border border-sky-400/40 rounded-sm" /> 볼린저 밴드 ({config.bb.p}, {config.bb.sd})</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 p-1.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
                        <button
                            onClick={() => setConfig({ ...config, ma: { ...config.ma, show: !config.ma.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.ma.show ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-600' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            {config.ma.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} MA
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, ema: { ...config.ema, show: !config.ema.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.ema.show ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-600' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            {config.ema.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} EMA
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, bb: { ...config.bb, show: !config.bb.show } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.bb.show ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-600' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            {config.bb.show ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} BB
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedObjective(selectedObjective === 'short' ? null : 'short')}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${selectedObjective === 'short' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900' : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-800'}`}
                        >
                            S
                        </button>
                        <button
                            onClick={() => setSelectedObjective(selectedObjective === 'mid' ? null : 'mid')}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${selectedObjective === 'mid' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900' : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-800'}`}
                        >
                            M
                        </button>
                        <button
                            onClick={() => setSelectedObjective(selectedObjective === 'long' ? null : 'long')}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${selectedObjective === 'long' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900' : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-800'}`}
                        >
                            L
                        </button>
                        <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                        >
                            <Settings2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <div className="relative group">
                    <div className="absolute top-4 left-4 z-10 text-[10px] font-black text-neutral-400 dark:text-neutral-500 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">주가 (가격)</div>
                    <div ref={priceContainerRef} className="w-full" />
                </div>

                <div className="h-[1px] bg-neutral-100 dark:bg-neutral-800" />

                <div className="relative group">
                    <div className="absolute top-2 left-4 z-10 text-[10px] font-black text-rose-400 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">외국인 순매수 (단위: 억)</div>
                    <div ref={foreignContainerRef} className="w-full" />
                </div>

                <div className="relative group">
                    <div className="absolute top-2 left-4 z-10 text-[10px] font-black text-amber-500 bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none uppercase">기관 순매수 (단위: 억)</div>
                    <div ref={institutionContainerRef} className="w-full" />
                </div>
            </div>

        </div>

    )
}
