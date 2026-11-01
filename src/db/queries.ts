import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../lib/dates';
import type {
  Producto,
  Venta,
  VentaConItems,
  VentaItemConNombre,
  CreateVentaInput,
  Insumo,
  UnidadInsumo,
  RecetaItem,
} from './types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No autenticado');
  return session.user.id;
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProductos(soloActivos = true): Promise<Producto[]> {
  const userId = await getUserId();

  let query = supabase
    .from('productos')
    .select('id, nombre, precio_centavos, activo, receta_items(cantidad_mili, insumos(costo_unitario_centavos, stock_mili))')
    .eq('user_id', userId)
    .order('nombre', { ascending: true });

  if (soloActivos) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const items: { cantidad_mili: number; insumos: { costo_unitario_centavos: number | null; stock_mili: number | null } | null }[] =
      row.receta_items ?? [];

    let costoUnitarioCentavos: number | null = null;
    if (items.length > 0) {
      let total = 0;
      let hasNull = false;
      for (const item of items) {
        const cost = item.insumos?.costo_unitario_centavos ?? null;
        if (cost === null) { hasNull = true; break; }
        total += (item.cantidad_mili * cost) / 1000;
      }
      costoUnitarioCentavos = hasNull ? null : Math.round(total);
    }

    // Calculate max sellable units from ingredient stock
    let maxVendible: number | null = null;
    if (items.length > 0) {
      let min = Infinity;
      let valid = true;
      for (const item of items) {
        const stockMili = (item.insumos as any)?.stock_mili as number | null ?? null;
        if (stockMili === null || item.cantidad_mili <= 0) { valid = false; break; }
        min = Math.min(min, Math.floor(stockMili / item.cantidad_mili));
      }
      maxVendible = valid ? min : null;
    }

    return {
      id: row.id as number,
      nombre: row.nombre as string,
      precioCentavos: row.precio_centavos as number,
      activo: row.activo as boolean,
      costoUnitarioCentavos,
      maxVendible,
    };
  });
}

export interface CreateProductoInsumo {
  nombre: string; unidad: UnidadInsumo; cantidadPorUnidadMili: number;
  compraInicialMili?: number; costoCompraCentavos?: number;
}

