import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B, MONO } from '@/constants/boarding';
import { deleteRecetaItem, getInsumos, getProductos, getReceta, saveRecetaItem } from '@/db/queries';
import type { Insumo, Producto, RecetaItem } from '@/db/types';
import { formatCents } from '@/lib/money';
import { useTheme } from '@/lib/theme';

const milli = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0;
};
const quantity = (value: number, unit: string) => `${(value / 1000).toLocaleString('es-MX', { maximumFractionDigits: 3 })} ${unit}`;

export default function Receta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Producto | null>(null);
  const [ingredients, setIngredients] = useState<Insumo[]>([]);
  const [recipe, setRecipe] = useState<RecetaItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(productId) || productId <= 0) return;
    const [products, available, current] = await Promise.all([getProductos(false), getInsumos(), getReceta(productId)]);
    setProduct(products.find((item) => item.id === productId) ?? null);
    setIngredients(available);
    setRecipe(current);
  }, [productId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totalCost = useMemo(() => recipe.some((item) => item.costoPorProductoCentavos === null)
    ? null : recipe.reduce((sum, item) => sum + (item.costoPorProductoCentavos ?? 0), 0), [recipe]);

  const addItem = async () => {
    const quantityMili = milli(amount);
    if (!selected) { setError('Elige un insumo.'); return; }
    if (quantityMili <= 0) { setError('La cantidad por producto debe ser mayor a cero.'); return; }
    setSaving(true); setError('');
    try { await saveRecetaItem(productId, selected, quantityMili); setSelected(null); setAmount(''); await load(); }
    catch { setError('No se pudo guardar este ingrediente.'); }
    finally { setSaving(false); }
  };

  const removeItem = async (ingredientId: number) => {
    await deleteRecetaItem(productId, ingredientId);
    if (selected === ingredientId) { setSelected(null); setAmount(''); }
    await load();
  };

  const editItem = (item: RecetaItem) => {
    setSelected(item.id);
    setAmount((item.cantidadMili / 1000).toString());
    setError('');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.screenBg }]}>
      <View style={[styles.header, { paddingTop: 10, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Volver"><Text style={[styles.backText, { color: colors.muted }]}>←</Text></Pressable>
        <View style={styles.headCopy}><Text style={[styles.eyebrow, { color: colors.muted }]}>COSTO Y PORCIONES</Text><Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>{product?.nombre ?? 'RECETA'}</Text></View>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.help, { color: colors.muted }]}>Define cuánto de cada insumo se usa para preparar una unidad vendida. Las cantidades aceptan decimales.</Text>
        <View style={[styles.summary, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>COSTO DE INSUMOS POR UNIDAD</Text>
          <Text style={[styles.summaryAmount, { color: totalCost === null ? colors.muted : colors.amber }]}>{totalCost === null ? 'Agrega costos de compra' : formatCents(totalCost)}</Text>
          {totalCost !== null && product && <Text style={[styles.summaryMeta, { color: colors.muted }]}>{`Precio ${formatCents(product.precioCentavos)} · margen bruto est. ${formatCents(product.precioCentavos - totalCost)}`}</Text>}
          <Text style={[styles.summaryMeta, { color: colors.muted }]}>Estimación antes de gastos generales; se calcula con el costo promedio registrado.</Text>
        </View>
        <Text style={[styles.section, { color: colors.muted }]}>COMPOSICIÓN</Text>
        {recipe.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Aún no hay ingredientes. Por ejemplo: taco — 0.05 kg de carne.</Text> : recipe.map((item) => (
          <View key={item.id} style={[styles.recipeRow, { backgroundColor: colors.bg, borderColor: selected === item.id ? colors.amber : colors.border }]}>
            <Pressable onPress={() => editItem(item)} style={styles.recipeCopy} accessibilityRole="button" accessibilityLabel={`Editar cantidad de ${item.nombre}`}><Text style={[styles.ingredientName, { color: colors.ink }]}>{item.nombre}</Text><Text style={[styles.meta, { color: colors.muted }]}>{`${quantity(item.cantidadMili, item.unidad)} por unidad · ${quantity(item.stockMili, item.unidad)} en existencia · Toca para editar`}</Text></Pressable>
            <View style={styles.recipeRight}><Text style={[styles.cost, { color: item.costoPorProductoCentavos === null ? colors.muted : colors.amber }]}>{item.costoPorProductoCentavos === null ? 'sin costo' : formatCents(item.costoPorProductoCentavos)}</Text><Pressable onPress={() => Alert.alert('Quitar ingrediente', `¿Quitar ${item.nombre} de este producto?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Quitar', style: 'destructive', onPress: () => void removeItem(item.id) }])} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${item.nombre} de la receta`}><Text style={[styles.remove, { color: colors.error }]}>×</Text></Pressable></View>
          </View>
        ))}
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{selected !== null && recipe.some((item) => item.id === selected) ? 'CAMBIAR CANTIDAD' : 'AGREGAR INGREDIENTE'}</Text>
          {ingredients.length === 0 ? <Pressable onPress={() => router.navigate({ pathname: '/(app)/productos', params: { tab: 'inventario' } } as never)} accessibilityRole="button"><Text style={[styles.empty, { color: colors.amber }]}>Primero agrega insumos y sus costos →</Text></Pressable> : <>
            <View style={styles.picker}>
              {ingredients.map((item) => <Pressable key={item.id} onPress={() => { setSelected(item.id); setAmount(''); setError(''); }} style={[styles.ingredientChip, { borderColor: selected === item.id ? colors.amber : colors.border, backgroundColor: selected === item.id ? `${colors.amber}20` : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }}><Text style={[styles.chipText, { color: selected === item.id ? colors.ink : colors.muted }]}>{item.nombre}</Text></Pressable>)}
            </View>
            {selected !== null && <View style={styles.addRow}><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={`Cantidad (${ingredients.find((item) => item.id === selected)?.unidad ?? recipe.find((item) => item.id === selected)?.unidad ?? ''})`} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel="Cantidad de insumo por producto"/><Pressable onPress={() => void addItem()} disabled={saving} style={[styles.addButton, { backgroundColor: colors.amber }]} accessibilityRole="button"><Text style={styles.addButtonText}>{saving ? '…' : recipe.some((item) => item.id === selected) ? 'ACTUALIZAR' : 'AGREGAR'}</Text></Pressable></View>}
          </>}
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 }, back: { width: 40, height: 42, justifyContent: 'center' }, backText: { fontSize: 24 }, headCopy: { flex: 1, alignItems: 'center' }, eyebrow: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.5 }, title: { fontFamily: MONO, fontSize: 11, letterSpacing: 1, marginTop: 3 }, help: { fontFamily: MONO, fontSize: 10, lineHeight: 17, marginBottom: 14 }, summary: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 23 }, summaryLabel: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.3 }, summaryAmount: { fontFamily: MONO, fontWeight: '700', fontSize: 20, marginTop: 7 }, summaryMeta: { fontFamily: MONO, fontSize: 8, lineHeight: 14, marginTop: 5 }, section: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.6, marginBottom: 9 }, empty: { fontFamily: MONO, fontSize: 9, lineHeight: 16, paddingVertical: 10 }, recipeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 7 }, recipeCopy: { flex: 1 }, ingredientName: { fontSize: 12, fontWeight: '600' }, meta: { fontFamily: MONO, fontSize: 8, marginTop: 5, lineHeight: 13 }, recipeRight: { alignItems: 'center', flexDirection: 'row', gap: 10 }, cost: { fontFamily: MONO, fontSize: 9 }, remove: { fontSize: 22, paddingHorizontal: 4 }, card: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 18 }, cardTitle: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.4, marginBottom: 11 }, picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, ingredientChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 8 }, chipText: { fontFamily: MONO, fontSize: 9 }, addRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, input: { flex: 1, height: 44, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, fontFamily: MONO, fontSize: 10 }, addButton: { minWidth: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 7, paddingHorizontal: 12 }, addButtonText: { fontFamily: MONO, color: B.ink, fontSize: 8, fontWeight: '700' }, error: { fontFamily: MONO, fontSize: 9, marginTop: 9 },
});
