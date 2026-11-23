'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getVentas } from '@/lib/data/ventas'
import { getOperations } from '@/lib/data/operations'
import { getMovimientosInsumo } from '@/lib/data/insumos'
import {
  computeKPIs,
  computeDailyData,
  computePaymentDistribution,
  computeExpenseDistribution,
  computeWeekdayHeatmap,
} from '@/lib/metrics'
import { getPeriodRange, getPreviousPeriodRange, rangeToStrings, fillDays } from '@/lib/periods'
import { formatMoney, formatNumber } from '@/lib/formatters'
import { KPICard } from '@/components/KPICard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SalesVsExpensesChart,
  CumulativeProfitChart,
  ExpenseDistributionChart,
  PaymentMethodsChart,
  SalesHeatmapChart,
} from '@/components/charts/ClientCharts'
import type { PeriodKey, Venta, Operation, MovimientoInsumo, KPIMetrics, DailyDataPoint } from '@/types'

interface PageData {
  kpis: KPIMetrics
  prevKpis: KPIMetrics
  daily: DailyDataPoint[]
  paymentDist: Array<{ metodo: string; total: number; count: number }>
  expenseDist: Array<{ categoria: string; total: number }>
  heatmap: Array<{ dia: number; hora: number; valor: number }>
}

function DashboardContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') ?? '30d') as PeriodKey
  const customFrom = searchParams.get('from') ?? undefined
  const customTo = searchParams.get('to') ?? undefined

  const range = getPeriodRange(period, customFrom, customTo)
  const prevRange = getPreviousPeriodRange(range)
  const { from, to } = rangeToStrings(range)
  const { from: prevFrom, to: prevTo } = rangeToStrings(prevRange)

  const [pageData, setPageData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)

    Promise.all([
      getVentas(user.id, from, to),
      getOperations(user.id, from, to),
      getMovimientosInsumo(user.id, from, to),
      getVentas(user.id, prevFrom, prevTo),
      getOperations(user.id, prevFrom, prevTo),
      getMovimientosInsumo(user.id, prevFrom, prevTo),
    ])
      .then(([ventas, operations, movimientos, prevVentas, prevOperations, prevMovimientos]) => {
        const kpis = computeKPIs(
          ventas as Venta[],
          operations as Operation[],
          movimientos as MovimientoInsumo[]
        )
        const prevKpis = computeKPIs(
          prevVentas as Venta[],
          prevOperations as Operation[],
          prevMovimientos as MovimientoInsumo[]
        )
        const dailyRaw = computeDailyData(
          ventas as Venta[],
          operations as Operation[],
          movimientos as MovimientoInsumo[]
        )
        const daily = fillDays(dailyRaw, range)
        const paymentDist = computePaymentDistribution(ventas as Venta[])
        const expenseDist = computeExpenseDistribution(
          operations as Operation[],
          movimientos as MovimientoInsumo[]
        )
        const heatmap = computeWeekdayHeatmap(ventas as Venta[])
        setPageData({ kpis, prevKpis, daily, paymentDist, expenseDist, heatmap })
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar los datos. Intentá de nuevo.')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from, to, prevFrom, prevTo])

  function delta(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  const hasPrevData = (pageData?.prevKpis.numOperaciones ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="text-sm text-muted-foreground">
            {from === to ? from : `${from} — ${to}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={period}
          customFrom={customFrom}
          customTo={customTo}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading || !pageData
          ? Array.from({ length: 6 }).map((_, i) => <KPICard key={i} title="" value="" numericValue={0} loading index={i} />)
          : (
            <>
              <KPICard
                title="Ventas"
                value={formatMoney(pageData.kpis.ventas)}
                numericValue={pageData.kpis.ventas}
                delta={hasPrevData ? delta(pageData.kpis.ventas, pageData.prevKpis.ventas) : null}
                deltaLabel="vs período ant."
                icon="💰"
                index={0}
              />
              <KPICard
                title="Compras"
                value={formatMoney(pageData.kpis.compras)}
                numericValue={pageData.kpis.compras}
                delta={hasPrevData ? delta(pageData.kpis.compras, pageData.prevKpis.compras) : null}
                deltaLabel="vs período ant."
                icon="🛒"
                index={1}
              />
              <KPICard
                title="Gastos"
                value={formatMoney(pageData.kpis.gastos)}
                numericValue={pageData.kpis.gastos}
                delta={hasPrevData ? delta(pageData.kpis.gastos, pageData.prevKpis.gastos) : null}
                deltaLabel="vs período ant."
                icon="💸"
                index={2}
              />
              <KPICard
                title="Ganancia estimada"
                value={formatMoney(pageData.kpis.gananciaEstimada)}
                numericValue={pageData.kpis.gananciaEstimada}
                delta={
                  hasPrevData
                    ? delta(pageData.kpis.gananciaEstimada, pageData.prevKpis.gananciaEstimada)
                    : null
                }
                deltaLabel="vs período ant."
                icon="📈"
                index={3}
              />
              <KPICard
                title="Ticket promedio"
                value={formatMoney(pageData.kpis.ticketPromedio)}
                numericValue={pageData.kpis.ticketPromedio}
                delta={
                  hasPrevData
                    ? delta(pageData.kpis.ticketPromedio, pageData.prevKpis.ticketPromedio)
                    : null
                }
                deltaLabel="vs período ant."
                icon="🎫"
                index={4}
              />
              <KPICard
                title="Nº operaciones"
                value={formatNumber(pageData.kpis.numOperaciones)}
                numericValue={pageData.kpis.numOperaciones}
                delta={
                  hasPrevData
                    ? delta(pageData.kpis.numOperaciones, pageData.prevKpis.numOperaciones)
                    : null
                }
                deltaLabel="vs período ant."
                icon="🔢"
                index={5}
              />
            </>
          )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ventas vs Salidas por día</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !pageData ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pageData.daily.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                Sin datos en este período
              </div>
            ) : (
              <SalesVsExpensesChart data={pageData.daily} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ganancia acumulada</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !pageData ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pageData.daily.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                Sin datos en este período
              </div>
            ) : (
              <CumulativeProfitChart data={pageData.daily} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de salidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !pageData ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ExpenseDistributionChart data={pageData.expenseDist} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Métodos de pago</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !pageData ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <PaymentMethodsChart data={pageData.paymentDist} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Ventas por día y hora</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading || !pageData ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <SalesHeatmapChart data={pageData.heatmap} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
