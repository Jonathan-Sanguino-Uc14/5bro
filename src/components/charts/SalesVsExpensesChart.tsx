'use client'

import { BaseChart } from './BaseChart'
import type { DailyDataPoint } from '@/types'
import { formatMoney, formatDate } from '@/lib/formatters'

interface Props {
  data: DailyDataPoint[]
  theme?: 'light' | 'dark'
}

export function SalesVsExpensesChart({ data, theme }: Props) {
  const dias = data.map((d) => formatDate(d.dia))
  const ventas = data.map((d) => d.ventas / 100)
  const salidas = data.map((d) => d.salidas / 100)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: Array<{ seriesName: string; value: number; marker: string }>) => {
        return params.map((p) => `${p.marker} ${p.seriesName}: ${formatMoney(Math.round(p.value * 100))}`).join('<br/>')
      },
    },
    legend: { data: ['Ventas', 'Salidas'], bottom: 0 },
    grid: { left: 16, right: 16, top: 12, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: dias,
      axisLabel: { fontSize: 11, interval: Math.max(0, Math.floor(dias.length / 7) - 1) },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => {
          if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
          return `$${v}`
        },
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Ventas',
        type: 'bar',
        data: ventas,
        itemStyle: { color: '#3b82f6' },
        emphasis: { itemStyle: { color: '#2563eb' } },
      },
      {
        name: 'Salidas',
        type: 'bar',
        data: salidas,
        itemStyle: { color: '#f97316' },
        emphasis: { itemStyle: { color: '#ea580c' } },
      },
    ],
  }

  return <BaseChart option={option} theme={theme} />
}
