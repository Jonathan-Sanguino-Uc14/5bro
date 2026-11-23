'use client'

import { BaseChart } from './BaseChart'
import { formatMoney } from '@/lib/formatters'

interface Props {
  data: Array<{ dia: number; hora: number; valor: number }>
  theme?: 'light' | 'dark'
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`)

export function SalesHeatmapChart({ data, theme }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
        Sin datos suficientes para el mapa de calor
      </div>
    )
  }

  const heatData = data.map((d) => [d.hora, d.dia, d.valor / 100])

  const option = {
    tooltip: {
      position: 'top',
      formatter: (p: { data: [number, number, number] }) => {
        const [hora, dia, val] = p.data
        return `${DAYS[dia]} ${HOURS[hora]}: ${formatMoney(Math.round(val * 100))}`
      },
    },
    grid: { left: 32, right: 8, top: 8, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: HOURS,
      splitArea: { show: true },
      axisLabel: { fontSize: 9, interval: 2 },
    },
    yAxis: {
      type: 'category',
      data: DAYS,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: 0,
      max: Math.max(...data.map((d) => d.valor / 100), 1),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { fontSize: 10 },
      inRange: { color: ['#f0fdf4', '#10b981', '#065f46'] },
    },
    series: [
      {
        type: 'heatmap',
        data: heatData,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.3)' } },
      },
    ],
  }

  return <BaseChart option={option} style={{ height: 220 }} theme={theme} />
}
