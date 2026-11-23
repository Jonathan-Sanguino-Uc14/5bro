'use client'

import { useEffect, useRef } from 'react'
import type { ECharts } from 'echarts'

// ECharts option type is very strict with literal string unions; use a loose type
// for the prop and let the runtime handle it.
type ChartOption = Record<string, unknown>

let echartsModule: typeof import('echarts') | null = null

async function loadEcharts() {
  if (echartsModule) return echartsModule
  echartsModule = await import('echarts')
  return echartsModule
}

interface BaseChartProps {
  option: ChartOption
  style?: React.CSSProperties
  className?: string
  theme?: 'light' | 'dark'
}

export function BaseChart({ option, style, className, theme = 'light' }: BaseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    loadEcharts().then((ec) => {
      if (cancelled || !containerRef.current) return
      if (!chartRef.current) {
        chartRef.current = ec.init(containerRef.current, theme)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartRef.current.setOption(option as any, true)
    })

    return () => {
      cancelled = true
    }
  }, [option, theme])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const ro = new ResizeObserver(() => {
      chart.resize()
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: 280, ...style }}
    />
  )
}
