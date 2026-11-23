'use client'

import { BaseChart } from './BaseChart'
import type { DailyDataPoint } from '@/types'
import { computeCumulativeProfit } from '@/lib/metrics'
import { formatMoney, formatDate } from '@/lib/formatters'

interface Props {
  data: DailyDataPoint[]
  theme?: 'light' | 'dark'
}

export function CumulativeProfitChart({ data, theme }: Props) {
  const cumulative = computeCumulativeProfit(data)
  const dias = cumulative.map((d) => formatDate(d.dia))
  const values = cumulative.map((d) => d.acumulado / 100)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: number; marker: string }>) => {
        return params.map((p) => `${p.marker} Ganancia acumulada: ${formatMoney(Math.round(p.value * 100))}`).join('')
      },
    },
    grid: { left: 16, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: dias,
      axisLabel: { fontSize: 11, interval: Math.max(0, Math.floor(dias.length / 7) - 1) },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => {
          if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`
          return `$${v}`
        },
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Ganancia acumulada',
        type: 'line',
        data: values,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16,185,129,0.4)' },
              { offset: 1, color: 'rgba(16,185,129,0)' },
            ],
          },
        },
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        symbol: 'none',
      },
    ],
  }

  return <BaseChart option={option} theme={theme} />
}
