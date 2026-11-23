'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { PeriodKey } from '@/types'
import { periodLabel } from '@/lib/periods'

const PERIODS: PeriodKey[] = ['today', '7d', '30d', 'month', 'custom']

interface PeriodSelectorProps {
  currentPeriod: PeriodKey
  customFrom?: string
  customTo?: string
}

export function PeriodSelector({ currentPeriod, customFrom, customTo }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    router.push(`${pathname}?${sp.toString()}`)
  }

  function handlePeriodChange(value: string | null) {
    if (!value) return
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('period', value)
    if (value !== 'custom') {
      sp.delete('from')
      sp.delete('to')
    }
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {periodLabel(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPeriod === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom ?? ''}
            className="w-36"
            onChange={(e) => navigate({ period: 'custom', from: e.target.value, to: customTo ?? '' })}
          />
          <span className="text-muted-foreground text-sm">a</span>
          <Input
            type="date"
            value={customTo ?? ''}
            className="w-36"
            onChange={(e) => navigate({ period: 'custom', from: customFrom ?? '', to: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
