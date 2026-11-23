'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { DailyDataPoint, MovimientoInsumo, ProductoStats } from '@/types'

// All dynamic imports with ssr:false must live in a Client Component
const SalesVsExpensesChart = dynamic(
  () => import('./SalesVsExpensesChart').then(m => ({ default: m.SalesVsExpensesChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

const CumulativeProfitChart = dynamic(
  () => import('./CumulativeProfitChart').then(m => ({ default: m.CumulativeProfitChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

const ExpenseDistributionChart = dynamic(
  () => import('./ExpenseDistributionChart').then(m => ({ default: m.ExpenseDistributionChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

const PaymentMethodsChart = dynamic(
  () => import('./PaymentMethodsChart').then(m => ({ default: m.PaymentMethodsChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

const SalesHeatmapChart = dynamic(
  () => import('./SalesHeatmapChart').then(m => ({ default: m.SalesHeatmapChart })),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> }
)

const TopProductsChart = dynamic(
  () => import('./TopProductsChart').then(m => ({ default: m.TopProductsChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

const InsumosPurchasesChart = dynamic(
  () => import('./InsumosPurchasesChart').then(m => ({ default: m.InsumosPurchasesChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
)

// Re-export wrapped versions
export {
  SalesVsExpensesChart,
  CumulativeProfitChart,
  ExpenseDistributionChart,
  PaymentMethodsChart,
  SalesHeatmapChart,
  TopProductsChart,
  InsumosPurchasesChart,
}

// Composite client wrapper for the Resumen page charts
interface ResumeChartsProps {
  daily: DailyDataPoint[]
  expenseDist: Array<{ categoria: string; total: number }>
  paymentDist: Array<{ metodo: string; total: number; count: number }>
  heatmap: Array<{ dia: number; hora: number; valor: number }>
}

export function ResumeCharts({ daily, expenseDist, paymentDist, heatmap }: ResumeChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {daily.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
              Sin datos en este período
            </div>
          ) : (
            <SalesVsExpensesChart data={daily} />
          )}
        </div>
        <div>
          {daily.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
              Sin datos en este período
            </div>
          ) : (
            <CumulativeProfitChart data={daily} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div>
          <ExpenseDistributionChart data={expenseDist} />
        </div>
        <div>
          <PaymentMethodsChart data={paymentDist} />
        </div>
      </div>

      <div className="mt-4">
        <SalesHeatmapChart data={heatmap} />
      </div>
    </>
  )
}

// Wrapper for products charts
interface ProductChartsProps {
  stats: ProductoStats[]
}

export function ProductCharts({ stats }: ProductChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TopProductsChart data={stats} mode="ingresos" />
      <TopProductsChart data={stats} mode="unidades" />
    </div>
  )
}

// Wrapper for insumos purchases chart
interface InsumosPurchasesWrapperProps {
  data: MovimientoInsumo[]
}

export function InsumosPurchasesWrapper({ data }: InsumosPurchasesWrapperProps) {
  return <InsumosPurchasesChart data={data} />
}
