
'use client'

import React, { useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, AreaSeries } from 'lightweight-charts'

interface DailyPriceChartProps {
    data: {
        date: string
        close: number
    }[]
}

export default function DailyPriceChart({ data }: DailyPriceChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const lineSeriesRef = useRef<ISeriesApi<"Area"> | null>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                })
            }
        }

        const isDark = document.documentElement.classList.contains('dark')

        chartRef.current = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#a1a1aa' : '#71717a',
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            grid: {
                vertLines: { color: isDark ? '#27272a' : '#f4f4f5' },
                horzLines: { color: isDark ? '#27272a' : '#f4f4f5' },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                horzLine: {
                    visible: true,
                    labelVisible: true,
                },
                vertLine: {
                    visible: true,
                    labelVisible: true,
                    style: LineStyle.Dotted,
                },
            },
        })

        const areaSeries = chartRef.current.addSeries(AreaSeries, {
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineWidth: 2,
        })

        const formattedData = data.map(d => ({
            time: d.date.split('T')[0],
            value: d.close,
        })).sort((a, b) => a.time.localeCompare(b.time))

        areaSeries.setData(formattedData)
        lineSeriesRef.current = areaSeries

        chartRef.current.timeScale().fitContent()

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (chartRef.current) {
                chartRef.current.remove()
            }
        }
    }, [data])

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Daily Price Trend</h3>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div ref={chartContainerRef} className="w-full" />
            </div>
        </div>
    )
}
