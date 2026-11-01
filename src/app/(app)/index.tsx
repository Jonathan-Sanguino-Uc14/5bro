import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { MONO } from '@/constants/boarding';
import {
  getDayMetrics,
  getRecentOperations,
  formatAmount,
  formatDate,
  todayISO,
  type Operation,
  type DayMetrics,
  type OperationType,
} from '@/lib/operations';

type FilterKey = 'all' | OperationType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'TODOS' },
  { key: 'venta', label: 'VENTAS' },
  { key: 'gasto', label: 'GASTOS' },
];

// Header siempre oscuro (#141414) — los colores literales son intencionales
const HEADER_INK = '#F5F3EF';
const HEADER_MUTED = 'rgba(138,134,128,0.65)';

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

function groupByDate(ops: Operation[]): {
  label: string;
  date: string;
  items: Operation[];
  dayVentas: number;
  dayGastos: number;
}[] {
  const map = new Map<string, Operation[]>();
  for (const op of ops) {
    const arr = map.get(op.date) ?? [];
    arr.push(op);
    map.set(op.date, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => {
      const dayVentas = items
        .filter((op) => op.type === 'venta')
        .reduce((s, op) => s + op.amount, 0);
      const dayGastos = items
        .filter((op) => op.type !== 'venta')
        .reduce((s, op) => s + op.amount, 0);
      return { label: dayLabel(date), date, items, dayVentas, dayGastos };
    });
}

const TYPE_LABEL: Record<string, string> = {
  venta: 'VENTA',
  compra: 'GASTO',
  gasto: 'GASTO',
};

// ── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({
  width,
  height,
  delay = 0,
  color,
}: {
  width: number | string;
  height: number;
  delay?: number;
  color: string;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as number, height, backgroundColor: color, borderRadius: 2 },
        style,
      ]}
    />
  );
}

function HeaderSkeleton({ color }: { color: string }) {
  return (
    <View style={{ gap: 10, paddingVertical: 16 }}>
      <SkeletonBlock width={120} height={14} color={color} delay={0} />
      <SkeletonBlock width={200} height={22} color={color} delay={100} />
    </View>
  );
}

function RowSkeleton({ color, delay }: { color: string; delay: number }) {
  return (
    <SkeletonBlock
      width="100%"
      height={52}
      color={color}
      delay={delay}
    />
  );
}

// ── MetricCell ───────────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  dimmed,
  delay,
  inkColor,
  mutedColor,
  errorColor,
}: {
  label: string;
  value: string;
  dimmed?: boolean;
  delay: number;
  inkColor: string;
  mutedColor: string;
  errorColor: string;
}) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
    ty.value = withDelay(
      delay,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[styles.metricCell, style]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.metricLabel, { color: mutedColor }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          { color: dimmed ? errorColor : inkColor },
        ]}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

// ── DateSectionHeader ────────────────────────────────────────────────────────

function DateSectionHeader({
  label,
  borderColor,
  amberColor,
  errorColor,
  mutedColor,
  groupIndex,
  dayVentas,
  dayGastos,
}: {
  label: string;
  borderColor: string;
  amberColor: string;
  errorColor: string;
  mutedColor: string;
  groupIndex: number;
  dayVentas: number;
  dayGastos: number;
}) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(6);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = 80 + groupIndex * 80;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
    ty.value = withDelay(
      delay,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  const ventasLabel = dayVentas > 0 ? `ventas +$${formatAmount(dayVentas)}` : '';
  const gastosLabel = dayGastos > 0 ? `egresos -$${formatAmount(dayGastos)}` : '';
  const a11yParts = [label, ventasLabel, gastosLabel].filter(Boolean).join(', ');

  return (
    <Animated.View
      style={[styles.dayGroupHeader, style]}
      accessibilityRole="header"
      accessibilityLabel={a11yParts}
    >
      <Text style={[styles.dayGroupLabel, { color: amberColor }]}>{label}</Text>
      {dayVentas > 0 && (
        <Text style={[styles.dayGroupStat, { color: amberColor }]}>
          +${formatAmount(dayVentas)}
        </Text>
      )}
      {dayGastos > 0 && (
        <Text style={[styles.dayGroupStat, { color: errorColor }]}>
          −${formatAmount(dayGastos)}
        </Text>
      )}
      <View style={[styles.dayGroupLine, { backgroundColor: borderColor }]} />
    </Animated.View>
  );
}

