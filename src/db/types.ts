export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

export interface Producto {
  id: number;
  nombre: string;
  precioCentavos: number;
  activo: boolean;
  costoUnitarioCentavos: number | null;
  maxVendible: number | null;
}

export type UnidadInsumo = 'kg' | 'g' | 'L' | 'ml' | 'pza';

export interface Insumo {
  id: number;
  nombre: string;
  unidad: UnidadInsumo;
  stockMili: number;
  costoUnitarioCentavos: number | null;
  activo: boolean;
}

export interface RecetaItem extends Insumo {
  cantidadMili: number;
  costoPorProductoCentavos: number | null;
}

export interface Venta {
  id: number;
  vendidoEn: number;   // epoch ms
  dia: string;         // YYYY-MM-DD local
  totalCentavos: number;
  metodoPago: MetodoPago;
  nota: string | null;
}

export interface VentaItem {
  id: number;
  ventaId: number;
  productoId: number;
  cantidad: number;
  precioUnitarioCentavos: number;
  costoUnitarioCentavos: number | null;
}

export interface VentaItemConNombre extends VentaItem {
  productoNombre: string;
}

export interface VentaConItems extends Venta {
  items: VentaItemConNombre[];
}

export interface CreateVentaInput {
  items: { productoId: number; cantidad: number; precioUnitarioCentavos: number }[];
  metodoPago: MetodoPago;
  nota?: string;
}

export interface VentasPorPeriodo {
  totalCentavos: number;
  numVentas: number;
  ticketPromedioCentavos: number;
  productoTopNombre: string | null;
  productoTopCantidad: number;
  peakHour: number | null;
  ventasPorDia: { dia: string; totalCentavos: number }[];
  ventasPorHora: { hora: number; totalCentavos: number }[];
  comparacionPct: number | null;  // null if no prior data; positive = growth
}
