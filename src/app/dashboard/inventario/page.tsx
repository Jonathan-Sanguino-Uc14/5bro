'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
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
import type { PeriodKey, InsumoStats, Insumo, MovimientoInsumo } from '@/types'

const LOW_STOCK_THRESHOLD = 1000 // 1 unidad en mili

interface PageState {
  stats: InsumoStats[]
  movimientos: MovimientoInsumo[]
  totalInsumos: number
}

function InventarioContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') ?? '30d') as PeriodKey
  const customFrom = searchParams.get('from') ?? undefined
  const customTo = searchParams.get('to') ?? undefined

  const range = getPeriodRange(period, customFrom, customTo)
  const { from, to } = rangeToStrings(range)

  const [pageState, setPageState] = useState<PageState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    Promise.all([
      getInsumos(user.id),
      getMovimientosInsumo(user.id, from, to),
    ])
      .then(([insumos, movimientos]) => {
        const stats: InsumoStats[] = (insumos as Insumo[]).map((ins) => ({
          id: ins.id,
          nombre: ins.nombre,
          unidad: ins.unidad,
          stockMili: ins.stock_mili,
          stockUnidades: ins.stock_mili / 1000,
          costoUnitario: ins.costo_unitario_centavos,
          valorInventario: Math.round((ins.stock_mili / 1000) * ins.costo_unitario_centavos),
          activo: ins.activo,
        }))
        setPageState({ stats, movimientos: movimientos as MovimientoInsumo[], totalInsumos: insumos.length })
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar los datos. Intentá de nuevo.')
        setLoading(false)
      })
  }, [user, from, to])

  const totalInventario = pageState?.stats.reduce((s, i) => s + i.valorInventario, 0) ?? 0
  const lowStock = pageState?.stats.filter((i) => i.stockMili < LOW_STOCK_THRESHOLD && i.activo) ?? []
  const compras = pageState?.movimientos.filter((m) => m.tipo === 'compra') ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <PeriodSelector currentPeriod={period} customFrom={customFrom} customTo={customTo} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor de inventario</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{formatMoney(totalInventario)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total insumos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{formatNumber(pageState?.totalInsumos ?? 0)}</p>}
          </CardContent>
        </Card>
        <Card className={!loading && lowStock.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-10" /> : (
              <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-destructive' : ''}`}>
                {formatNumber(lowStock.length)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchases chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Compras de insumos en el período</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? <Skeleton className="h-[280px] w-full" /> : <InsumosPurchasesChart data={compras} />}
        </CardContent>
      </Card>

      {/* Stock table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stock actual de insumos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : !pageState || pageState.stats.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Sin insumos registrados</div>
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
                {pageState.stats.map((ins) => {
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

export default function InventarioPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-[200px] w-full" /></div>}>
      <InventarioContent />
    </Suspense>
  )
}
