import { createClient } from '@/lib/supabase/server'
import type { Insumo, MovimientoInsumo } from '@/types'

export async function getInsumos(userId: string): Promise<Insumo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('insumos')
    .select('id, nombre, unidad, stock_mili, costo_unitario_centavos, activo, user_id')
    .eq('user_id', userId)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('[getInsumos]', error.message)
    return []
  }
  return (data ?? []) as Insumo[]
}

export async function getMovimientosInsumo(userId: string, from: string, to: string): Promise<MovimientoInsumo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimientos_insumo')
    .select('id, insumo_id, dia, tipo, cantidad_mili, costo_total_centavos, creado_en, user_id, insumos(nombre)')
    .eq('user_id', userId)
    .gte('dia', from)
    .lte('dia', to)
    .order('dia', { ascending: false })

  if (error) {
    console.error('[getMovimientosInsumo]', error.message)
    return []
  }
  return (data ?? []) as unknown as MovimientoInsumo[]
}
