'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface KPICardProps {
  title: string
  value: string
  numericValue: number
  delta?: number | null
  deltaLabel?: string
  icon?: string
  loading?: boolean
  index?: number
}

function NumberTicker({ value, formatted }: { value: number; formatted: string }) {
  const shouldReduce = useReducedMotion()
  const [displayed, setDisplayed] = useState(shouldReduce ? formatted : '0')
  const prevRef = useRef(0)

  useEffect(() => {
    if (shouldReduce) {
      // Avoid synchronous setState in effect body — schedule for next tick
      const id = setTimeout(() => setDisplayed(formatted), 0)
      return () => clearTimeout(id)
    }
    const end = value
    const duration = 800
    const startTime = performance.now()
    let rafId: number

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(progress < 1 ? formatPartial(formatted, eased) : formatted)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        prevRef.current = end
      }
    }

    rafId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafId)
      prevRef.current = end
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatted])

  return <span>{displayed}</span>
}

/** Approximate partial display: trim trailing digits for count-up feel */
function formatPartial(formatted: string, pct: number): string {
  if (pct > 0.95) return formatted
  // Extract numeric part, scale it
  const match = formatted.match(/[\d.,]+/)
  if (!match) return formatted
  const digits = match[0]
  const scaled = (parseFloat(digits.replace(/[.,]/g, '')) * pct)
  const prefix = formatted.slice(0, formatted.indexOf(digits))
  const suffix = formatted.slice(formatted.indexOf(digits) + digits.length)
  return `${prefix}${Math.round(scaled).toLocaleString('es-AR')}${suffix}`
}

export function KPICard({ title, value, numericValue, delta, deltaLabel, icon, loading, index = 0 }: KPICardProps) {
  const shouldReduce = useReducedMotion()

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  const hasPositiveDelta = delta !== null && delta !== undefined && delta > 0
  const hasNegativeDelta = delta !== null && delta !== undefined && delta < 0

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: shouldReduce ? 0 : index * 0.07, ease: 'easeOut' }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && <span className="text-xl" aria-hidden="true">{icon}</span>}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold leading-tight">
            <NumberTicker value={numericValue} formatted={value} />
          </div>
          {delta !== null && delta !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge
                variant={hasPositiveDelta ? 'default' : hasNegativeDelta ? 'destructive' : 'secondary'}
                className="text-xs px-1.5 py-0"
              >
                {hasPositiveDelta ? '▲' : hasNegativeDelta ? '▼' : '—'}{' '}
                {Math.abs(delta).toFixed(1)}%
              </Badge>
              {deltaLabel && (
                <span className="text-xs text-muted-foreground">{deltaLabel}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
