'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getVentaItems } from '@/lib/data/ventas'
import { computeProductStats } from '@/lib/metrics'
import { getPeriodRange, rangeToStrings } from '@/lib/periods'
import { formatMoney, formatNumber, formatPct } from '@/lib/formatters'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TopProductsChart } from '@/components/charts/ClientCharts'
import type { PeriodKey } from '@/types'

function ProductosContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') ?? '30d') as PeriodKey
  const customFrom = searchParams.get('from') ?? undefined
  const customTo = searchParams.get('to') ?? undefined

  const range = getPeriodRange(period, customFrom, customTo)
  const { from, to } = rangeToStrings(range)

  const [stats, setStats] = useState<ReturnType<typeof computeProductStats>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    getVentaItems(user.id, from, to)
      .then((items) => {
        setStats(computeProductStats(items).sort((a, b) => b.ingresos - a.ingresos))
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar los datos. Intentá de nuevo.')
        setLoading(false)
      })
  }, [user, from, to])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <PeriodSelector currentPeriod={period} customFrom={customFrom} customTo={customTo} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[280px] w-full" />
            <Skeleton className="h-[280px] w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : stats.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Sin ventas registradas en este período
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top productos por ingresos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TopProductsChart data={stats} mode="ingresos" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top productos por unidades</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TopProductsChart data={stats} mode="unidades" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Detalle por producto</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Margen ($)</TableHead>
                    <TableHead className="text-right">Margen (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.ingresos)}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.unidades)}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.margen)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={p.margenPct >= 20 ? 'default' : p.margenPct >= 0 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {formatPct(p.margenPct)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-[280px] w-full" /></div>}>
      <ProductosContent />
    </Suspense>
  )
}
