import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';
import {
  getOperations,
  getOperationDayTotals,
  type OperationDayTotal,
  deleteOperation,
  formatAmount,
  formatDate,
  todayISO,
  type Operation,
  type OperationType,
} from '@/lib/operations';

type FilterKey = 'all' | OperationType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'TODOS' },
  { key: 'venta', label: 'VENTAS' },
  { key: 'gasto', label: 'GASTOS' },
];

const TYPE_LABEL: Record<string, string> = {
  venta: 'VENTA',
  compra: 'GASTO',
  gasto: 'GASTO',
};

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'HOY';
  if (iso === yesterdayISO()) return 'AYER';
  return formatDate(iso);
}

function getTypeColor(type: string, amber: string): string {
  if (type === 'venta') return amber;
  return '#E05A4E';
}

// Mixed list item: date section header or operation row
type ListRow =
  | {
      kind: 'header';
      date: string;
      label: string;
      dayVentas: number;
      dayGastos: number;
      gi: number;
    }
  | { kind: 'op'; op: Operation; rowIndex: number; gi: number };

function buildListData(ops: Operation[], totals: OperationDayTotal[]): ListRow[] {
  const map = new Map<string, Operation[]>();
  for (const op of ops) {
    const arr = map.get(op.date) ?? [];
    arr.push(op);
    map.set(op.date, arr);
  }

  const groups = Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));

  const rows: ListRow[] = [];
  groups.forEach(({ date, items }, gi) => {
    const label = dayLabel(date);
    const total = totals.find(row => row.date === date);
    const dayVentas = total?.ventas ?? 0;
    const dayGastos = total?.salidas ?? 0;
    rows.push({ kind: 'header', date, label, dayVentas, dayGastos, gi });
    items.forEach((op, rowIndex) => {
      rows.push({ kind: 'op', op, rowIndex, gi });
    });
  });
  return rows;
}

type OpRowColors = {
  inkColor: string;
  mutedColor: string;
  bgColor: string;
  screenBgColor: string;
  borderColor: string;
  amberColor: string;
  errorColor: string;
};

function DateSectionHeader({
  label,
  dayVentas,
  dayGastos,
  gi,
  colors: c,
}: {
  label: string;
  dayVentas: number;
  dayGastos: number;
  gi: number;
  colors: OpRowColors;
}) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(6);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = 60 + gi * 60;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
    );
    ty.value = withDelay(
      delay,
      withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[styles.dayGroupHeader, style]}
      accessibilityRole="header"
    >
      <Text style={[styles.dayGroupLabel, { color: c.amberColor }]}>
        {label}
      </Text>
      {dayVentas > 0 && (
        <Text style={[styles.dayGroupStat, { color: c.amberColor }]}>
          +${formatAmount(dayVentas)}
        </Text>
      )}
      {dayGastos > 0 && (
        <Text style={[styles.dayGroupStat, { color: c.errorColor }]}>
          −${formatAmount(dayGastos)}
        </Text>
      )}
      <View style={[styles.dayGroupLine, { backgroundColor: c.borderColor }]} />
    </Animated.View>
  );
}

