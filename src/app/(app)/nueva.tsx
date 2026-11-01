import { OperationProducts } from '@/components/operation-products';
import { getProductos, createVenta } from '@/db/queries';
import type { Producto, MetodoPago } from '@/db/types';
import { formatCents, parsePesosInput } from '@/lib/money';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppMode } from '@/lib/mode-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';
import {
  createOperation,
  todayISO,
  formatDate,
} from '@/lib/operations';

type EntryType = 'venta' | 'gasto';
const TYPES: { key: EntryType; label: string; color: string }[] = [
  { key: 'venta', label: 'VENTA', color: '#F5A623' },
  { key: 'gasto', label: 'GASTO', color: '#E05A4E' },
];

const CATEGORIES = ['Mercancía', 'Transporte', 'Comisiones', 'Otros'];

function shiftDate(iso: string, days: number): string {
  const [y, mo, day] = iso.split('-').map(Number);
  const date = new Date(y, mo - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function DatePicker({
  value,
  onChange,
  mutedColor,
  inkColor,
  borderColor,
}: {
  value: string;
  onChange: (v: string) => void;
  mutedColor: string;
  inkColor: string;
  borderColor: string;
}) {
  const today = todayISO();
  const isToday = value === today;
  const display = isToday ? 'HOY' : formatDate(value);

  return (
    <View
      style={[styles.datePicker, { borderColor }]}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: display }}
    >
      <Pressable
        onPress={() => onChange(shiftDate(value, -1))}
        hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        style={({ pressed }) => pressed && styles.dateArrowPressed}
        accessibilityLabel="Día anterior"
        accessibilityRole="button"
      >
        <Text style={[styles.dateArrow, { color: mutedColor }]}>←</Text>
      </Pressable>

      <View style={styles.dateCenter}>
        <Text style={[styles.dateDisplay, { color: inkColor }]}>{display}</Text>
        {!isToday && (
          <Text style={[styles.dateISO, { color: mutedColor }]}>
            {formatDate(value)}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => !isToday && onChange(shiftDate(value, 1))}
        hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        style={({ pressed }) => pressed && styles.dateArrowPressed}
        disabled={isToday}
        accessibilityLabel="Día siguiente"
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.dateArrow,
            { color: isToday ? `${mutedColor}40` : mutedColor },
          ]}
        >
          →
        </Text>
      </Pressable>
    </View>
  );
}

