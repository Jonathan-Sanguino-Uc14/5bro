export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
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

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const period = (params.period ?? '30d') as PeriodKey
  const range = getPeriodRange(period, params.from, params.to)
  const { from, to } = rangeToStrings(range)

  const items = await getVentaItems(user.id, from, to)
  const stats = computeProductStats(items).sort((a, b) => b.ingresos - a.ingresos)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-48" />}>
          <PeriodSelector currentPeriod={period} customFrom={params.from} customTo={params.to} />
        </Suspense>
      </div>

      {stats.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Sin ventas registradas en este período
        </div>
      ) : (
        <>
          {/* Charts */}
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

          {/* Table */}
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
