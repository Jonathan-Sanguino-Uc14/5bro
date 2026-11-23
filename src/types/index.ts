export interface Profile {
  id: string
  business_name: string | null
  user_name: string | null
  email: string | null
}

export interface Venta {
  id: string
  vendido_en: string
  dia: string
  total_centavos: number
  metodo_pago: string
  nota: string | null
  user_id: string
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario_centavos: number
  costo_unitario_centavos: number
  productos: { nombre: string } | null
}

export interface Producto {
  id: string
  nombre: string
  precio_centavos: number
  activo: boolean
  user_id: string
}

export interface Insumo {
  id: string
  nombre: string
  unidad: string
  stock_mili: number
  costo_unitario_centavos: number
  activo: boolean
  user_id: string
}

export interface MovimientoInsumo {
  id: string
  insumo_id: string
  dia: string
  tipo: string
  cantidad_mili: number
  costo_total_centavos: number
  creado_en: string
  insumos: { nombre: string } | null
  user_id: string
}

export interface Operation {
  id: string
  type: 'venta' | 'compra' | 'gasto'
  concept: string
  amount: number
  date: string
  note: string | null
  category: string | null
  created_at: string
  source: string | null
  user_id: string
}

export type PeriodKey = 'today' | '7d' | '30d' | 'month' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

export interface KPIMetrics {
  ventas: number
  compras: number
  gastos: number
  gananciaEstimada: number
  ticketPromedio: number
  numOperaciones: number
  numVentas: number
}

export interface DailyDataPoint {
  dia: string
  ventas: number
  salidas: number
  ganancia: number
}

export interface ProductoStats {
  id: string
  nombre: string
  ingresos: number
  unidades: number
  margen: number
  margenPct: number
}

export interface InsumoStats {
  id: string
  nombre: string
  unidad: string
  stockMili: number
  stockUnidades: number
  costoUnitario: number
  valorInventario: number
  activo: boolean
}

export interface OperacionCombinada {
  id: string
  tipo: 'venta' | 'compra' | 'gasto'
  concepto: string
  monto: number
  fecha: string
  nota: string | null
  categoria: string | null
  fuente: string
  creado_en: string
}
