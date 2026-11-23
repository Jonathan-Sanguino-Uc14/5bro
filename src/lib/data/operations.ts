import { createClient } from '@/lib/supabase/server'
import type { Operation } from '@/types'

export async function getOperations(userId: string, from: string, to: string): Promise<Operation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operations')
    .select('id, type, concept, amount, date, note, category, created_at, source, user_id')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (error) {
    console.error('[getOperations]', error.message)
    return []
  }
  return (data ?? []) as Operation[]
}

export async function getAllOperationsCombined(userId: string, from: string, to: string) {
  const supabase = await createClient()

  const [opsRes, ventasRes, comprasRes] = await Promise.all([
    supabase
      .from('operations')
      .select('id, type, concept, amount, date, note, category, created_at, source, user_id')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to),
    supabase
      .from('ventas')
      .select('id, vendido_en, dia, total_centavos, metodo_pago, nota, user_id')
      .eq('user_id', userId)
      .gte('dia', from)
      .lte('dia', to),
    supabase
      .from('movimientos_insumo')
      .select('id, insumo_id, dia, tipo, cantidad_mili, costo_total_centavos, creado_en, user_id, insumos(nombre)')
      .eq('user_id', userId)
      .gte('dia', from)
      .lte('dia', to)
      .eq('tipo', 'compra'),
  ])

  const ops = (opsRes.data ?? []) as Operation[]
  const ventas = (ventasRes.data ?? []) as Array<{
    id: string; vendido_en: string; dia: string; total_centavos: number; metodo_pago: string; nota: string | null; user_id: string
  }>
  const compras = (comprasRes.data ?? []) as unknown as Array<{
    id: string; dia: string; tipo: string; costo_total_centavos: number; creado_en: string;
    insumos: { nombre: string } | null; user_id: string
  }>

  return {
    ops,
    ventas,
    compras,
  }
}
