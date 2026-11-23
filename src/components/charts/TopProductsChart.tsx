'use client'

import { BaseChart } from './BaseChart'
import type { ProductoStats } from '@/types'
import { formatMoney, formatNumber } from '@/lib/formatters'

interface Props {
  data: ProductoStats[]
  mode: 'ingresos' | 'unidades'
  theme?: 'light' | 'dark'
}

export function TopProductsChart({ data, mode, theme }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
        Sin datos de productos en este período
      </div>
    )
  }

  const sorted = [...data]
    .sort((a, b) => (mode === 'ingresos' ? b.ingresos - a.ingresos : b.unidades - a.unidades))
    .slice(0, 10)
    .reverse()

  const nombres = sorted.map((p) => p.nombre.length > 20 ? p.nombre.slice(0, 19) + '…' : p.nombre)
  const values = sorted.map((p) => mode === 'ingresos' ? p.ingresos / 100 : p.unidades)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number; marker: string }>) =>
        params.map((p) =>
          `${p.marker} ${p.name}: ${mode === 'ingresos' ? formatMoney(Math.round(p.value * 100)) : formatNumber(p.value) + ' un.'}`
        ).join('<br/>'),
    },
    grid: { left: 16, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (v: number) =>
          mode === 'ingresos'
            ? `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`
            : String(v),
      },
    },
    yAxis: {
      type: 'category',
      data: nombres,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color: mode === 'ingresos' ? '#3b82f6' : '#a855f7' },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) =>
            mode === 'ingresos'
              ? formatMoney(Math.round(p.value * 100))
              : formatNumber(p.value),
          fontSize: 11,
        },
      },
    ],
  }

  return <BaseChart option={option} style={{ height: Math.max(240, sorted.length * 36) }} theme={theme} />
}
