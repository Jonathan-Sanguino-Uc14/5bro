'use client'

import { BaseChart } from './BaseChart'
import { formatMoney } from '@/lib/formatters'

interface Props {
  data: Array<{ metodo: string; total: number; count: number }>
  theme?: 'light' | 'dark'
}

export function PaymentMethodsChart({ data, theme }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
        Sin datos de ventas en este período
      </div>
    )
  }

  const methods = data.map((d) => d.metodo)
  const totals = data.map((d) => d.total / 100)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number; marker: string }>) =>
        params.map((p) => `${p.marker} ${p.name}: ${formatMoney(Math.round(p.value * 100))}`).join('<br/>'),
    },
    grid: { left: 16, right: 16, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'category',
      data: methods,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: totals,
        itemStyle: { color: '#6366f1' },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => formatMoney(Math.round(p.value * 100)),
          fontSize: 11,
        },
      },
    ],
  }

  return <BaseChart option={option} style={{ height: Math.max(180, data.length * 44) }} theme={theme} />
}
