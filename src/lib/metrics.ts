/**
 * Pure aggregation functions — no Supabase inside.
 * All amounts in integer cents.
 */
import type { Venta, Operation, MovimientoInsumo, VentaItem, DailyDataPoint, KPIMetrics, ProductoStats } from '@/types'

export function computeKPIs(
  ventas: Venta[],
  operations: Operation[],
  comprasInsumos: MovimientoInsumo[]
): KPIMetrics {
  const ventasTotal =
    ventas.reduce((s, v) => s + v.total_centavos, 0) +
    operations.filter((o) => o.type === 'venta').reduce((s, o) => s + o.amount, 0)

  const comprasTotal =
    comprasInsumos.reduce((s, m) => s + m.costo_total_centavos, 0) +
    operations.filter((o) => o.type === 'compra').reduce((s, o) => s + o.amount, 0)

  const gastosTotal = operations.filter((o) => o.type === 'gasto').reduce((s, o) => s + o.amount, 0)

  const gananciaEstimada = ventasTotal - comprasTotal - gastosTotal

  const numVentas = ventas.length + operations.filter((o) => o.type === 'venta').length
  const ticketPromedio = numVentas > 0 ? Math.round(ventasTotal / numVentas) : 0

  const numOperaciones = ventas.length + operations.length + comprasInsumos.filter((m) => m.tipo === 'compra').length

  return {
    ventas: ventasTotal,
    compras: comprasTotal,
    gastos: gastosTotal,
    gananciaEstimada,
    ticketPromedio,
    numOperaciones,
    numVentas,
  }
}

export function computeDailyData(
  ventas: Venta[],
  operations: Operation[],
  comprasInsumos: MovimientoInsumo[]
): DailyDataPoint[] {
  const map = new Map<string, DailyDataPoint>()

  const ensure = (dia: string) => {
    if (!map.has(dia)) map.set(dia, { dia, ventas: 0, salidas: 0, ganancia: 0 })
    return map.get(dia)!
  }

  for (const v of ventas) {
    const p = ensure(v.dia)
    p.ventas += v.total_centavos
  }

  for (const o of operations) {
    const p = ensure(o.date)
    if (o.type === 'venta') p.ventas += o.amount
    else if (o.type === 'compra') p.salidas += o.amount
    else if (o.type === 'gasto') p.salidas += o.amount
  }

  for (const m of comprasInsumos) {
    const p = ensure(m.dia)
    p.salidas += m.costo_total_centavos
  }

  for (const p of map.values()) {
    p.ganancia = p.ventas - p.salidas
  }

  return Array.from(map.values()).sort((a, b) => a.dia.localeCompare(b.dia))
}

export function computeCumulativeProfit(daily: DailyDataPoint[]): Array<{ dia: string; acumulado: number }> {
  let acc = 0
  return daily.map((d) => {
    acc += d.ganancia
    return { dia: d.dia, acumulado: acc }
  })
}

export function computePaymentDistribution(ventas: Venta[]): Array<{ metodo: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>()
  for (const v of ventas) {
    const key = v.metodo_pago || 'Sin especificar'
    const cur = map.get(key) ?? { total: 0, count: 0 }
    cur.total += v.total_centavos
    cur.count += 1
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([metodo, v]) => ({ metodo, ...v }))
    .sort((a, b) => b.total - a.total)
}

export function computeExpenseDistribution(
  operations: Operation[],
  comprasInsumos: MovimientoInsumo[]
): Array<{ categoria: string; total: number }> {
  const map = new Map<string, number>()

  for (const o of operations) {
    if (o.type === 'compra' || o.type === 'gasto') {
      const key = o.category || (o.type === 'compra' ? 'Compras' : 'Gastos')
      map.set(key, (map.get(key) ?? 0) + o.amount)
    }
  }

  const insumosTotal = comprasInsumos.reduce((s, m) => s + m.costo_total_centavos, 0)
  if (insumosTotal > 0) {
    map.set('Insumos', (map.get('Insumos') ?? 0) + insumosTotal)
  }

  return Array.from(map.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

export function computeWeekdayHeatmap(ventas: Venta[]): Array<{ dia: number; hora: number; valor: number }> {
  const map = new Map<string, number>()
  for (const v of ventas) {
    const d = new Date(v.vendido_en)
    const dia = d.getDay() // 0=dom
    const hora = d.getHours()
    const key = `${dia}-${hora}`
    map.set(key, (map.get(key) ?? 0) + v.total_centavos)
  }
  return Array.from(map.entries()).map(([k, valor]) => {
    const [dia, hora] = k.split('-').map(Number)
    return { dia, hora, valor }
  })
}

export function computeProductStats(items: VentaItem[]): ProductoStats[] {
  const map = new Map<string, ProductoStats>()
  for (const item of items) {
    const nombre = item.productos?.nombre ?? 'Desconocido'
    const cur = map.get(item.producto_id) ?? {
      id: item.producto_id,
      nombre,
      ingresos: 0,
      unidades: 0,
      margen: 0,
      margenPct: 0,
    }
    cur.ingresos += item.precio_unitario_centavos * item.cantidad
    cur.unidades += item.cantidad
    // margen = (precio - costo) * cantidad
    cur.margen += (item.precio_unitario_centavos - item.costo_unitario_centavos) * item.cantidad
    map.set(item.producto_id, cur)
  }

  return Array.from(map.values()).map((p) => ({
    ...p,
    margenPct: p.ingresos > 0 ? Math.round((p.margen / p.ingresos) * 100) : 0,
  }))
}
