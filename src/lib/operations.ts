import { supabase } from './supabase';
import { deleteVenta } from '../db/queries';
import { isValidLocalDate } from './dates';

export type OperationType = 'venta' | 'compra' | 'gasto';
export type OperationFilter = OperationType | 'salida';

export interface Operation {
  id: number;
  type: OperationType;
  concept: string;
  amount: number; // integer cents
  date: string;   // ISO 8601
  note: string | null;
  category: string | null;
  createdAt: string;
  source?: string;
}

export interface DayMetrics {
  ventas: number;
  compras: number;
  gastos: number;
  gananciaEstimada: number;
  count: number;
}

export interface CreateOperationInput {
  type: OperationType;
  concept: string;
  amount: number; // integer cents
  date: string;
  note?: string;
  category?: string;
}

export interface OperationDayTotal { date: string; ventas: number; salidas: number; count: number }

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No autenticado');
  return session.user.id;
}

export async function getOperationDayTotals(type?: OperationFilter, search = ''): Promise<OperationDayTotal[]> {
  const userId = await getUserId();
  const trimmed = search.trim().toLowerCase();

  // 1. Auto ventas
  const { data: ventas } = await supabase
    .from('ventas')
    .select('dia, total_centavos')
    .eq('user_id', userId);

  // 2. Manual operations
  let opsQuery = supabase
    .from('operations')
    .select('type, amount, date, concept')
    .eq('user_id', userId);
  if (trimmed) opsQuery = opsQuery.ilike('concept', `%${trimmed}%`);
  const { data: ops } = await opsQuery;

  // 3. Auto compras from movimientos_insumo
  const { data: movimientos } = await supabase
    .from('movimientos_insumo')
    .select('dia, costo_total_centavos')
    .eq('user_id', userId)
    .eq('tipo', 'compra');

  const map = new Map<string, { ventas: number; salidas: number; count: number }>();

  function ensure(date: string) {
    if (!map.has(date)) map.set(date, { ventas: 0, salidas: 0, count: 0 });
    return map.get(date)!;
  }

  const includeVentas = !type || type === 'venta';
  const includeCompras = !type || type === 'compra' || type === 'salida';
  const includeGastos = !type || type === 'gasto' || type === 'salida';

  if (includeVentas) {
    for (const v of ventas ?? []) {
      const entry = ensure(v.dia);
      entry.ventas += v.total_centavos;
      entry.count += 1;
    }
  }

  if (includeCompras) {
    for (const m of movimientos ?? []) {
      const entry = ensure(m.dia);
      entry.salidas += m.costo_total_centavos ?? 0;
      entry.count += 1;
    }
  }

  for (const o of ops ?? []) {
    if (o.type === 'venta' && includeVentas) {
      const entry = ensure(o.date);
      entry.ventas += o.amount;
      entry.count += 1;
    } else if (o.type === 'compra' && includeCompras) {
      const entry = ensure(o.date);
      entry.salidas += o.amount;
      entry.count += 1;
    } else if (o.type === 'gasto' && includeGastos) {
      const entry = ensure(o.date);
      entry.salidas += o.amount;
      entry.count += 1;
    }
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function getOperations(
  limit = 50,
  typeFilter?: OperationFilter,
  options: { search?: string; offset?: number } = {},
): Promise<Operation[]> {
  const userId = await getUserId();
  const trimmed = options.search?.trim().toLowerCase() ?? '';
  const offset = options.offset ?? 0;

  // 1. Auto ventas
  const { data: ventas } = await supabase
    .from('ventas')
    .select('id, dia, total_centavos, vendido_en, nota')
    .eq('user_id', userId);

  // 2. Auto compras
  const { data: movimientos } = await supabase
    .from('movimientos_insumo')
    .select('id, dia, costo_total_centavos, insumos(nombre), creado_en')
    .eq('user_id', userId)
    .eq('tipo', 'compra');

  // 3. Manual operations
  let opsQuery = supabase
    .from('operations')
    .select('id, type, concept, amount, date, note, category, created_at')
    .eq('user_id', userId);
  if (trimmed) opsQuery = opsQuery.ilike('concept', `%${trimmed}%`);
  const { data: ops } = await opsQuery;

  const all: Operation[] = [];

  const includeVentas = !typeFilter || typeFilter === 'venta';
  const includeCompras = !typeFilter || typeFilter === 'compra' || typeFilter === 'salida';
  const includeGastos = !typeFilter || typeFilter === 'gasto' || typeFilter === 'salida';

  if (includeVentas) {
    for (const v of ventas ?? []) {
      all.push({
        id: -2 * v.id,
        type: 'venta',
        concept: 'Venta',
        amount: v.total_centavos,
        date: v.dia,
        note: v.nota ?? null,
        category: null,
        createdAt: v.vendido_en ? new Date(v.vendido_en).toISOString() : v.dia + 'T00:00:00.000Z',
        source: 'auto',
      });
    }
  }

  if (includeCompras) {
    for (const m of movimientos ?? []) {
      const insumoNombre = (m.insumos as { nombre?: string } | null)?.nombre ?? 'Compra';
      all.push({
        id: -2 * m.id - 1,
        type: 'compra',
        concept: insumoNombre,
        amount: m.costo_total_centavos ?? 0,
        date: m.dia,
        note: null,
        category: null,
        createdAt: m.creado_en ? new Date(m.creado_en).toISOString() : m.dia + 'T00:00:00.000Z',
        source: 'auto',
      });
    }
  }

  for (const o of ops ?? []) {
    const include =
      (o.type === 'venta' && includeVentas) ||
      (o.type === 'compra' && includeCompras) ||
      (o.type === 'gasto' && includeGastos);
    if (!include) continue;
    all.push({
      id: o.id,
      type: o.type as OperationType,
      concept: o.concept,
      amount: o.amount,
      date: o.date,
      note: o.note ?? null,
      category: o.category ?? null,
      createdAt: o.created_at,
      source: 'manual',
    });
  }

  all.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = b.createdAt.localeCompare(a.createdAt);
    if (timeCmp !== 0) return timeCmp;
    return b.id - a.id;
  });

  return all.slice(offset, offset + limit);
}