// ── OperationRow (pressable) ─────────────────────────────────────────────────

function OperationRow({
  op,
  index,
  groupIndex,
  inkColor,
  mutedColor,
  borderColor,
  amberColor,
  errorColor,
  screenBgColor,
  onPress,
}: {
  op: Operation;
  index: number;
  groupIndex: number;
  inkColor: string;
  mutedColor: string;
  borderColor: string;
  amberColor: string;
  errorColor: string;
  screenBgColor: string;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(-8);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = 120 + groupIndex * 80 + index * 50;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    );
    tx.value = withDelay(
      delay,
      withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  const isIncome = op.type === 'venta';
  const amountColor = isIncome ? amberColor : errorColor;
  const typeColor =
    op.type === 'venta' ? amberColor : errorColor;
  const sign = isIncome ? '+' : '−';

  return (
    <Animated.View style={style}>
      <Pressable
        style={({ pressed }) => [
          styles.opRow,
          { backgroundColor: pressed ? screenBgColor : 'transparent' },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${op.concept}, ${TYPE_LABEL[op.type]}, ${formatDate(op.date)}, ${sign}$${formatAmount(op.amount)}`}
        accessibilityHint="Toca para ver opciones"
      >
        <View style={[styles.opAccent, { backgroundColor: typeColor }]} />
        <View style={styles.opBody}>
          <View style={styles.opTop}>
            <Text
              style={[styles.opConcept, { color: inkColor }]}
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
            {op.note ? (
              <Text
                style={[styles.opNote, { color: mutedColor }]}
                numberOfLines={1}
              >
                · {op.note}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <View
        style={[
          styles.opDivider,
          { backgroundColor: borderColor, marginLeft: 35 },
        ]}
      />
    </Animated.View>
  );
}

// ── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [metrics, setMetrics] = useState<DayMetrics | null>(null);
  const [recent, setRecent] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const headerOpacity = useSharedValue(0);
  const headerTy = useSharedValue(-8);

  const load = useCallback(async () => {
    setHasError(false);
    try {
      const today = todayISO();
      const [m, r] = await Promise.all([
        getDayMetrics(today),
        getRecentOperations(10),
      ]);
      setMetrics(m);
      setRecent(r);
    } catch {
      setHasError(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load().finally(() => {
      if (!active) return;
      setLoading(false);
      headerOpacity.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
      headerTy.set(withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }));
    });
    return () => { active = false; };
  }, [load, headerOpacity, headerTy]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTy.value }],
  }));

  const today = todayISO();
  const [, m, d] = today.split('-');
  const dateLabel = `${d}/${m}`;

  const filtered =
    filter === 'all' ? recent : recent.filter((op) => filter === 'gasto' ? op.type !== 'venta' : op.type === filter);

  // ── Skeleton de carga ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Header skeleton */}
        <View
          style={[
            styles.header,
            { paddingTop: 16, backgroundColor: colors.header },
          ]}
        >
          <HeaderSkeleton color={HEADER_MUTED} />
          <View style={{ paddingVertical: 20, flexDirection: 'row', gap: 16 }}>
            {[0, 100, 200].map((d2) => (
              <View key={d2} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <SkeletonBlock width={48} height={8} color={HEADER_MUTED} delay={d2} />
                <SkeletonBlock width={64} height={14} color={HEADER_MUTED} delay={d2 + 50} />
              </View>
            ))}
          </View>
        </View>
        {/* Filas skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
          {[0, 100, 200].map((d2) => (
            <RowSkeleton key={d2} color={colors.screenBg} delay={d2} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: 16, backgroundColor: colors.header },
          headerStyle,
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerCarrier}>REGISTRO COMERCIAL</Text>
            <Text style={styles.headerBiz} numberOfLines={1}>
              {user?.businessName ?? '—'}
            </Text>
            {user?.userName ? (
              <Text style={styles.headerUserName}>{user.userName}</Text>
            ) : null}
          </View>
          <View style={styles.headerDateBox}>
            <Text style={styles.headerDateLabel}>HOY</Text>
            <Text style={styles.headerDate}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCell
            label="VENTAS"
            value={metrics ? `$${formatAmount(metrics.ventas)}` : '—'}
            delay={60}
            inkColor={HEADER_INK}
            mutedColor={HEADER_MUTED}
            errorColor="#E05A4E"
          />
          <View style={styles.metricSep} />
          <MetricCell
            label="EGRESOS"
            value={
              metrics
                ? `$${formatAmount(metrics.compras + metrics.gastos)}`
                : '—'
            }
            delay={120}
            inkColor={HEADER_INK}
            mutedColor={HEADER_MUTED}
            errorColor="#E05A4E"
          />
          <View style={styles.metricSep} />
          <MetricCell
            label="BALANCE EST."
            value={
              metrics
                ? `${metrics.gananciaEstimada >= 0 ? '' : '−'}$${formatAmount(Math.abs(metrics.gananciaEstimada))}`
                : '—'
            }
            dimmed={metrics ? metrics.gananciaEstimada < 0 : false}
            delay={180}
            inkColor={HEADER_INK}
            mutedColor={HEADER_MUTED}
            errorColor="#E05A4E"
          />
        </View>
        <View style={styles.estimadaNota}>
          <Text style={styles.estimadaText}>
            * balance estimado: ventas − gastos registrados
          </Text>
        </View>
      </Animated.View>

      {/* ── ScrollView ────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber}
            colors={[colors.amber]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            OPERACIONES RECIENTES
          </Text>

          {/* Filter pills */}
          <View style={styles.filterRow}>
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

          {/* Error */}
          {hasError ? (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: `${colors.error}24` },
              ]}
            >
              <Text style={[styles.errorBannerText, { color: colors.error }]}>
                ⚠ No se pudieron cargar los datos. Deslizá para reintentar.
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, { color: colors.muted }]}>◌</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {filter === 'all'
                  ? 'Aún no hay operaciones.\nEmpezá registrando tu primera venta.'
                  : `No hay ${filter === 'venta' ? 'ventas' : filter === 'compra' ? 'compras' : 'gastos'} registrados.`}
              </Text>
            </View>
          ) : (
            <View style={styles.opList}>
              {groupByDate(filtered).map(
                ({ label, date, items, dayVentas, dayGastos }, gi) => (
                  <View key={date}>
                    <DateSectionHeader
                      label={label}
                      borderColor={colors.border}
                      amberColor={colors.amber}
                      errorColor={colors.error}
                      mutedColor={colors.muted}
                      groupIndex={gi}
                      dayVentas={dayVentas}
                      dayGastos={dayGastos}
                    />
                    {items.map((op, i) => (
                      <OperationRow
                        key={op.id}
                        op={op}
                        index={i}
                        groupIndex={gi}
                        inkColor={colors.ink}
                        mutedColor={colors.muted}
                        borderColor={colors.border}
                        amberColor={colors.amber}
                        errorColor={colors.error}
                        screenBgColor={colors.screenBg}
                        onPress={() => router.push('/(app)/historial' as never)}
                      />
                    ))}
                  </View>
                ),
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  headerCarrier: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 2,
    color: HEADER_MUTED,
    marginBottom: 4,
  },
  headerBiz: {
    fontSize: 27,
    fontWeight: '700',
    color: HEADER_INK,
    letterSpacing: -0.5,
    maxWidth: 220,
  },
  headerUserName: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(245,243,239,0.45)',
    marginTop: 4,
  },
  headerDateBox: { alignItems: 'flex-end' },
  headerDateLabel: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 2,
    color: HEADER_MUTED,
    marginBottom: 2,
  },
  headerDate: {
    fontFamily: MONO,
    fontSize: 18,
    fontWeight: '600',
    color: HEADER_INK,
    letterSpacing: 1,
  },

  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  metricLabel: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 1.2,
  },
  metricValue: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metricSep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  estimadaNota: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  estimadaText: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 0.3,
    color: 'rgba(138,134,128,0.50)',
  },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
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

  errorBanner: {
    marginTop: 16,
    padding: 14,
  },
  errorBannerText: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 17,
  },

  opList: { marginHorizontal: -20 },
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
  opAccent: {
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
    marginRight: 10,
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
  opNote: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 0.4,
    flex: 1,
  },
  opDivider: { height: 1 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 36,
    lineHeight: 42,
  },
  emptyText: {
    fontFamily: MONO,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