export default function NuevaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { mode } = useAppMode();

  const visibleTypes = mode === 'admin' ? TYPES.filter((t) => t.key !== 'venta') : TYPES;

  const [type, setType] = useState<EntryType>('gasto');
  const [saleMode, setSaleMode] = useState<'libre' | 'productos'>('libre');
  const [products, setProducts] = useState<Producto[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState<MetodoPago>('efectivo');
  const [catalogError, setCatalogError] = useState(false);
  const catalogRequest = useRef(0);
  const savingRef = useRef(false);
  const [concept, setConcept] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const checkTy = useSharedValue(8);
  const checkOpacity = useSharedValue(0);

  const conceptRef = useRef<TextInput>(null);

  const activeType = TYPES.find((t) => t.key === type)!;

  const productSale = type === 'venta' && saleMode === 'productos';
  const selected = products.filter(product => (quantities[product.id] ?? 0) > 0);
  const productTotal = selected.reduce((sum, product) => sum + quantities[product.id] * product.precioCentavos, 0);
  const completeCosts = selected.length > 0 && selected.every(product => product.costoUnitarioCentavos !== null);
  const productCost = selected.reduce((sum, product) => sum + quantities[product.id] * (product.costoUnitarioCentavos ?? 0), 0);

  const loadProducts = useCallback(async () => {
    const request = ++catalogRequest.current;
    try {
      const list = await getProductos();
      if (request !== catalogRequest.current) return;
      setProducts(list);
      setCatalogError(false);
      setQuantities(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => list.some(product => product.id === Number(id)))));
    } catch {
      if (request === catalogRequest.current) setCatalogError(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadProducts();
    return () => { catalogRequest.current++; };
  }, [loadProducts]));

  function handleTypePress(key: EntryType) {
    setType(key);
    setError('');
    setSuccess(false);
  }

  async function handleSave() {
    if (savingRef.current) return;
    setError('');
    setSuccess(false);

    const amountCents = productSale ? productTotal : parsePesosInput(amountText);
    if (productSale && catalogError) { setError('No se pudieron actualizar los productos. Vuelve a entrar para reintentar.'); return; }
    if (!productSale && !concept.trim()) {
      setError('El concepto es obligatorio.');
      conceptRef.current?.focus();
      return;
    }
    if (amountCents <= 0) {
      setError(productSale ? 'Elige al menos un producto.' : 'Ingresa un monto mayor a cero.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (productSale) {
        await createVenta({
          items: selected.map(product => ({ productoId: product.id, cantidad: quantities[product.id], precioUnitarioCentavos: product.precioCentavos })),
          metodoPago: payment,
          nota: note || undefined,
        });
      } else await createOperation({
        type,
        concept: concept.trim(),
        amount: amountCents,
        date,
        note: note || undefined,
        category: category || undefined,
      });

      checkOpacity.set(withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }));
      checkTy.set(withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }));
      setSuccess(true);

      setConcept(''); setAmountText(''); setQuantities({}); setNote(''); setCategory(null); setDate(todayISO());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ translateY: checkTy.value }],
  }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 56}
    >
      <View
        style={[styles.root, { paddingTop: 0, backgroundColor: colors.bg }]}
      >
        {/* ── Title bar ────────────────────────── */}
        <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={[styles.backText, { color: colors.muted }]}>← ATRÁS</Text>
          </Pressable>
          <Text
            style={[styles.titleText, { color: colors.ink }]}
            accessibilityRole="header"
          >
            REGISTRAR
          </Text>
          <Pressable onPress={() => router.push('/(app)/historial')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={[styles.backText, { color: colors.muted }]}>HISTORIAL</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Type selector ───────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>TIPO</Text>
            <View
              style={styles.typeRow}
              accessibilityRole="radiogroup"
              accessibilityLabel="Tipo de operación"
            >
              {visibleTypes.map((t) => {
                const active = type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={({ pressed }) => [
                      styles.typePill,
                      { borderColor: active ? t.color : colors.border },
                      active && { backgroundColor: `${t.color}18` },
                      pressed && styles.pillPressed,
                    ]}
                    onPress={() => handleTypePress(t.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={t.label}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        { color: active ? t.color : colors.muted },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {type === 'venta' && <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>¿CÓMO QUIERES REGISTRARLA?</Text>
            <View style={styles.typeRow}>
              {(['libre', 'productos'] as const).map(mode => <Pressable key={mode}
                onPress={() => { setSaleMode(mode); setError(''); setSuccess(false); }}
                style={[styles.typePill, { borderColor: saleMode === mode ? colors.amber : colors.border }]}
                accessibilityRole="radio" accessibilityState={{ checked: saleMode === mode }}>
                <Text style={[styles.typePillText, { color: saleMode === mode ? colors.amber : colors.muted }]}>{mode === 'libre' ? 'IMPORTE LIBRE' : 'CON PRODUCTOS'}</Text>
              </Pressable>)}
            </View>
          </View>}
          {productSale && catalogError && <Pressable accessibilityRole="button" onPress={() => { void loadProducts(); }} style={styles.chip}>
            <Text style={{ color: colors.error }}>No se pudieron cargar los productos. Toca para reintentar.</Text>
          </Pressable>}
          {productSale && !catalogError && <OperationProducts products={products} quantities={quantities}
            onChange={(id, quantity) => { setQuantities(previous => ({ ...previous, [id]: quantity })); setSuccess(false); }}
            onManage={() => router.navigate({ pathname: '/(app)/productos', params: { tab: 'productos' } } as never)} />}
          {type === 'gasto' && <View style={styles.field}>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              Registra aquí cualquier salida de dinero. Para reponer insumos y actualizar las existencias:
            </Text>
            <Pressable onPress={() => router.navigate({ pathname: '/(app)/productos', params: { tab: 'inventario' } } as never)} style={[styles.chip, { borderColor: colors.border }]} accessibilityRole="button">
              <Text style={[styles.chipText, { color: colors.ink }]}>REPONER INVENTARIO →</Text>
            </Pressable>
          </View>}
          {!productSale && <>
          {/* ── Concept ─────────────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              CONCEPTO *
            </Text>
            <TextInput
              ref={conceptRef}
              style={[
                styles.textInput,
                { color: colors.ink, borderBottomColor: colors.borderStrong },
              ]}
              value={concept}
              onChangeText={setConcept}
              placeholder={type === 'venta' ? 'Ej: Venta del día' : 'Ej: Transporte o compra de materiales'}
              placeholderTextColor={colors.muted}
              autoCapitalize="sentences"
              returnKeyType="next"
              accessibilityLabel="Concepto de la operación"
            />
          </View>

          {/* ── Amount ──────────────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              MONTO *
            </Text>
            <View
              style={[
                styles.amountRow,
                { borderBottomColor: activeType.color },
              ]}
            >
              <Text style={[styles.currencySymbol, { color: activeType.color }]}>
                $
              </Text>
              <TextInput
                style={[styles.amountInput, { color: activeType.color }]}
                value={amountText}
                onChangeText={(t) => setAmountText(t.replace(/[^0-9.,]/g, ''))}
                placeholder=""
                placeholderTextColor={`${activeType.color}40`}
                keyboardType="decimal-pad"
                accessibilityLabel="Monto de la operación"
              />
            </View>
          </View>

          </>}
          {productSale && <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>TOTAL DE LA VENTA</Text>
            <Text style={[styles.amountInput, { color: colors.amber }]} adjustsFontSizeToFit numberOfLines={1}>{formatCents(productTotal)}</Text>
            {selected.length > 0 && <Text style={{ color: colors.muted, fontSize: 12 }}>
              {completeCosts ? `Margen bruto estimado: ${formatCents(productTotal - productCost)}` : 'Agrega los costos de tus recetas para estimar el margen.'}
            </Text>}
            <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 12 }]}>FORMA DE PAGO</Text>
            <View style={styles.chipsRow}>
              {(['efectivo', 'tarjeta', 'transferencia', 'otro'] as const).map(method => <Pressable key={method}
                onPress={() => setPayment(method)} accessibilityRole="radio" accessibilityState={{ checked: payment === method }}
                style={[styles.chip, { borderColor: payment === method ? colors.amber : colors.border }]}>
                <Text style={[styles.chipText, { color: payment === method ? colors.amber : colors.muted }]}>{method.toUpperCase()}</Text>
              </Pressable>)}
            </View>
          </View>}

          {/* ── Date picker ─────────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>FECHA</Text>
            {productSale ? <Text style={[styles.dateDisplay, { color: colors.ink }]}>HOY · AL REGISTRAR</Text> : <DatePicker
              value={date}
              onChange={setDate}
              mutedColor={colors.muted}
              inkColor={colors.ink}
              borderColor={colors.borderStrong}
            />}
          </View>

          {!productSale && <>
          {/* ── Category chips ──────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              CATEGORÍA (OPCIONAL)
            </Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: active ? colors.ink : colors.border },
                      active && { backgroundColor: colors.ink },
                      pressed && styles.pillPressed,
                    ]}
                    onPress={() => setCategory(active ? null : cat)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={cat}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.bg : colors.muted },
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          </>}
          {/* ── Note ────────────────────────────── */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              NOTA (OPCIONAL)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.noteInput,
                {
                  color: colors.ink,
                  // Solo borde inferior — consistente con el resto de campos
                  borderBottomColor: colors.borderStrong,
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Algún detalle adicional..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Nota adicional, opcional"
            />
          </View>

          {/* ── Error ───────────────────────────── */}
          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          ) : null}

          {success && <Animated.Text style={[styles.fieldLabel, { color: colors.amber }, checkStyle]}>✓ GUARDADO · PUEDES REGISTRAR OTRO</Animated.Text>}
          {/* ── Save CTA ────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.saveCta,
              { backgroundColor: activeType.color },
              pressed && styles.saveCtaPressed,
              saving && styles.saveCtaDimmed,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar operación"
            accessibilityState={{ disabled: saving }}
          >
            {saving ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.saveCtaText}>
                GUARDAR {type.toUpperCase()}
              </Text>
            )}
          </Pressable>
          <View style={[styles.field, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 20 }]}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>TU NEGOCIO</Text>
            <View style={styles.chipsRow}>
              {([
                ['Productos', '/(app)/productos?tab=productos'], ['Inventario', '/(app)/productos?tab=inventario'],
                ['Métricas', '/(app)/ventas/metricas'], ['Exportar', '/(app)/ventas/exportar'],
              ] as const).map(([label, route]) => <Pressable key={label} onPress={() => router.navigate(route as never)}
                style={[styles.chip, { borderColor: colors.border }]} accessibilityRole="button">
                <Text style={[styles.chipText, { color: colors.muted }]}>{label.toUpperCase()}</Text>
              </Pressable>)}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Title bar
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {},
  backText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.5,
    width: 64,
  },
  titleText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '600',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },

  // Field
  field: { gap: 10 },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 2,
  },

  // Type pills
  typeRow: { flexDirection: 'row', gap: 10 },
  typePill: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  pillPressed: { transform: [{ scale: 0.97 }] },
  typePillText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
  },

  // Text input
  textInput: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 0,
    letterSpacing: 0.1,
  },
  noteInput: {
    height: 72,
    // Solo borderBottomWidth heredado de textInput — sin borderWidth extra
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 14,
  },

  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: 2,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 48,
  },
  amountInput: {
    flex: 1,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 52,
    padding: 0,
  },

  // Date picker
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  dateArrow: {
    fontFamily: MONO,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  dateArrowPressed: { opacity: 0.5 },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dateDisplay: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  dateISO: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  // Category chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  // Error
  errorText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 0.3,
    lineHeight: 16,
  },

  // Save CTA
  saveCta: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  saveCtaPressed: { transform: [{ scale: 0.97 }] },
  saveCtaDimmed: { opacity: 0.7 },
  saveCtaText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#1A1A1A',
  },
});
