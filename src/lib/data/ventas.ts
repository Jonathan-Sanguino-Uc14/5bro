import { createClient } from '@/lib/supabase/server'
import type { Venta, VentaItem } from '@/types'

export async function getVentas(userId: string, from: string, to: string): Promise<Venta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ventas')
    .select('id, vendido_en, dia, total_centavos, metodo_pago, nota, user_id')
    .eq('user_id', userId)
    .gte('dia', from)
    .lte('dia', to)
    .order('vendido_en', { ascending: false })

  if (error) {
    console.error('[getVentas]', error.message)
    return []
  }
  return (data ?? []) as Venta[]
}

export async function getVentaItems(userId: string, from: string, to: string): Promise<VentaItem[]> {
  const supabase = await createClient()
  // Join via ventas to filter by user and date
  const { data: ventasData, error: ventasError } = await supabase
    .from('ventas')
    .select('id')
    .eq('user_id', userId)
    .gte('dia', from)
    .lte('dia', to)

  if (ventasError || !ventasData || ventasData.length === 0) return []

  const ventaIds = ventasData.map((v) => v.id)

  const { data, error } = await supabase
    .from('venta_items')
    .select('id, venta_id, producto_id, cantidad, precio_unitario_centavos, costo_unitario_centavos, productos(nombre)')
    .in('venta_id', ventaIds)

  if (error) {
    console.error('[getVentaItems]', error.message)
    return []
  }
  return (data ?? []) as unknown as VentaItem[]
}