export async function createProducto(
  nombre: string,
  precioCentavos: number,
  receta: CreateProductoInsumo[] = [],
): Promise<Producto> {
  if (!nombre.trim() || !Number.isSafeInteger(precioCentavos) || precioCentavos <= 0) {
    throw new Error('El nombre y el precio son obligatorios.');
  }
  const userId = await getUserId();

  const { data: productData, error: productError } = await supabase
    .from('productos')
    .insert({ nombre: nombre.trim(), precio_centavos: precioCentavos, activo: true, user_id: userId })
    .select('id')
    .single();
  if (productError) throw productError;
  const productId: number = productData.id;

  for (const input of receta) {
    const ingredientName = input.nombre.trim();
    const startQty = input.compraInicialMili ?? 0;
    const startCost = input.costoCompraCentavos ?? 0;

    if (!ingredientName || !Number.isSafeInteger(input.cantidadPorUnidadMili) || input.cantidadPorUnidadMili <= 0) {
      throw new Error('Cada ingrediente necesita nombre y cantidad por producto.');
    }
    if (
      !Number.isSafeInteger(startQty) || startQty < 0 ||
      !Number.isSafeInteger(startCost) || startCost < 0 ||
      (startQty > 0 && startCost <= 0)
    ) {
      throw new Error(`Revisa la compra inicial de ${ingredientName}.`);
    }

    // Find existing active insumo by name + unit (case-insensitive)
    const { data: existingRows } = await supabase
      .from('insumos')
      .select('id, stock_mili, costo_unitario_centavos')
      .ilike('nombre', ingredientName)
      .eq('unidad', input.unidad)
      .eq('activo', true)
      .eq('user_id', userId)
      .limit(1);

    let insumoId: number;
    let currentStock: number;
    let currentCost: number | null;

    if (!existingRows || existingRows.length === 0) {
      const unitCost = startQty > 0 ? Math.round((startCost * 1000) / startQty) : null;
      const { data: newInsumo, error: insumoError } = await supabase
        .from('insumos')
        .insert({
          nombre: ingredientName,
          unidad: input.unidad,
          stock_mili: startQty,
          costo_unitario_centavos: unitCost,
          activo: true,
          user_id: userId,
        })
        .select('id')
        .single();
      if (insumoError) throw insumoError;
      insumoId = newInsumo.id;
      currentStock = startQty;
      currentCost = unitCost;
    } else {
      const existing = existingRows[0];
      insumoId = existing.id;
      currentStock = existing.stock_mili;
      currentCost = existing.costo_unitario_centavos;

      if (startQty > 0) {
        const combinedStock = currentStock + startQty;
        const averageCost =
          currentStock > 0 && currentCost === null
            ? null
            : Math.round(
                (currentStock * (currentCost ?? 0) + startCost * 1000) / combinedStock,
              );
        const { error: updateError } = await supabase
          .from('insumos')
          .update({ stock_mili: combinedStock, costo_unitario_centavos: averageCost })
          .eq('id', insumoId)
          .eq('user_id', userId);
        if (updateError) throw updateError;
        currentStock = combinedStock;
        currentCost = averageCost;
      }
    }

    if (startQty > 0) {
      const { error: movError } = await supabase.from('movimientos_insumo').insert({
        insumo_id: insumoId,
        tipo: 'compra',
        cantidad_mili: startQty,
        costo_total_centavos: startCost,
        creado_en: Date.now(),
        user_id: userId,
        dia: toLocalDateString(new Date()),
      });
      if (movError) throw movError;
    }

    // Get existing recipe item quantity for this ingredient (if any)
    const { data: existingRecipe } = await supabase
      .from('receta_items')
      .select('cantidad_mili')
      .eq('producto_id', productId)
      .eq('insumo_id', insumoId)
      .maybeSingle();

    const newCantidad = input.cantidadPorUnidadMili + (existingRecipe?.cantidad_mili ?? 0);
    const { error: recetaError } = await supabase
      .from('receta_items')
      .upsert({ producto_id: productId, insumo_id: insumoId, cantidad_mili: newCantidad });
    if (recetaError) throw recetaError;
  }

  return {
    id: productId,
    nombre: nombre.trim(),
    precioCentavos,
    activo: true,
    costoUnitarioCentavos: null,
    maxVendible: null,
  };
}

// ─── Insumos e inventario ────────────────────────────────────────────────────

export async function getInsumos(soloActivos = true): Promise<Insumo[]> {
  const userId = await getUserId();

  let query = supabase
    .from('insumos')
    .select('id, nombre, unidad, stock_mili, costo_unitario_centavos, activo')
    .eq('user_id', userId)
    .order('nombre', { ascending: true });

  if (soloActivos) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id as number,
    nombre: row.nombre as string,
    unidad: row.unidad as UnidadInsumo,
    stockMili: row.stock_mili as number,
    costoUnitarioCentavos: row.costo_unitario_centavos as number | null,
    activo: row.activo as boolean,
  }));
}

