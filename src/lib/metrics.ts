import type { VentaConItems } from '../db/types';

/** Returns 0 if numVentas === 0, else Math.round(totalCentavos / numVentas) */
export function calcularTicketPromedio(totalCentavos: number, numVentas: number): number {
  if (numVentas === 0) return 0;
  return Math.round(totalCentavos / numVentas);
}

/**
 * Returns null if anterior === 0.
 * Returns Math.round(((actual - anterior) / anterior) * 100) (integer percent)
 */
export function calcularComparacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Returns the hora with max totalCentavos, or null if empty */
export function encontrarHoraPico(
  ventasPorHora: { hora: number; totalCentavos: number }[],
): number | null {
  if (ventasPorHora.length === 0) return null;
  let max = ventasPorHora[0];
  for (const entry of ventasPorHora) {
    if (entry.totalCentavos > max.totalCentavos) {
      max = entry;
    }
  }
  return max.hora;
}

/**
 * Aggregates by dia (sums totalCentavos per unique dia), returns sorted by dia ASC.
 */
export function agruparVentasPorDia(
  ventas: { dia: string; totalCentavos: number }[],
): { dia: string; totalCentavos: number }[] {
  const map = new Map<string, number>();
  for (const v of ventas) {
    map.set(v.dia, (map.get(v.dia) ?? 0) + v.totalCentavos);
  }
  return Array.from(map.entries())
    .map(([dia, totalCentavos]) => ({ dia, totalCentavos }))
    .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
}

/**
 * Finds product with highest total quantity sold across all ventas.
 * Returns null if no items.
 */
export function calcularProductoTop(
  ventas: VentaConItems[],
): { nombre: string; cantidad: number } | null {
  const totals = new Map<string, number>();
  for (const venta of ventas) {
    for (const item of venta.items) {
      totals.set(item.productoNombre, (totals.get(item.productoNombre) ?? 0) + item.cantidad);
    }
  }
  if (totals.size === 0) return null;
  let topNombre = '';
  let topCantidad = 0;
  for (const [nombre, cantidad] of totals.entries()) {
    if (cantidad > topCantidad) {
      topNombre = nombre;
      topCantidad = cantidad;
    }
  }
  return { nombre: topNombre, cantidad: topCantidad };
}
