export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
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
import type { PeriodKey } from '@/types'

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const period = (params.period ?? '30d') as PeriodKey
  const range = getPeriodRange(period, params.from, params.to)
  const prevRange = getPreviousPeriodRange(range)
  const { from, to } = rangeToStrings(range)
  const { from: prevFrom, to: prevTo } = rangeToStrings(prevRange)

  const [ventas, operations, movimientos] = await Promise.all([
    getVentas(user.id, from, to),
    getOperations(user.id, from, to),
    getMovimientosInsumo(user.id, from, to),
  ])

  const [prevVentas, prevOperations, prevMovimientos] = await Promise.all([
    getVentas(user.id, prevFrom, prevTo),
    getOperations(user.id, prevFrom, prevTo),
    getMovimientosInsumo(user.id, prevFrom, prevTo),
  ])

  const kpis = computeKPIs(ventas, operations, movimientos)
  const prevKpis = computeKPIs(prevVentas, prevOperations, prevMovimientos)

  const dailyRaw = computeDailyData(ventas, operations, movimientos)
  const daily = fillDays(dailyRaw, range)

  const paymentDist = computePaymentDistribution(ventas)
  const expenseDist = computeExpenseDistribution(operations, movimientos)
  const heatmap = computeWeekdayHeatmap(ventas)

  function delta(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  const hasPrevData = prevKpis.numOperaciones > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="text-sm text-muted-foreground">
            {from === to ? from : `${from} — ${to}`}
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-48" />}>
          <PeriodSelector currentPeriod={period} customFrom={params.from} customTo={params.to} />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Ventas"
          value={formatMoney(kpis.ventas)}
          numericValue={kpis.ventas}
          delta={hasPrevData ? delta(kpis.ventas, prevKpis.ventas) : null}
          deltaLabel="vs período ant."
          icon="💰"
          index={0}
        />
        <KPICard
          title="Compras"
          value={formatMoney(kpis.compras)}
          numericValue={kpis.compras}
          delta={hasPrevData ? delta(kpis.compras, prevKpis.compras) : null}
          deltaLabel="vs período ant."
          icon="🛒"
          index={1}
        />
        <KPICard
          title="Gastos"
          value={formatMoney(kpis.gastos)}
          numericValue={kpis.gastos}
          delta={hasPrevData ? delta(kpis.gastos, prevKpis.gastos) : null}
          deltaLabel="vs período ant."
          icon="💸"
          index={2}
        />
        <KPICard
          title="Ganancia estimada"
          value={formatMoney(kpis.gananciaEstimada)}
          numericValue={kpis.gananciaEstimada}
          delta={hasPrevData ? delta(kpis.gananciaEstimada, prevKpis.gananciaEstimada) : null}
          deltaLabel="vs período ant."
          icon="📈"
          index={3}
        />
        <KPICard
          title="Ticket promedio"
          value={formatMoney(kpis.ticketPromedio)}
          numericValue={kpis.ticketPromedio}
          delta={hasPrevData ? delta(kpis.ticketPromedio, prevKpis.ticketPromedio) : null}
          deltaLabel="vs período ant."
          icon="🎫"
          index={4}
        />
        <KPICard
          title="Nº operaciones"
          value={formatNumber(kpis.numOperaciones)}
          numericValue={kpis.numOperaciones}
          delta={hasPrevData ? delta(kpis.numOperaciones, prevKpis.numOperaciones) : null}
          deltaLabel="vs período ant."
          icon="🔢"
          index={5}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ventas vs Salidas por día</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {daily.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                Sin datos en este período
              </div>
            ) : (
              <SalesVsExpensesChart data={daily} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ganancia acumulada</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {daily.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                Sin datos en este período
              </div>
            ) : (
              <CumulativeProfitChart data={daily} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de salidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ExpenseDistributionChart data={expenseDist} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Métodos de pago</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PaymentMethodsChart data={paymentDist} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Ventas por día y hora</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SalesHeatmapChart data={heatmap} />
        </CardContent>
      </Card>
    </div>
  )
}
