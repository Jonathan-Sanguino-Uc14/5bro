'use client'

import { BaseChart } from './BaseChart'
import type { MovimientoInsumo } from '@/types'
import { formatMoney, formatDate } from '@/lib/formatters'

interface Props {
  data: MovimientoInsumo[]
  theme?: 'light' | 'dark'
}

export function InsumosPurchasesChart({ data, theme }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
        Sin compras de insumos en este período
      </div>
    )
  }

  // Group by day
  const byDay = new Map<string, number>()
  for (const m of data) {
    if (m.tipo === 'compra') {
      byDay.set(m.dia, (byDay.get(m.dia) ?? 0) + m.costo_total_centavos)
    }
  }

  const sorted = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b))
  const dias = sorted.map(([d]) => formatDate(d))
  const values = sorted.map(([, v]) => v / 100)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: number; marker: string }>) =>
        params.map((p) => `${p.marker} Compras: ${formatMoney(Math.round(p.value * 100))}`).join(''),
    },
    grid: { left: 16, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: dias,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`,
        fontSize: 11,
      },
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color: '#f59e0b' },
      },
    ],
  }

  return <BaseChart option={option} theme={theme} />
}
