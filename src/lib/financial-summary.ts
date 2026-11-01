import type { DayMetrics, OperationType } from './operations';
import { getWeekRange, getMonthRange, toLocalDateString } from './dates';
import { supabase } from './supabase';
import type { BusinessSummary } from './ai-client';

export async function buildBusinessSummary(businessName: string): Promise<BusinessSummary> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('No autenticado');

  const now = new Date();
  const today = toLocalDateString(now);
  const weekStart = getWeekRange(now).startDia;
  const monthStart = getMonthRange(now).startDia;
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;

  const [ventasRes, opsRes, movRes] = await Promise.all([
    supabase
      .from('ventas')
      .select('dia, total_centavos')
      .eq('user_id', userId)
      .gte('dia', rangeStart)
      .lte('dia', today),
    supabase
      .from('operations')
      .select('date, type, amount')
      .eq('user_id', userId)
      .gte('date', rangeStart)
      .lte('date', today),
    supabase
      .from('movimientos_insumo')
      .select('dia, costo_total_centavos')
      .eq('user_id', userId)
      .eq('tipo', 'compra')
      .gte('dia', rangeStart)
      .lte('dia', today),
  ]);

  type Row = { date: string; type: OperationType; total: number; count: number };
  const rowMap = new Map<string, Map<OperationType, { total: number; count: number }>>();

  const addRow = (date: string, type: OperationType, amount: number) => {
    if (!rowMap.has(date)) rowMap.set(date, new Map());
    const dayMap = rowMap.get(date)!;
    const existing = dayMap.get(type) ?? { total: 0, count: 0 };
    dayMap.set(type, { total: existing.total + amount, count: existing.count + 1 });
  };

  for (const v of ventasRes.data ?? []) {
    addRow(v.dia, 'venta', v.total_centavos);
  }
  for (const o of opsRes.data ?? []) {
    addRow(o.date, o.type as OperationType, o.amount);
  }
  for (const m of movRes.data ?? []) {
    addRow(m.dia, 'compra', m.costo_total_centavos ?? 0);
  }

  const rows: Row[] = [];
  for (const [date, dayMap] of rowMap.entries()) {
    for (const [type, { total, count }] of dayMap.entries()) {
      rows.push({ date, type, total, count });
    }
  }

  const aggregate = (start: string): DayMetrics => {
    const result = { ventas: 0, compras: 0, gastos: 0, gananciaEstimada: 0, count: 0 };
    for (const row of rows) {
      if (row.date < start) continue;
      result.count += row.count;
      if (row.type === 'venta') result.ventas += row.total;
      else if (row.type === 'compra') result.compras += row.total;
      else if (row.type === 'gasto') result.gastos += row.total;
    }
    result.gananciaEstimada = result.ventas - result.compras - result.gastos;
    return result;
  };

  return {
    businessName,
    currentDate: now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    today: aggregate(today),
    week: aggregate(weekStart),
    month: {
      ...aggregate(monthStart),
      daysWithRecords: new Set(rows.filter(r => r.date >= monthStart).map(r => r.date)).size,
    },
  };
}
