export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getInsumos, getMovimientosInsumo } from '@/lib/data/insumos'
import { getPeriodRange, rangeToStrings } from '@/lib/periods'
import { formatMoney, formatNumber } from '@/lib/formatters'
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
import { InsumosPurchasesChart } from '@/components/charts/ClientCharts'
import type { PeriodKey, InsumoStats } from '@/types'

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}

const LOW_STOCK_THRESHOLD = 1000 // 1 unit in mili

export default async function InventarioPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const period = (params.period ?? '30d') as PeriodKey
  const range = getPeriodRange(period, params.from, params.to)
  const { from, to } = rangeToStrings(range)

  const [insumos, movimientos] = await Promise.all([
    getInsumos(user.id),
    getMovimientosInsumo(user.id, from, to),
  ])

  const stats: InsumoStats[] = insumos.map((ins) => ({
    id: ins.id,
    nombre: ins.nombre,
    unidad: ins.unidad,
    stockMili: ins.stock_mili,
    stockUnidades: ins.stock_mili / 1000,
    costoUnitario: ins.costo_unitario_centavos,
    valorInventario: Math.round((ins.stock_mili / 1000) * ins.costo_unitario_centavos),
    activo: ins.activo,
  }))

  const totalInventario = stats.reduce((s, i) => s + i.valorInventario, 0)
  const lowStock = stats.filter((i) => i.stockMili < LOW_STOCK_THRESHOLD && i.activo)

  const compras = movimientos.filter((m) => m.tipo === 'compra')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-48" />}>
          <PeriodSelector currentPeriod={period} customFrom={params.from} customTo={params.to} />
        </Suspense>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor de inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(totalInventario)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total insumos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(insumos.length)}</p>
          </CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-destructive' : ''}`}>
              {formatNumber(lowStock.length)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Compras de insumos en el período</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InsumosPurchasesChart data={compras} />
        </CardContent>
      </Card>

      {/* Stock table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stock actual de insumos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          {insumos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Sin insumos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Costo unitario</TableHead>
                  <TableHead className="text-right">Valor inventario</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((ins) => {
                  const isLow = ins.stockMili < LOW_STOCK_THRESHOLD && ins.activo
                  return (
                    <TableRow key={ins.id} className={isLow ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{ins.nombre}</TableCell>
                      <TableCell>{ins.unidad}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLow ? 'text-destructive font-semibold' : ''}>
                          {ins.stockUnidades.toLocaleString('es-AR', { maximumFractionDigits: 3 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(ins.costoUnitario)}</TableCell>
                      <TableCell className="text-right">{formatMoney(ins.valorInventario)}</TableCell>
                      <TableCell className="text-center">
                        {!ins.activo ? (
                          <Badge variant="secondary">Inactivo</Badge>
                        ) : isLow ? (
                          <Badge variant="destructive">Stock bajo</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