export async function createInsumo(input: {
  nombre: string; unidad: UnidadInsumo; cantidadMili: number; costoTotalCentavos: number;
}): Promise<void> {
  const name = input.nombre.trim();
  if (
    !name ||
    !Number.isSafeInteger(input.cantidadMili) ||
    !Number.isSafeInteger(input.costoTotalCentavos) ||
    input.cantidadMili < 0 ||
    input.costoTotalCentavos < 0 ||
    (input.cantidadMili === 0 && input.costoTotalCentavos > 0)
  ) throw new Error('Datos de insumo inválidos.');

  const userId = await getUserId();
  const unitCost = input.cantidadMili > 0
    ? Math.round((input.costoTotalCentavos * 1000) / input.cantidadMili)
    : null;

  const { data: newInsumo, error: insumoError } = await supabase
    .from('insumos')
    .insert({
      nombre: name,
      unidad: input.unidad,
      stock_mili: input.cantidadMili,
      costo_unitario_centavos: unitCost,
      activo: true,
      user_id: userId,
    })
    .select('id')
    .single();
  if (insumoError) throw insumoError;

  if (input.cantidadMili > 0) {
    const { error: movError } = await supabase.from('movimientos_insumo').insert({
      insumo_id: newInsumo.id,
      tipo: 'compra',
      cantidad_mili: input.cantidadMili,
      costo_total_centavos: input.costoTotalCentavos,
      creado_en: Date.now(),
      user_id: userId,
      dia: toLocalDateString(new Date()),
    });
    if (movError) throw movError;
  }
}

export async function restockInsumo(id: number, cantidadMili: number, costoTotalCentavos: number): Promise<void> {
  if (
    !Number.isSafeInteger(cantidadMili) || cantidadMili <= 0 ||
    !Number.isSafeInteger(costoTotalCentavos) || costoTotalCentavos < 0
  ) throw new Error('Cantidad o costo inválido.');

  const userId = await getUserId();

  const { data: insumoData, error: fetchError } = await supabase
    .from('insumos')
    .select('stock_mili, costo_unitario_centavos')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (fetchError) throw fetchError;
  if (!insumoData) throw new Error('No se encontró el insumo.');

  const nuevoStock = insumoData.stock_mili + cantidadMili;
  const nuevoCosto =
    insumoData.stock_mili > 0 && insumoData.costo_unitario_centavos === null
      ? null
      : Math.round(
          (insumoData.stock_mili * (insumoData.costo_unitario_centavos ?? 0) + costoTotalCentavos * 1000) /
            nuevoStock,
        );

  const { error: updateError } = await supabase
    .from('insumos')
    .update({ stock_mili: nuevoStock, costo_unitario_centavos: nuevoCosto })
    .eq('id', id)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  const { error: movError } = await supabase.from('movimientos_insumo').insert({
    insumo_id: id,
    tipo: 'compra',
    cantidad_mili: cantidadMili,
    costo_total_centavos: costoTotalCentavos,
    creado_en: Date.now(),
    user_id: userId,
    dia: toLocalDateString(new Date()),
  });
  if (movError) throw movError;
}

export async function getReceta(productoId: number): Promise<RecetaItem[]> {
  const { data, error } = await supabase
    .from('receta_items')
    .select('cantidad_mili, insumos(id, nombre, unidad, stock_mili, costo_unitario_centavos, activo)')
    .eq('producto_id', productoId);
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const i = row.insumos;
    const cantidadMili = row.cantidad_mili as number;
    const costoUnitarioCentavos = i.costo_unitario_centavos as number | null;
    return {
      id: i.id as number,
      nombre: i.nombre as string,
      unidad: i.unidad as UnidadInsumo,
      stockMili: i.stock_mili as number,
      costoUnitarioCentavos,
      activo: i.activo as boolean,
      cantidadMili,
      costoPorProductoCentavos:
        costoUnitarioCentavos === null
          ? null
          : Math.round((cantidadMili * costoUnitarioCentavos) / 1000),
    };
  }).sort((a: RecetaItem, b: RecetaItem) => a.nombre.localeCompare(b.nombre));
}

export async function saveRecetaItem(productoId: number, insumoId: number, cantidadMili: number): Promise<void> {
  if (!Number.isSafeInteger(cantidadMili) || cantidadMili <= 0) {
    throw new Error('La cantidad debe ser mayor a cero.');
  }
  const { error } = await supabase
    .from('receta_items')
    .upsert({ producto_id: productoId, insumo_id: insumoId, cantidad_mili: cantidadMili });
  if (error) throw error;
}