async function getRecentOperations(limit = 5): Promise<Operation[]> {
  return getOperations(limit);
}

async function createOperation(input: CreateOperationInput): Promise<Operation> {
  if (!['venta', 'compra', 'gasto'].includes(input.type) || !input.concept.trim()
      || !Number.isSafeInteger(input.amount) || input.amount <= 0 || !isValidLocalDate(input.date)) {
    throw new Error('Revisa el concepto, el monto y la fecha.');
  }
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('operations')
    .insert({
      user_id: userId,
      type: input.type,
      concept: input.concept.trim(),
      amount: input.amount,
      date: input.date,
      note: input.note?.trim() ?? null,
      category: input.category ?? null,
    })
    .select('id, created_at')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    type: input.type,
    concept: input.concept.trim(),
    amount: input.amount,
    date: input.date,
    note: input.note?.trim() ?? null,
    category: input.category ?? null,
    createdAt: data.created_at,
  };
}

async function deleteOperation(id: number): Promise<void> {
  if (id < 0) {
    if (id % 2 === 0) return deleteVenta(-id / 2);
    throw new Error('Esta compra está vinculada al inventario y no puede borrarse desde el historial.');
  }
  const userId = await getUserId();
  const { error } = await supabase
    .from('operations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

async function getDayMetrics(date: string): Promise<DayMetrics> {
  return getRangeMetrics(date, date);
}

export async function getRangeMetrics(start: string, end: string): Promise<DayMetrics> {
  const userId = await getUserId();

  const [{ data: ventas }, { data: ops }, { data: mov }] = await Promise.all([
    supabase.from('ventas').select('total_centavos').eq('user_id', userId).gte('dia', start).lte('dia', end),
    supabase.from('operations').select('type, amount').eq('user_id', userId).gte('date', start).lte('date', end),
    supabase.from('movimientos_insumo').select('costo_total_centavos').eq('user_id', userId).eq('tipo', 'compra').gte('dia', start).lte('dia', end),
  ]);

  const ventasAutoTotal = (ventas ?? []).reduce((s, v) => s + v.total_centavos, 0);
  const manualVentas = (ops ?? []).filter(o => o.type === 'venta').reduce((s, o) => s + o.amount, 0);
  const comprasAuto = (mov ?? []).reduce((s, m) => s + (m.costo_total_centavos ?? 0), 0);
  const comprasManual = (ops ?? []).filter(o => o.type === 'compra').reduce((s, o) => s + o.amount, 0);
  const gastos = (ops ?? []).filter(o => o.type === 'gasto').reduce((s, o) => s + o.amount, 0);
  const ventasCount = (ventas?.length ?? 0) + (ops ?? []).filter(o => o.type === 'venta').length;
  const totalCount = ventasCount + (mov?.length ?? 0) + (ops ?? []).filter(o => o.type !== 'venta').length;

  const totalVentas = ventasAutoTotal + manualVentas;
  const totalCompras = comprasAuto + comprasManual;

  return {
    ventas: totalVentas,
    compras: totalCompras,
    gastos,
    gananciaEstimada: totalVentas - totalCompras - gastos,
    count: totalCount,
  };
}

/** Format integer cents → display string (e.g. 150000 → "1.500,00") */
export function formatAmount(cents: number): string {
  const abs = Math.abs(cents);
  const str = (abs / 100).toFixed(2);
  const [int, dec] = str.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cents < 0 ? '-' : ''}${formatted},${dec}`;
}

/** Today as ISO 8601 date-only string (YYYY-MM-DD) */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format ISO date string → "dd/mm/yyyy" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export {
  getOperations,
  getRecentOperations,
  createOperation,
  deleteOperation,
  getDayMetrics,
};
