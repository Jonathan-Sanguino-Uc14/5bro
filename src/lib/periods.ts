import { DateRange, PeriodKey } from '@/types'
import { toDateStr } from './formatters'

export function getPeriodRange(period: PeriodKey, customFrom?: string, customTo?: string): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return { from: today, to: today }

    case '7d': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from, to: today }
    }

    case '30d': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { from, to: today }
    }

    case 'month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from, to: today }
    }

    case 'custom': {
      if (customFrom && customTo) {
        return {
          from: new Date(customFrom + 'T00:00:00'),
          to: new Date(customTo + 'T00:00:00'),
        }
      }
      return { from: today, to: today }
    }

    default:
      return { from: today, to: today }
  }
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const diffMs = range.to.getTime() - range.from.getTime()
  const prevTo = new Date(range.from.getTime() - 86_400_000)
  const prevFrom = new Date(prevTo.getTime() - diffMs)
  return { from: prevFrom, to: prevTo }
}

export function periodLabel(period: PeriodKey): string {
  switch (period) {
    case 'today': return 'Hoy'
    case '7d': return 'Últimos 7 días'
    case '30d': return 'Últimos 30 días'
    case 'month': return 'Este mes'
    case 'custom': return 'Rango personalizado'
  }
}

export function rangeToStrings(range: DateRange): { from: string; to: string } {
  return { from: toDateStr(range.from), to: toDateStr(range.to) }
}

/** Fill missing days in a date range with zero values */
export function fillDays(
  data: Array<{ dia: string; ventas: number; salidas: number; ganancia: number }>,
  range: DateRange
): Array<{ dia: string; ventas: number; salidas: number; ganancia: number }> {
  const map = new Map(data.map((d) => [d.dia, d]))
  const result = []
  const cur = new Date(range.from)
  while (cur <= range.to) {
    const key = toDateStr(cur)
    result.push(map.get(key) ?? { dia: key, ventas: 0, salidas: 0, ganancia: 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}