function OpRow({
  op,
  rowIndex,
  gi,
  onDelete,
  colors: c,
}: {
  op: Operation;
  rowIndex: number;
  gi: number;
  onDelete: (id: number) => void;
  colors: OpRowColors;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(-6);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = Math.min(100 + gi * 60 + rowIndex * 40, 400);
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    );
    tx.value = withDelay(
      delay,
      withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
    overflow: 'hidden',
  }));

  const isIncome = op.type === 'venta';
  const sign = isIncome ? '+' : '−';
  const typeColor = getTypeColor(op.type, c.amberColor);
  const amountColor = isIncome ? c.amberColor : c.errorColor;

  function confirmDelete() {
    if (op.source === 'inventory') {
      Alert.alert('Compra de inventario', 'Esta compra está vinculada al stock y no se puede borrar desde el historial.');
      return;
    }
    Alert.alert(
      'Eliminar operación',
      `¿Eliminar "${op.concept}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDelete(op.id),
        },
      ],
    );
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.opRow,
          { backgroundColor: pressed ? c.screenBgColor : c.bgColor },
        ]}
        onLongPress={confirmDelete}
        accessibilityRole="button"
        accessibilityLabel={`${op.concept}, ${TYPE_LABEL[op.type]}, ${formatDate(op.date)}, ${sign}$${formatAmount(op.amount)}`}
        accessibilityHint="Mantén presionado para eliminar"
      >
        <View style={[styles.typeAccent, { backgroundColor: typeColor }]} />
        <View style={styles.opBody}>
          <View style={styles.opTop}>
            <Text
              style={[styles.opConcept, { color: c.inkColor }]}
              numberOfLines={1}
            >
              {op.concept}
            </Text>
            <Text style={[styles.opAmount, { color: amountColor }]}>
              {sign} ${formatAmount(op.amount)}
            </Text>
          </View>
          <View style={styles.opBottom}>
            <Text style={[styles.opType, { color: typeColor }]}>
              {TYPE_LABEL[op.type]}
            </Text>
            {op.category ? (
              <Text style={[styles.opCategory, { color: c.mutedColor }]}>
                · {op.category.toUpperCase()}
              </Text>
            ) : null}
          </View>
          {op.note ? (
            <Text
              style={[styles.opNote, { color: c.mutedColor }]}
              numberOfLines={1}
            >
              {op.note}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={[styles.rowDivider, { backgroundColor: c.borderColor }]} />
    </Animated.View>
  );
}

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [allOps, setAllOps] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHint, setShowHint] = useState(true);
  const hintShownInSession = useRef(false);

  // Debounce ref para búsqueda
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const rowColors: OpRowColors = {
    inkColor: colors.ink,
    mutedColor: colors.muted,
    bgColor: colors.bg,
    screenBgColor: colors.screenBg,
    borderColor: colors.border,
    amberColor: colors.amber,
    errorColor: colors.error,
  };

  const [dayTotals, setDayTotals] = useState<OperationDayTotal[]>([]);
  const requestId = useRef(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const paging = useRef(false);
  const load = useCallback(async (f: FilterKey, offset = 0) => {
    if (offset > 0 && paging.current) return;
    const request = ++requestId.current;
    paging.current = true;
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setHasError(false);
    try {
      const type = f === 'all' ? undefined : f === 'gasto' ? 'salida' : f;
      const [data, totals] = await Promise.all([
        getOperations(50, type, { search: debouncedQuery, offset }),
        getOperationDayTotals(type, debouncedQuery),
      ]);
      if (request !== requestId.current) return;
      setAllOps(previous => offset === 0 ? data : [...previous, ...data]);
      setDayTotals(totals);
      setHasMore(offset + data.length < totals.reduce((sum, row) => sum + row.count, 0));
    } catch {
      if (request === requestId.current) setHasError(true);
    } finally {
      if (request === requestId.current) {
        paging.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedQuery]);

  useFocusEffect(useCallback(() => {
    void load(filter);
    return () => { requestId.current++; paging.current = false; };
  }, [filter, load]));

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Debounce de búsqueda 200ms
  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 200);
  }

  // Hint de long press: aparece una vez por sesión, desaparece a los 5s
  useEffect(() => {
    if (allOps.length > 0 && !hintShownInSession.current) {
      hintShownInSession.current = true;
      setShowHint(true);
      setTimeout(() => setShowHint(false), 5000);
    }
  }, [allOps]);

  async function handleDelete(id: number) {
    try {
      await deleteOperation(id);
      await load(filter);
    } catch (error) {
      Alert.alert('No se pudo eliminar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  }

  const ops = allOps;

  const headerOpacity = useSharedValue(0);
  const headerTy = useSharedValue(-10);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    headerTy.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animación del hint
  useEffect(() => {
    if (showHint) {
      hintOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
    } else {
      hintOpacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.in(Easing.quad),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHint]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTy.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const listData = buildListData(ops, dayTotals);
  const totalOps = dayTotals.reduce((sum, row) => sum + row.count, 0);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: 0 }]}
    >
      {/* Header */}
      <Animated.View
        style={[styles.header, { backgroundColor: colors.bg }, headerStyle]}
      >
        <Text style={[styles.headerCarrier, { color: colors.muted }]}>
          REGISTRO COMERCIAL
        </Text>
        <Text
          style={[styles.headerTitle, { color: colors.ink }]}
          accessibilityRole="header"
        >
          HISTORIAL
        </Text>

        {/* Campo de búsqueda */}
        <View
          style={[styles.searchRow, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.searchIcon, { color: colors.muted }]}>◎</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.ink }]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Buscar concepto…"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            accessibilityLabel="Buscar por concepto"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setDebouncedQuery('');
              }}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.clearBtnText, { color: colors.muted }]}>
                ✕
              </Text>
            </Pressable>
          )}
        </View>

        {/* Filter pills */}
        <View style={[styles.filterRow, { marginTop: 12 }]}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={({ pressed }) => [
                  styles.filterPill,
                  { borderColor: active ? colors.ink : colors.border },
                  active && { backgroundColor: colors.ink },
                  pressed && styles.filterPillPressed,
                ]}
                onPress={() => setFilter(f.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={f.label}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.bg : colors.muted },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.amber} />
        </View>
      ) : hasError ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorIcon, { color: colors.error }]}>⚠</Text>
          <Text style={[styles.errorText, { color: colors.error }]}>
            No se pudo cargar el historial.
          </Text>
          <Pressable
            onPress={() => load(filter)}
            style={[styles.retryBtn, { borderColor: colors.error }]}
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga"
          >
            <Text
              style={[styles.retryBtnText, { color: colors.error }]}
            >
              REINTENTAR
            </Text>
          </Pressable>
        </View>
      ) : ops.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyIcon, { color: colors.muted }]}>◌</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {debouncedQuery.trim()
              ? `No hay resultados para «${debouncedQuery.trim()}».`
              : filter === 'all'
              ? 'Aún no hay operaciones.'
              : `No hay ${filter === 'venta' ? 'ventas' : filter === 'compra' ? 'compras' : 'gastos'} registrados.`}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={listData}
            ListFooterComponent={hasMore ? (
              <Pressable accessibilityRole="button" disabled={loadingMore}
                onPress={() => { void load(filter, allOps.length); }} style={{ padding: 20 }}>
                <Text style={{ color: colors.ink, textAlign: 'center' }}>{loadingMore ? 'Cargando…' : 'Cargar más'}</Text>
              </Pressable>
            ) : null}
            keyExtractor={(item) =>
              item.kind === 'header' ? `h-${item.date}` : `op-${item.op.id}`
            }
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <DateSectionHeader
                    label={item.label}
                    dayVentas={item.dayVentas}
                    dayGastos={item.dayGastos}
                    gi={item.gi}
                    colors={rowColors}
                  />
                );
              }
              return (
                <OpRow
                  op={item.op}
                  rowIndex={item.rowIndex}
                  gi={item.gi}
                  onDelete={handleDelete}
                  colors={rowColors}
                />
              );
            }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
            windowSize={10}
          />

          {/* Hint de long press — aparece una vez por sesión */}
          <Animated.View
            style={[
              styles.hintBar,
              { backgroundColor: colors.bg },
              hintStyle,
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.hintText, { color: `${colors.muted}99` }]}>
              Mantén presionado para eliminar
            </Text>
          </Animated.View>
        </>
      )}

      {!loading && !hasError && totalOps > 0 && (
        <View
          style={[
            styles.countBar,
            {
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 4,
            },
          ]}
        >
          <Text style={[styles.countText, { color: colors.muted }]}>
            {allOps.length} de {totalOps} registros
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerCarrier: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 0,
  },

  // Búsqueda
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  searchIcon: {
    fontFamily: MONO,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: MONO,
    fontSize: 12,
  },

  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillPressed: { transform: [{ scale: 0.97 }] },
  filterText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  dividerLine: { height: 1 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 36, lineHeight: 42 },
  emptyText: {
    fontFamily: MONO,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.3,
  },

  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorIcon: { fontSize: 32, lineHeight: 38 },
  errorText: {
    fontFamily: MONO,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  // Date section header
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  dayGroupLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '700',
  },
  dayGroupStat: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  dayGroupLine: {
    flex: 1,
    height: 1,
  },

  opRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  typeAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  opBody: { flex: 1 },
  opTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  opConcept: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    flex: 1,
    marginRight: 12,
  },
  opAmount: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  opBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opType: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  opCategory: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  opNote: {
    fontFamily: MONO,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  rowDivider: {
    height: 1,
    marginLeft: 35,
  },

  hintBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 6,
  },
  hintText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.3,
  },

  countBar: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  countText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1,
  },
});
