import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getProductos, createProducto, deleteProducto, updateProducto } from '@/db/queries';
import type { Producto, UnidadInsumo } from '@/db/types';
import { formatCents, parsePesosInput } from '@/lib/money';
import { B, MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

type FormMode = 'closed' | 'add' | { edit: Producto };
type DraftInsumo = { key: number; nombre: string; unidad: UnidadInsumo; cantidad: string; compra: string; costo: string };
const UNIDADES: UnidadInsumo[] = ['kg', 'g', 'L', 'ml', 'pza'];
const toMili = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0;
};

export function ProductsPanel({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loadError, setLoadError] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftInsumos, setDraftInsumos] = useState<DraftInsumo[]>([]);

  const savingRef = useRef(false);
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-16);

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      headerOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      headerTranslateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [headerOpacity, headerTranslateY]);

  const loadProductos = useCallback(async () => {
    const list = await getProductos(false);
    setProductos(list);
    setLoadError(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (active) void loadProductos().catch(() => setLoadError(true));
    }, [active, loadProductos]),
  );

  const openAdd = () => {
    setNombre('');
    setPrecio('');
    setFormError(null);
    setDraftInsumos([{ key: Date.now(), nombre: '', unidad: 'kg', cantidad: '', compra: '', costo: '' }]);
    setFormMode('add');
  };

  const openEdit = (p: Producto) => {
    setNombre(p.nombre);
    setPrecio((p.precioCentavos / 100).toFixed(2));
    setFormError(null);
    setDraftInsumos([]);
    setFormMode({ edit: p });
  };

  const closeForm = () => {
    Keyboard.dismiss();
    setFormMode('closed');
    setNombre('');
    setPrecio('');
    setDraftInsumos([]);
    setFormError(null);
  };

  const cancelForm = () => {
    if (!savingRef.current) closeForm();
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const nombreTrimmed = nombre.trim();
    const precioCentavos = parsePesosInput(precio);

    if (!nombreTrimmed) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (precioCentavos <= 0) {
      setFormError('El precio debe ser mayor a cero');
      return;
    }

    const ingredients = formMode === 'add'
      ? draftInsumos.filter((item) => [item.nombre, item.cantidad, item.compra, item.costo].some((value) => value.trim()))
      : [];
    for (const item of ingredients) {
      if (!item.nombre.trim() || toMili(item.cantidad) <= 0) {
        setFormError('Cada insumo necesita nombre y cantidad por producto.');
        return;
      }
      const hasPurchaseQuantity = item.compra.trim().length > 0;
      const hasPurchaseCost = item.costo.trim().length > 0;
      if (hasPurchaseQuantity !== hasPurchaseCost) {
        setFormError(`Para registrar la compra de ${item.nombre}, completa cantidad y costo.`);
        return;
      }
      if ((hasPurchaseQuantity && toMili(item.compra) <= 0) || (hasPurchaseCost && parsePesosInput(item.costo) <= 0)) {
        setFormError(`Revisa la compra inicial de ${item.nombre}.`);
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      if (formMode === 'add') {
        await createProducto(nombreTrimmed, precioCentavos, ingredients.map((item) => ({
          nombre: item.nombre.trim(),
          unidad: item.unidad,
          cantidadPorUnidadMili: toMili(item.cantidad),
          compraInicialMili: item.compra.trim() ? toMili(item.compra) : 0,
          costoCompraCentavos: item.costo.trim() ? parsePesosInput(item.costo) : 0,
        })));
      } else if (typeof formMode === 'object') {
        await updateProducto(formMode.edit.id, { nombre: nombreTrimmed, precioCentavos });
      }
      closeForm();
      await loadProductos().catch(() => setLoadError(true));
    } catch {
      setFormError('Error al guardar. Intentá nuevamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleToggleActivo = async (p: Producto) => {
    await updateProducto(p.id, { activo: !p.activo });
    loadProductos();
  };

  const handleDelete = (p: Producto) => {
    Alert.alert('Eliminar producto', `¿Eliminar “${p.nombre}”? Si ya tiene ventas, se ocultará del catálogo y se conservará su historial.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const result = await deleteProducto(p.id);
        await loadProductos();
        if (result === 'archived') Alert.alert('Producto conservado', 'Se ocultó del catálogo porque tiene ventas registradas.');
      } },
    ]);
  };

  const updateDraft = (key: number, fields: Partial<DraftInsumo>) => {
    setDraftInsumos((current) => current.map((item) => item.key === key ? { ...item, ...fields } : item));
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const activos = productos.filter((p) => p.activo);
  const inactivos = productos.filter((p) => !p.activo);

  type ListItem =
    | { type: 'producto'; producto: Producto }
    | { type: 'separator'; label: string };

  const listData: ListItem[] = [
    ...activos.map((p): ListItem => ({ type: 'producto', producto: p })),
    ...(inactivos.length > 0
      ? [
          { type: 'separator', label: 'INACTIVOS' } as ListItem,
          ...inactivos.map((p): ListItem => ({ type: 'producto', producto: p })),
        ]
      : []),
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={[styles.separator, { borderBottomColor: colors.border }]}>
          <Text style={[styles.separatorText, { color: colors.muted, fontFamily: MONO }]}>
            {item.label}
          </Text>
        </View>
      );
    }

    const p = item.producto;
    return (
      <View style={[styles.productoRow, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
        <View style={styles.productoInfo}>
          <Text style={[styles.productoNombre, {
            color: p.activo ? colors.ink : colors.muted,
            fontFamily: MONO,
          }]}>
            {p.nombre}
          </Text>
          <Text style={[styles.productoPrecio, { color: colors.muted, fontFamily: MONO }]}>
            {formatCents(p.precioCentavos)}
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/ventas/receta', params: { id: String(p.id) } } as never)}
            accessibilityRole="button"
            accessibilityLabel={`Configurar ingredientes y costo de ${p.nombre}`}
          >
            <Text style={[styles.recipeLink, { color: colors.amber, fontFamily: MONO }]}>
              {p.costoUnitarioCentavos === null
                ? 'AGREGAR RECETA →'
                : `COSTO EST. ${formatCents(p.costoUnitarioCentavos)} · RECETA →`}
            </Text>
          </Pressable>
        </View>
        <View style={styles.productoActions}>
          <Pressable
            onPress={() => openEdit(p)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${p.nombre}`}
          >
            <Text style={[styles.actionIcon, { color: colors.muted, fontFamily: MONO }]}>✎</Text>
          </Pressable>
          <Pressable
            onPress={() => handleToggleActivo(p)}
            style={styles.actionBtn}
            accessibilityRole="switch"
            accessibilityLabel={p.activo ? `Desactivar ${p.nombre}` : `Activar ${p.nombre}`}
            accessibilityState={{ checked: p.activo }}
          >
            <Text style={[styles.actionIcon, {
              color: p.activo ? B.amber : colors.muted,
              fontFamily: MONO,
            }]}>
              {p.activo ? '◉' : '◎'}
            </Text>
          </Pressable>
          <Pressable onPress={() => handleDelete(p)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={`Eliminar ${p.nombre}`}>
            <Text style={[styles.actionIcon, { color: colors.error, fontFamily: MONO }]}>×</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <Animated.View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: 14 }, headerStyle]}>
        <View style={styles.headerRow}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 }}>Lo que vendes, sus precios y recetas.</Text>
          <Pressable onPress={openAdd} style={[styles.backBtn, { width: 'auto', paddingHorizontal: 12 }]}
            accessibilityRole="button" accessibilityLabel="Agregar producto">
            <Text style={{ color: colors.amber, fontFamily: MONO, fontSize: 11 }}>+ PRODUCTO</Text>
          </Pressable>
        </View>
      </Animated.View>
      {loadError && <Pressable accessibilityRole="button" onPress={() => { void loadProductos().catch(() => setLoadError(true)); }} style={{ padding: 16 }}>
        <Text style={{ color: colors.error }}>No se pudieron cargar los productos. Toca para reintentar.</Text>
      </Pressable>}

      <Modal visible={active && formMode !== 'closed'} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={cancelForm}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <View style={[styles.formCard, { paddingTop: insets.top + 12 }]}>
            <Text accessibilityRole="header" style={[styles.formTitle, { color: colors.ink, fontFamily: MONO }]}>
              {formMode === 'add' ? 'NUEVO PRODUCTO' : 'EDITAR PRODUCTO'}
            </Text>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator>
            <View pointerEvents={saving ? 'none' : 'auto'} style={{ gap: 12 }}>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]}
            accessibilityLabel="Nombre del producto"
          />
          <TextInput
            value={precio}
            onChangeText={setPrecio}
            placeholder="Precio (ej: 1500,00)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={[styles.input, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]}
            accessibilityLabel="Precio del producto"
          />
          {formMode === 'add' && <>
            <View style={styles.recipePrompt}>
              <Text style={[styles.recipeQuestion, { color: colors.ink, fontFamily: MONO }]}>¿QUÉ LLEVA CADA PIEZA?</Text>
              <Text style={[styles.recipeHint, { color: colors.muted, fontFamily: MONO }]}>Anota lo que consumes para preparar una. La compra y su costo son opcionales.</Text>
            </View>
            {draftInsumos.map((draft, index) => (
              <View key={draft.key} style={[styles.draftCard, { borderColor: colors.border }]}>
                <View style={styles.draftHeading}>
                  <Text style={[styles.draftTitle, { color: colors.muted, fontFamily: MONO }]}>{`INSUMO ${index + 1}`}</Text>
                  {draftInsumos.length > 1 && <Pressable onPress={() => setDraftInsumos((items) => items.filter((item) => item.key !== draft.key))} accessibilityRole="button" accessibilityLabel={`Quitar insumo ${index + 1}`}><Text style={[styles.removeDraft, { color: colors.muted }]}>×</Text></Pressable>}
                </View>
                <View style={styles.draftFields}>
                  <View style={styles.draftField}><Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: MONO }]}>INSUMO</Text><TextInput value={draft.nombre} onChangeText={(value) => updateDraft(draft.key, { nombre: value })} placeholder="Ej. carne" placeholderTextColor={colors.muted} style={[styles.input, styles.draftName, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]} accessibilityLabel={`Nombre del insumo ${index + 1}`} /></View>
                  <View style={styles.draftField}><Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: MONO }]}>CUÁNTO USA</Text><TextInput value={draft.cantidad} onChangeText={(value) => updateDraft(draft.key, { cantidad: value })} placeholder="0.05" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, styles.draftAmount, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]} accessibilityLabel={`Cantidad usada por producto para el insumo ${index + 1}`} /></View>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: MONO }]}>UNIDAD</Text>
                <View style={styles.unitChoices}>
                  {UNIDADES.map((unit) => <Pressable key={unit} onPress={() => updateDraft(draft.key, { unidad: unit })} style={[styles.unitChoice, { borderColor: draft.unidad === unit ? colors.amber : colors.border, backgroundColor: draft.unidad === unit ? `${colors.amber}18` : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ checked: draft.unidad === unit }}><Text style={[styles.unitChoiceText, { color: draft.unidad === unit ? colors.ink : colors.muted, fontFamily: MONO }]}>{unit}</Text></Pressable>)}
                </View>
                <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: MONO }]}>SI YA COMPRASTE, REGISTRA EXISTENCIA Y GASTO</Text>
                <View style={styles.draftFields}>
                  <TextInput value={draft.compra} onChangeText={(value) => updateDraft(draft.key, { compra: value })} placeholder={`Cantidad (${draft.unidad})`} placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, styles.draftAmount, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]} accessibilityLabel={`Cantidad comprada inicialmente en ${draft.unidad}`} />
                  <TextInput value={draft.costo} onChangeText={(value) => updateDraft(draft.key, { costo: value })} placeholder="Costo total $" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, styles.draftAmount, { color: colors.ink, borderColor: colors.border, fontFamily: MONO }]} accessibilityLabel="Costo de la compra inicial" />
                </View>
              </View>
            ))}
            <Pressable onPress={() => setDraftInsumos((items) => [...items, { key: Date.now(), nombre: '', unidad: 'kg', cantidad: '', compra: '', costo: '' }])} style={styles.addDraft} accessibilityRole="button"><Text style={[styles.addDraftText, { color: colors.amber, fontFamily: MONO }]}>＋ AGREGAR OTRO INSUMO</Text></Pressable>
            <Text style={[styles.example, { color: colors.muted, fontFamily: MONO }]}>Ejemplo taco: carne · 0.05 kg por unidad · compra inicial 5 kg por $650.</Text>
          </>}
            </View>
            </ScrollView>
            <View style={[styles.formFooter, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
              {formError ? <Text accessibilityRole="alert" style={[styles.formError, { color: colors.error, fontFamily: MONO }]}>{formError}</Text> : null}
          <View style={styles.formActions}>
            <Pressable
              onPress={cancelForm}
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              style={[styles.formBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={[styles.formBtnText, { color: colors.muted, fontFamily: MONO }]}>
                CANCELAR
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.formBtn, styles.formBtnPrimary, { backgroundColor: saving ? colors.border : B.amber }]}
              accessibilityRole="button"
              accessibilityLabel="Confirmar producto"
              accessibilityState={{ disabled: saving }}
            >
              <Text style={[styles.formBtnText, { color: B.ink, fontFamily: MONO }]}>
                {saving ? 'GUARDANDO…' : 'CONFIRMAR'}
              </Text>
            </Pressable>
          </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {listData.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.bg }]}>
          <Text style={[styles.emptyText, { color: colors.muted, fontFamily: MONO }]}>
            Sin productos
          </Text>
          <Pressable
            onPress={openAdd}
            style={styles.emptyAction}
            accessibilityRole="button"
          >
            <Text style={[styles.emptyActionText, { color: B.amber, fontFamily: MONO }]}>
              Agregar primero
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'producto' ? `p-${item.producto.id}` : `sep-${index}`
          }
          renderItem={renderItem}
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
  },
  addIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 2.5,
  },
  insumosLink: { borderBottomWidth: 1, paddingHorizontal: 18, paddingVertical: 11 },
  insumosText: { fontSize: 8, letterSpacing: 1.1, textAlign: 'center' },
  recipeLink: { fontSize: 7, letterSpacing: 0.5, marginTop: 5 },
  formCard: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  formContent: { paddingHorizontal: 20, paddingVertical: 20 },
  formFooter: { flexShrink: 0, borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 20, gap: 10 },
  formTitle: { fontSize: 16, letterSpacing: 1.5, paddingHorizontal: 20, paddingVertical: 12 },
  formScroll: { flex: 1, minHeight: 0 },
  recipePrompt: { gap: 4, marginTop: 5 },
  recipeQuestion: { fontSize: 11, letterSpacing: 0.5, fontWeight: '700' },
  recipeHint: { fontSize: 10, lineHeight: 15 },
  draftCard: { borderWidth: 1, borderRadius: 7, padding: 10, gap: 8, marginVertical: 3 },
  draftHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draftTitle: { fontSize: 9, letterSpacing: 1 },
  removeDraft: { fontSize: 19, lineHeight: 20, paddingHorizontal: 5 },
  draftFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  draftField: { flex: 1, minWidth: 120, gap: 4 },
  fieldLabel: { fontSize: 8, letterSpacing: 0.5 },
  draftName: { flex: 1, minWidth: 0 },
  draftAmount: { flex: 1, minWidth: 120, fontSize: 10, paddingHorizontal: 7 },
  unitChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChoice: { minWidth: 39, alignItems: 'center', borderWidth: 1, borderRadius: 5, paddingVertical: 10 },
  unitChoiceText: { fontSize: 10 },
  addDraft: { minHeight: 38, justifyContent: 'center' },
  addDraftText: { fontSize: 8, letterSpacing: 0.7 },
  example: { fontSize: 9, lineHeight: 14 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  formError: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  formBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  formBtnPrimary: {
    borderWidth: 0,
  },
  formBtnText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  productoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  productoInfo: {
    flex: 1,
    gap: 2,
  },
  productoNombre: {
    fontSize: 14,
  },
  productoPrecio: {
    fontSize: 13,
  },
  productoActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
  separator: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  separatorText: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  emptyAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: {
    fontSize: 13,
    letterSpacing: 1,
  },
});
