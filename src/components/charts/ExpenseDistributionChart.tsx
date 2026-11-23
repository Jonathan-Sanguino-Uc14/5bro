'use client'

import { BaseChart } from './BaseChart'
import { formatMoney } from '@/lib/formatters'

interface Props {
  data: Array<{ categoria: string; total: number }>
  theme?: 'light' | 'dark'
}

const COLORS = ['#f97316', '#ef4444', '#a855f7', '#06b6d4', '#84cc16', '#f59e0b', '#6366f1']

export function ExpenseDistributionChart({ data, theme }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
        Sin datos de salidas en este período
      </div>
    )
  }

  const pieData = data.map((d, i) => ({
    name: d.categoria,
    value: d.total / 100,
    itemStyle: { color: COLORS[i % COLORS.length] },
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number; marker: string }) =>
        `${p.marker} ${p.name}: ${formatMoney(Math.round(p.value * 100))} (${p.percent.toFixed(1)}%)`,
    },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      textStyle: { fontSize: 11 },
      formatter: (name: string) => name.length > 14 ? name.slice(0, 13) + '…' : name,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['38%', '50%'],
        data: pieData,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
      },
    ],
  }

  return <BaseChart option={option} theme={theme} />
}
