'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getAllOperationsCombined } from '@/lib/data/operations'
import { getPeriodRange, rangeToStrings } from '@/lib/periods'
import { formatMoney, formatDate } from '@/lib/formatters'
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
import type { PeriodKey, OperacionCombinada } from '@/types'
import { CSVExportButton } from './CSVExportButton'

const ITEMS_PER_PAGE = 50

function tipoBadge(tipo: 'venta' | 'compra' | 'gasto') {
  if (tipo === 'venta') return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300">Venta</Badge>
  if (tipo === 'compra') return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300">Compra</Badge>
  return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-300">Gasto</Badge>
}

function OperacionesContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const period = (searchParams.get('period') ?? '30d') as PeriodKey
  const customFrom = searchParams.get('from') ?? undefined
  const customTo = searchParams.get('to') ?? undefined
  const filterTipo = (searchParams.get('tipo') ?? '') as 'venta' | 'compra' | 'gasto' | ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const range = getPeriodRange(period, customFrom, customTo)
  const { from, to } = rangeToStrings(range)

  const [allData, setAllData] = useState<OperacionCombinada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    getAllOperationsCombined(user.id, from, to)
      .then(({ ops, ventas, compras }) => {
        const combined: OperacionCombinada[] = [
          ...ventas.map((v) => ({
            id: v.id,
            tipo: 'venta' as const,
            concepto: v.metodo_pago ? `Venta (${v.metodo_pago})` : 'Venta',
            monto: v.total_centavos,
            fecha: v.dia,
            nota: v.nota,
            categoria: null,
            fuente: 'ventas',
            creado_en: v.vendido_en,
          })),
          ...compras.map((c) => ({
            id: c.id,
            tipo: 'compra' as const,
            concepto: c.insumos?.nombre ? `Compra: ${c.insumos.nombre}` : 'Compra de insumo',
            monto: c.costo_total_centavos,
            fecha: c.dia,
            nota: null,
            categoria: 'Insumos',
            fuente: 'movimientos_insumo',
            creado_en: c.creado_en,
          })),
          ...ops.map((o) => ({
            id: o.id,
            tipo: o.type,
            concepto: o.concept,
            monto: o.amount,
            fecha: o.date,
            nota: o.note,
            categoria: o.category,
            fuente: 'operations',
            creado_en: o.created_at,
          })),
        ].sort((a, b) => b.creado_en.localeCompare(a.creado_en))
        setAllData(combined)
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar los datos. Intentá de nuevo.')
        setLoading(false)
      })
  }, [user, from, to])

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams({
      period,
      ...(customFrom ? { from: customFrom } : {}),
      ...(customTo ? { to: customTo } : {}),
      ...(filterTipo ? { tipo: filterTipo } : {}),
    })
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    return `${pathname}?${sp.toString()}`
  }

  const filtered = filterTipo ? allData.filter((c) => c.tipo === filterTipo) : allData
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <p className="text-sm text-muted-foreground">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <PeriodSelector currentPeriod={period} customFrom={customFrom} customTo={customTo} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {/* Filters and export */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        {(['', 'venta', 'compra', 'gasto'] as const).map((t) => (
          <button
            key={t || 'all'}
            onClick={() => router.push(buildUrl({ tipo: t, page: '1' }))}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filterTipo === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-accent'
            }`}
          >
            {t === '' ? 'Todos' : t === 'venta' ? 'Ventas' : t === 'compra' ? 'Compras' : 'Gastos'}
          </button>
        ))}
        <div className="ml-auto">
          <CSVExportButton data={filtered} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {loading ? <Skeleton className="h-4 w-32" /> : `${filtered.length} operación${filtered.length !== 1 ? 'es' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Sin operaciones en este período
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((op) => (
                    <TableRow key={`${op.fuente}-${op.id}`}>
                      <TableCell>{tipoBadge(op.tipo)}</TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">{op.concepto}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(op.fecha)}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(op.monto)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{op.categoria ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">{op.nota ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {page > 1 && (
                    <button
                      onClick={() => router.push(buildUrl({ page: String(page - 1) }))}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                    >
                      ← Anterior
                    </button>
                  )}
                  <span className="rounded-md border px-3 py-1 text-sm bg-accent">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <button
                      onClick={() => router.push(buildUrl({ page: String(page + 1) }))}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                    >
                      Siguiente →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function OperacionesPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-[300px] w-full" /></div>}>
      <OperacionesContent />
    </Suspense>
  )
}
