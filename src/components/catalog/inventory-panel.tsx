import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B, MONO } from '@/constants/boarding';
import { createInsumo, deleteInsumo, getInsumos, renameInsumo, restockInsumo } from '@/db/queries';
import type { Insumo, UnidadInsumo } from '@/db/types';
import { formatCents, parsePesosInput } from '@/lib/money';
import { useTheme } from '@/lib/theme';

const UNIDADES: UnidadInsumo[] = ['kg', 'g', 'L', 'ml', 'pza'];
const milli = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0;
};
const qtyLabel = (milliUnits: number, unit: UnidadInsumo) => `${(milliUnits / 1000).toLocaleString('es-MX', { maximumFractionDigits: 3 })} ${unit}`;

export function InventoryPanel({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [formOpen, setFormOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<Insumo[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnidadInsumo>('kg');
  const [stock, setStock] = useState('');
  const [cost, setCost] = useState('');
  const [restockItem, setRestockItem] = useState<Insumo | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Insumo | null>(null);

  const load = useCallback(async () => { setItems(await getInsumos()); setLoadError(false); }, []);
  useFocusEffect(useCallback(() => { if (active) void load().catch(() => setLoadError(true)); }, [active, load]));

  const add = async () => {
    if (editingItem) {
      if (!name.trim()) { setError('Escribe el nombre del insumo.'); return; }
      setSaving(true); setError('');
      try { await renameInsumo(editingItem.id, name); setEditingItem(null); setName(''); await load(); }
      catch { setError('No se pudo cambiar el nombre.'); }
      finally { setSaving(false); }
      return;
    }
    const amount = stock.trim() ? milli(stock) : 0;
    const totalCost = cost.trim() ? parsePesosInput(cost) : 0;
    if (!name.trim()) { setError('Escribe el nombre del insumo.'); return; }
    if (amount < 0 || (amount > 0 && totalCost <= 0)) { setError('Revisa la cantidad y el costo de compra.'); return; }
    setSaving(true); setError('');
    try {
      await createInsumo({ nombre: name, unidad: unit, cantidadMili: amount, costoTotalCentavos: totalCost });
      setName(''); setStock(''); setCost(''); setFormOpen(false); await load();
    } catch { setError('No se pudo guardar el insumo.'); }
    finally { setSaving(false); }
  };

  const restock = async () => {
    if (!restockItem) return;
    const amount = milli(restockQty);
    const totalCost = parsePesosInput(restockCost);
    if (amount <= 0 || totalCost <= 0) { setError('La cantidad y el costo deben ser mayores a cero.'); return; }
    setSaving(true); setError('');
    try {
      await restockInsumo(restockItem.id, amount, totalCost);
      setRestockItem(null); setRestockQty(''); setRestockCost(''); await load();
    } catch { setError('No se pudo registrar la compra.'); }
    finally { setSaving(false); }
  };

  const confirmDelete = (item: Insumo) => Alert.alert(
    'Eliminar insumo', `¿Eliminar “${item.nombre}”? Si tiene compras, existencias o recetas, se archivará para conservar los cálculos anteriores.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const result = await deleteInsumo(item.id);
        await load();
        if (result === 'archived') Alert.alert('Insumo conservado', 'Se ocultó de la lista; las recetas y ventas anteriores siguen intactas.');
      } },
    ],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.screenBg }]}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.helper, { color: colors.muted }]}>Registra cuánto compras y cuánto cuesta. Después podrás indicar cuánto usa cada producto.</Text>
        <Pressable onPress={() => setFormOpen(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: formOpen }}
          style={[styles.secondary, { borderColor: colors.border, marginBottom: 18 }]}>
          <Text style={[styles.secondaryText, { color: colors.amber }]}>{formOpen ? 'CERRAR FORMULARIO' : '+ AGREGAR INSUMO'}</Text>
        </Pressable>
        {loadError && <Pressable onPress={() => { void load().catch(() => setLoadError(true)); }} accessibilityRole="button" style={{ paddingVertical: 16 }}>
          <Text style={{ color: colors.error }}>No se pudo cargar el inventario. Toca para reintentar.</Text>
        </Pressable>}
        {!!error && <Text style={[styles.error, { color: colors.error, marginBottom: 12 }]}>{error}</Text>}
        {formOpen && <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{editingItem ? 'EDITAR INSUMO' : 'AGREGAR INSUMO'}</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ej. Carne" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel="Nombre del insumo" />
          {!editingItem && <>
          <Text style={[styles.label, { color: colors.muted }]}>UNIDAD DE MEDIDA</Text>
          <View style={styles.units}>
            {UNIDADES.map((item) => <Pressable key={item} onPress={() => setUnit(item)} style={[styles.unitChip, { borderColor: unit === item ? colors.amber : colors.border, backgroundColor: unit === item ? `${colors.amber}20` : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ checked: unit === item }}><Text style={[styles.unitText, { color: unit === item ? colors.ink : colors.muted }]}>{item}</Text></Pressable>)}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>COMPRA INICIAL (OPCIONAL)</Text>
          <View style={styles.fields}>
            <TextInput value={stock} onChangeText={setStock} keyboardType="decimal-pad" placeholder={`Cantidad (${unit})`} placeholderTextColor={colors.muted} style={[styles.input, styles.half, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel={`Cantidad inicial en ${unit}`} />
            <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Costo total $" placeholderTextColor={colors.muted} style={[styles.input, styles.half, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel="Costo total de compra inicial" />
          </View>
          <Text style={[styles.note, { color: colors.muted }]}>Ejemplo: compra 5 kg por $650. Escribe 5 y 650.</Text>
          </>}
          <View style={styles.actions}>
            {editingItem && <Pressable onPress={() => { setEditingItem(null); setName(''); setError(''); }} style={[styles.cancelButton, { borderColor: colors.border }]} accessibilityRole="button"><Text style={[styles.cancelText, { color: colors.muted }]}>CANCELAR</Text></Pressable>}
            <Pressable onPress={() => void add()} disabled={saving} style={[styles.primary, editingItem && styles.primaryFlex, { backgroundColor: colors.amber, opacity: saving ? 0.6 : 1 }]} accessibilityRole="button"><Text style={styles.primaryText}>{saving ? 'GUARDANDO…' : editingItem ? 'GUARDAR CAMBIO' : 'GUARDAR INSUMO'}</Text></Pressable>
          </View>
        </View>

        }
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>EXISTENCIAS</Text>
        {items.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Todavía no tienes insumos. Agrega ingredientes, mercancía o materiales que uses para vender.</Text> : items.map((item) => (
          <View key={item.id} style={[styles.stockCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={styles.stockTop}><View style={styles.stockCopy}><Text style={[styles.stockName, { color: colors.ink }]}>{item.nombre}</Text><Text style={[styles.stockMeta, { color: colors.muted }]}>{qtyLabel(item.stockMili, item.unidad)} disponibles</Text></View><Text style={[styles.stockCost, { color: colors.amber }]}>{item.costoUnitarioCentavos === null ? 'Costo pendiente' : `${formatCents(item.costoUnitarioCentavos)} / ${item.unidad}`}</Text></View>
            {restockItem?.id === item.id ? (
              <View style={styles.restockForm}>
                <View style={styles.fields}>
                  <TextInput value={restockQty} onChangeText={setRestockQty} keyboardType="decimal-pad" placeholder={`Cantidad (${item.unidad})`} placeholderTextColor={colors.muted} style={[styles.input, styles.half, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel={`Cantidad a comprar en ${item.unidad}`} />
                  <TextInput value={restockCost} onChangeText={setRestockCost} keyboardType="decimal-pad" placeholder="Costo total $" placeholderTextColor={colors.muted} style={[styles.input, styles.half, { color: colors.ink, borderColor: colors.border }]} accessibilityLabel="Costo total de la compra" />
                </View>
                <View style={styles.restockActions}><Pressable onPress={() => setRestockItem(null)}><Text style={[styles.cancel, { color: colors.muted }]}>CANCELAR</Text></Pressable><Pressable onPress={() => void restock()} disabled={saving}><Text style={[styles.restockButton, { color: colors.amber }]}>{saving ? 'GUARDANDO…' : 'REGISTRAR COMPRA'}</Text></Pressable></View>
              </View>
            ) : <Pressable onPress={() => { setError(''); setRestockItem(item); }} style={[styles.secondary, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`Registrar compra de ${item.nombre}`}><Text style={[styles.secondaryText, { color: colors.ink }]}>＋  AGREGAR EXISTENCIAS</Text></Pressable>}
            <View style={styles.stockActions}>
              <Pressable onPress={() => { setFormOpen(true); setEditingItem(item); setName(item.nombre); setError(''); }} style={styles.stockAction} accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`}><Text style={[styles.stockActionText, { color: colors.muted }]}>EDITAR</Text></Pressable>
              <Pressable onPress={() => confirmDelete(item)} style={styles.stockAction} accessibilityRole="button" accessibilityLabel={`Eliminar ${item.nombre}`}><Text style={[styles.stockActionText, { color: colors.error }]}>ELIMINAR</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  back: { width: 40, height: 42, justifyContent: 'center' }, backText: { fontSize: 24 }, headerCopy: { flex: 1, alignItems: 'center' }, eyebrow: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.5 }, title: { fontFamily: MONO, fontSize: 12, letterSpacing: 1.5, marginTop: 3 },
  helper: { fontFamily: MONO, fontSize: 10, lineHeight: 17, marginBottom: 14 }, card: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 24 }, cardTitle: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.4, marginBottom: 12 }, label: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.2, marginTop: 12, marginBottom: 8 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, fontFamily: MONO, fontSize: 11 }, fields: { flexDirection: 'row', gap: 8 }, half: { flex: 1, minWidth: 0 }, units: { flexDirection: 'row', gap: 7 }, unitChip: { borderWidth: 1, borderRadius: 7, minWidth: 46, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 9 }, unitText: { fontFamily: MONO, fontSize: 10 }, note: { fontFamily: MONO, fontSize: 8, lineHeight: 13, marginTop: 7 }, error: { fontFamily: MONO, fontSize: 9, marginTop: 10 }, primary: { height: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 7, marginTop: 14, flex: 1 }, primaryFlex: { flex: 1 }, actions: { flexDirection: 'row', gap: 8 }, cancelButton: { height: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 7, paddingHorizontal: 12, marginTop: 14 }, cancelText: { fontFamily: MONO, fontSize: 8 }, primaryText: { color: B.ink, fontFamily: MONO, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 }, sectionTitle: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.8, marginBottom: 10 }, empty: { fontFamily: MONO, fontSize: 10, lineHeight: 17, paddingVertical: 15 }, stockCard: { borderWidth: 1, borderRadius: 9, padding: 13, marginBottom: 9 }, stockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, stockCopy: { flex: 1 }, stockName: { fontSize: 13, fontWeight: '600' }, stockMeta: { fontFamily: MONO, fontSize: 9, marginTop: 4 }, stockCost: { fontFamily: MONO, fontSize: 9, textAlign: 'right' }, secondary: { minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 7, marginTop: 12 }, secondaryText: { fontFamily: MONO, fontSize: 8, letterSpacing: 0.8 }, restockForm: { marginTop: 12 }, restockActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, cancel: { fontFamily: MONO, fontSize: 8 }, restockButton: { fontFamily: MONO, fontSize: 8, fontWeight: '700' }, stockActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 }, stockAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 }, stockActionText: { fontFamily: MONO, fontSize: 8, letterSpacing: 0.8 },
});