export async function deleteRecetaItem(productoId: number, insumoId: number): Promise<void> {
  const { error } = await supabase
    .from('receta_items')
    .delete()
    .eq('producto_id', productoId)
    .eq('insumo_id', insumoId);
  if (error) throw error;
}

export async function updateProducto(
  id: number,
  fields: { nombre?: string; precioCentavos?: number; activo?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (fields.nombre !== undefined) update.nombre = fields.nombre.trim();
  if (fields.precioCentavos !== undefined) update.precio_centavos = fields.precioCentavos;
  if (fields.activo !== undefined) update.activo = fields.activo;
  if (Object.keys(update).length === 0) return;

  const userId = await getUserId();
  const { error } = await supabase
    .from('productos')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteProducto(id: number): Promise<'deleted' | 'archived'> {
  const userId = await getUserId();

  const { count } = await supabase
    .from('venta_items')
    .select('id', { count: 'exact', head: true })
    .eq('producto_id', id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return 'archived';
  }

  const { error: recetaError } = await supabase
    .from('receta_items')
    .delete()
    .eq('producto_id', id);
  if (recetaError) throw recetaError;

  const { error: deleteError } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  return 'deleted';
}

export async function renameInsumo(id: number, nombre: string): Promise<void> {
  const cleanName = nombre.trim();
  if (!cleanName) throw new Error('El nombre es obligatorio.');
  const userId = await getUserId();
  const { error } = await supabase
    .from('insumos')
    .update({ nombre: cleanName })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteInsumo(id: number): Promise<'deleted' | 'archived'> {
  const userId = await getUserId();

  const [{ count: recipeCount }, { count: movCount }, { data: insumoData }] = await Promise.all([
    supabase
      .from('receta_items')
      .select('insumo_id', { count: 'exact', head: true })
      .eq('insumo_id', id),
    supabase
      .from('movimientos_insumo')
      .select('id', { count: 'exact', head: true })
      .eq('insumo_id', id)
      .eq('user_id', userId),
    supabase
      .from('insumos')
      .select('stock_mili')
      .eq('id', id)
      .eq('user_id', userId)
      .single(),
  ]);

  const shouldArchive =
    (recipeCount ?? 0) > 0 ||
    (movCount ?? 0) > 0 ||
    (insumoData?.stock_mili ?? 0) > 0;

  if (shouldArchive) {
    const { error } = await supabase
      .from('insumos')
      .update({ activo: false })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return 'archived';
  }

  const { error } = await supabase
    .from('insumos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return 'deleted';
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

export async function createVenta(input: CreateVentaInput): Promise<number> {
  if (!input.items.length || !['efectivo', 'tarjeta', 'transferencia', 'otro'].includes(input.metodoPago)) {
    throw new Error('La venta necesita productos y un método de pago válido.');
  }
  const seen = new Set<number>();
  for (const item of input.items) {
    if (
      !Number.isSafeInteger(item.productoId) || item.productoId <= 0 ||
      seen.has(item.productoId) ||
      !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0 ||
      !Number.isSafeInteger(item.precioUnitarioCentavos) || item.precioUnitarioCentavos <= 0
    ) throw new Error('Revisa las cantidades, precios y productos repetidos.');
    seen.add(item.productoId);
  }

  const userId = await getUserId();
  const now = Date.now();
  const dia = toLocalDateString(new Date(now));
  const totalCentavos = input.items.reduce(
    (acc, item) => acc + item.cantidad * item.precioUnitarioCentavos,
    0,
  );
  if (!Number.isSafeInteger(totalCentavos)) throw new Error('El total excede el monto permitido.');

  // Build required ingredient quantities and recipe data per product
  const requiredByIngredient = new Map<number, { quantity: number; stock: number; name: string }>();
  const recipeByProduct = new Map<number, {
    unitCost: number | null;
    components: { insumoId: number; consumeMili: number; costTotal: number }[];
  }>();

  for (const item of input.items) {
    const { data: productCheck } = await supabase
      .from('productos')
      .select('id')
      .eq('id', item.productoId)
      .eq('activo', true)
      .eq('user_id', userId)
      .maybeSingle();
    if (!productCheck) throw new Error('Uno de los productos ya no está disponible.');

    const { data: recipeRows, error: recipeError } = await supabase
      .from('receta_items')
      .select('cantidad_mili, insumos(id, nombre, stock_mili, costo_unitario_centavos)')
      .eq('producto_id', item.productoId);
    if (recipeError) throw recipeError;

    if (!recipeRows || recipeRows.length === 0) {
      recipeByProduct.set(item.productoId, { unitCost: null, components: [] });
      continue;
    }

    let unitCost: number | null = 0;
    const components = (recipeRows as any[]).map((row) => {
      const insumo = row.insumos;
      const insumoId: number = insumo.id;
      const consumeMili: number = row.cantidad_mili * item.cantidad;
      const cost: number | null = insumo.costo_unitario_centavos;

      const prior = requiredByIngredient.get(insumoId);
      requiredByIngredient.set(insumoId, {
        quantity: (prior?.quantity ?? 0) + consumeMili,
        stock: insumo.stock_mili,
        name: insumo.nombre,
      });

      if (cost === null) unitCost = null;
      else if (unitCost !== null) unitCost += (row.cantidad_mili * cost) / 1000;

      return {
        insumoId,
        consumeMili,
        costTotal: cost === null ? 0 : Math.round((consumeMili * cost) / 1000),
      };
    });

    recipeByProduct.set(item.productoId, {
      unitCost: unitCost === null ? null : Math.round(unitCost),
      components,
    });
  }

  // Check stock availability
  for (const requirement of requiredByIngredient.values()) {
    if (requirement.stock < requirement.quantity) {
      throw new Error(
        `Stock insuficiente de ${requirement.name}: hay ${(requirement.stock / 1000).toFixed(3)}, se necesitan ${(requirement.quantity / 1000).toFixed(3)}.`,
      );
    }
  }

  // Insert venta
  const { data: ventaData, error: ventaError } = await supabase
    .from('ventas')
    .insert({
      vendido_en: now,
      dia,
      total_centavos: totalCentavos,
      metodo_pago: input.metodoPago,
      nota: input.nota?.trim() ?? null,
      user_id: userId,
    })
    .select('id')
    .single();
  if (ventaError) throw ventaError;
  const ventaId: number = ventaData.id;

  // Insert venta_items and deduct stock
  for (const item of input.items) {
    const recipe = recipeByProduct.get(item.productoId)!;

    const { error: viError } = await supabase.from('venta_items').insert({
      venta_id: ventaId,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario_centavos: item.precioUnitarioCentavos,
      costo_unitario_centavos: recipe.unitCost,
    });
    if (viError) throw viError;

    for (const component of recipe.components) {
      // Read current stock and subtract
      const { data: insumoNow, error: stockFetchError } = await supabase
        .from('insumos')
        .select('stock_mili')
        .eq('id', component.insumoId)
        .eq('user_id', userId)
        .single();
      if (stockFetchError) throw stockFetchError;

      const newStock = (insumoNow?.stock_mili ?? 0) - component.consumeMili;
      const { error: stockUpdateError } = await supabase
        .from('insumos')
        .update({ stock_mili: newStock })
        .eq('id', component.insumoId)
        .eq('user_id', userId);
      if (stockUpdateError) throw stockUpdateError;

      const { error: movError } = await supabase.from('movimientos_insumo').insert({
        insumo_id: component.insumoId,
        tipo: 'consumo',
        cantidad_mili: component.consumeMili,
        costo_total_centavos: component.costTotal,
        venta_id: ventaId,
        creado_en: now,
        user_id: userId,
        dia,
      });
      if (movError) throw movError;
    }
  }

  return ventaId;
}

// ─── Venta helpers ────────────────────────────────────────────────────────────

type RawVentaRow = {
  v_id: number;
  v_vendido_en: number;
  v_dia: string;
  v_total_centavos: number;
  v_metodo_pago: string;
  v_nota: string | null;
};

type RawVentaItemRow = {
  vi_id: number;
  vi_venta_id: number;
  vi_producto_id: number;
  vi_cantidad: number;
  vi_precio_unitario: number;
  vi_costo_unitario: number | null;
  p_nombre: string;
};

function buildVentaConItemsMap(
  ventaRows: RawVentaRow[],
  itemRows: RawVentaItemRow[],
): VentaConItems[] {
  const map = new Map<number, VentaConItems>();
  for (const r of ventaRows) {
    map.set(r.v_id, {
      id: r.v_id,
      vendidoEn: r.v_vendido_en,
      dia: r.v_dia,
      totalCentavos: r.v_total_centavos,
      metodoPago: r.v_metodo_pago as Venta['metodoPago'],
      nota: r.v_nota,
      items: [],
    });
  }
  for (const r of itemRows) {
    const venta = map.get(r.vi_venta_id);
    if (!venta) continue;
    const item: VentaItemConNombre = {
      id: r.vi_id,
      ventaId: r.vi_venta_id,
      productoId: r.vi_producto_id,
      cantidad: r.vi_cantidad,
      precioUnitarioCentavos: r.vi_precio_unitario,
      costoUnitarioCentavos: r.vi_costo_unitario,
      productoNombre: r.p_nombre,
    };
    venta.items.push(item);
  }
  return Array.from(map.values());
}

function toRawVentaRows(ventas: any[]): RawVentaRow[] {
  return ventas.map((v) => ({
    v_id: v.id,
    v_vendido_en: v.vendido_en,
    v_dia: v.dia,
    v_total_centavos: v.total_centavos,
    v_metodo_pago: v.metodo_pago,
    v_nota: v.nota,
  }));
}

async function fetchVentaItemsForIds(ids: number[]): Promise<RawVentaItemRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('venta_items')
    .select('id, venta_id, producto_id, cantidad, precio_unitario_centavos, costo_unitario_centavos, productos(nombre)')
    .in('venta_id', ids);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    vi_id: row.id,
    vi_venta_id: row.venta_id,
    vi_producto_id: row.producto_id,
    vi_cantidad: row.cantidad,
    vi_precio_unitario: row.precio_unitario_centavos,
    vi_costo_unitario: row.costo_unitario_centavos,
    p_nombre: row.productos?.nombre ?? '',
  }));
}

export async function getVentasByDia(dia: string): Promise<VentaConItems[]> {
  const userId = await getUserId();

  const { data: ventas, error } = await supabase
    .from('ventas')
    .select('id, vendido_en, dia, total_centavos, metodo_pago, nota')
    .eq('user_id', userId)
    .eq('dia', dia)
    .order('vendido_en', { ascending: false });
  if (error) throw error;
  if (!ventas || ventas.length === 0) return [];

  const ids = ventas.map((v: any) => v.id as number);
  const itemRows = await fetchVentaItemsForIds(ids);

  return buildVentaConItemsMap(toRawVentaRows(ventas), itemRows);
}

export async function deleteVenta(id: number): Promise<void> {
  const userId = await getUserId();

  // Fetch consumed ingredient movements
  const { data: consumed, error: consumedError } = await supabase
    .from('movimientos_insumo')
    .select('insumo_id, cantidad_mili')
    .eq('venta_id', id)
    .eq('tipo', 'consumo')
    .eq('user_id', userId);
  if (consumedError) throw consumedError;

  // Restore stock for each consumed ingredient
  for (const item of consumed ?? []) {
    const { data: insumoData, error: fetchError } = await supabase
      .from('insumos')
      .select('stock_mili')
      .eq('id', item.insumo_id)
      .eq('user_id', userId)
      .single();
    if (fetchError) throw fetchError;

    const restoredStock = (insumoData?.stock_mili ?? 0) + item.cantidad_mili;
    const { error: updateError } = await supabase
      .from('insumos')
      .update({ stock_mili: restoredStock })
      .eq('id', item.insumo_id)
      .eq('user_id', userId);
    if (updateError) throw updateError;
  }

  // Delete movimientos_insumo for this venta
  const { error: movDeleteError } = await supabase
    .from('movimientos_insumo')
    .delete()
    .eq('venta_id', id)
    .eq('user_id', userId);
  if (movDeleteError) throw movDeleteError;

  // Delete venta_items
  const { error: viDeleteError } = await supabase
    .from('venta_items')
    .delete()
    .eq('venta_id', id);
  if (viDeleteError) throw viDeleteError;

  // Delete venta
  const { error: ventaDeleteError } = await supabase
    .from('ventas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (ventaDeleteError) throw ventaDeleteError;
}

export async function getAllVentasForExport(): Promise<VentaConItems[]> {
  const userId = await getUserId();

  const { data: ventas, error } = await supabase
    .from('ventas')
    .select('id, vendido_en, dia, total_centavos, metodo_pago, nota')
    .eq('user_id', userId)
    .order('dia', { ascending: false })
    .order('vendido_en', { ascending: false });
  if (error) throw error;
  if (!ventas || ventas.length === 0) return [];

  const ids = ventas.map((v: any) => v.id as number);
  const itemRows = await fetchVentaItemsForIds(ids);

  return buildVentaConItemsMap(toRawVentaRows(ventas), itemRows);
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function getMetricsByRange(
  startDia: string,
  endDia: string,
): Promise<{
  totalCentavos: number;
  numVentas: number;
  costoEstimadoCentavos: number | null;
  compras: number;
  gastos: number;
  gananciaEstimada: number;
  productoTopNombre: string | null;
  productoTopCantidad: number;
  ventasPorDia: { dia: string; totalCentavos: number }[];
  ventasPorHora: { hora: number; totalCentavos: number }[];
}> {
  const userId = await getUserId();

  // Fetch all data sources in parallel
  const [ventasResult, opsResult, comprasResult] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, dia, total_centavos, vendido_en')
      .eq('user_id', userId)
      .gte('dia', startDia)
      .lte('dia', endDia),
    supabase
      .from('operations')
      .select('type, amount, date, source')
      .eq('user_id', userId)
      .gte('date', startDia)
      .lte('date', endDia),
    supabase
      .from('movimientos_insumo')
      .select('costo_total_centavos')
      .eq('tipo', 'compra')
      .eq('user_id', userId)
      .gte('dia', startDia)
      .lte('dia', endDia),
  ]);

  if (ventasResult.error) throw ventasResult.error;
  // operations table may not exist yet — treat error as empty
  const ops: any[] = opsResult.error ? [] : (opsResult.data ?? []);
  if (comprasResult.error) throw comprasResult.error;

  const ventas: any[] = ventasResult.data ?? [];
  const ventaIds: number[] = ventas.map((v) => v.id);

  // Fetch venta_items for cost and top product calculations
  const [viCostResult, viTopResult] = ventaIds.length > 0
    ? await Promise.all([
        supabase
          .from('venta_items')
          .select('cantidad, costo_unitario_centavos')
          .in('venta_id', ventaIds),
        supabase
          .from('venta_items')
          .select('producto_id, cantidad, productos(nombre)')
          .in('venta_id', ventaIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (viCostResult.error) throw viCostResult.error;
  if (viTopResult.error) throw viTopResult.error;

  const viCost: any[] = viCostResult.data ?? [];
  const viTop: any[] = viTopResult.data ?? [];

  // Manual operations aggregation
  const opVentas = ops.filter((o) => o.type === 'venta');
  const opCompras = ops.filter((o) => o.type === 'compra');
  const opGastos = ops.filter((o) => o.type === 'gasto');
  const manualVentaCount = opVentas.filter((o) => o.source === 'manual').length;

  const opVentasTotal = opVentas.reduce((acc: number, o: any) => acc + (o.amount ?? 0), 0);
  const opComprasTotal = opCompras.reduce((acc: number, o: any) => acc + (o.amount ?? 0), 0);
  const opGastosTotal = opGastos.reduce((acc: number, o: any) => acc + (o.amount ?? 0), 0);

  const autoVentasTotal = ventas.reduce((acc: number, v: any) => acc + (v.total_centavos ?? 0), 0);
  const totalCentavos = autoVentasTotal + opVentasTotal;
  const numVentas = ventas.length + opVentas.length;

  const movComprasTotal = (comprasResult.data ?? []).reduce(
    (acc: number, m: any) => acc + (m.costo_total_centavos ?? 0),
    0,
  );
  const compras = movComprasTotal + opComprasTotal;
  const gastos = opGastosTotal;
  const gananciaEstimada = totalCentavos - compras - gastos;

  // Cost estimation: null if any item missing cost OR any manual venta exists
  let costoEstimadoCentavos: number | null = 0;
  if (manualVentaCount > 0) {
    costoEstimadoCentavos = null;
  } else {
    for (const vi of viCost) {
      if (vi.costo_unitario_centavos === null) {
        costoEstimadoCentavos = null;
        break;
      }
      costoEstimadoCentavos = (costoEstimadoCentavos ?? 0) + vi.cantidad * vi.costo_unitario_centavos;
    }
  }

  // Top product by quantity
  const productMap = new Map<number, { nombre: string; total: number }>();
  for (const vi of viTop) {
    const pid: number = vi.producto_id;
    const nombre: string = vi.productos?.nombre ?? '';
    const existing = productMap.get(pid);
    productMap.set(pid, { nombre, total: (existing?.total ?? 0) + vi.cantidad });
  }
  let productoTopNombre: string | null = null;
  let productoTopCantidad = 0;
  for (const entry of productMap.values()) {
    if (entry.total > productoTopCantidad) {
      productoTopCantidad = entry.total;
      productoTopNombre = entry.nombre;
    }
  }

  // ventas por dia — combine auto ventas and manual op ventas
  const ventasPorDiaMap = new Map<string, number>();
  for (const v of ventas) {
    const dia: string = v.dia;
    ventasPorDiaMap.set(dia, (ventasPorDiaMap.get(dia) ?? 0) + (v.total_centavos ?? 0));
  }
  for (const o of opVentas) {
    const dia: string = o.date;
    ventasPorDiaMap.set(dia, (ventasPorDiaMap.get(dia) ?? 0) + (o.amount ?? 0));
  }
  const ventasPorDia = Array.from(ventasPorDiaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, totalCentavos]) => ({ dia, totalCentavos }));

  // ventas por hora — from auto ventas only (epoch ms timestamp)
  const ventasPorHoraMap = new Map<number, number>();
  for (const v of ventas) {
    const hora = new Date(v.vendido_en).getHours();
    ventasPorHoraMap.set(hora, (ventasPorHoraMap.get(hora) ?? 0) + (v.total_centavos ?? 0));
  }
  const ventasPorHora = Array.from(ventasPorHoraMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([hora, totalCentavos]) => ({ hora, totalCentavos }));

  return {
    totalCentavos,
    numVentas,
    costoEstimadoCentavos,
    compras,
    gastos,
    gananciaEstimada,
    productoTopNombre,
    productoTopCantidad,
    ventasPorDia,
    ventasPorHora,
  };
}
