import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getVentasByDia, deleteVenta } from '@/db/queries';
import type { VentaConItems } from '@/db/types';
import { formatCents } from '@/lib/money';
import { addDays, formatDayHeader, formatTime, todayLocalISO } from '@/lib/dates';
import { B, MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

export default function Historial() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedDia, setSelectedDia] = useState(todayLocalISO());
  const [ventas, setVentas] = useState<VentaConItems[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-16);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [headerOpacity, headerTranslateY]);

  const loadVentas = useCallback(async (dia: string) => {
    setLoading(true);
    try {
      const data = await getVentasByDia(dia);
      setVentas(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = setTimeout(() => { void loadVentas(selectedDia); }, 0);
    return () => clearTimeout(task);
  }, [selectedDia, loadVentas]);

  const isToday = selectedDia === todayLocalISO();

  const totalDia = ventas.reduce((acc, v) => acc + v.totalCentavos, 0);
  const costoDiaCompleto = ventas.length > 0 && ventas.every((sale) =>
    sale.items.length > 0 && sale.items.every((item) => item.costoUnitarioCentavos !== null),
  );
  const gananciaBrutaDia = ventas.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) =>
    itemSum + item.cantidad * (item.precioUnitarioCentavos - (item.costoUnitarioCentavos ?? 0)), 0), 0);

  const handleDelete = (id: number) => {
    Alert.alert(
      'Eliminar venta',
      '¿Seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteVenta(id);
            loadVentas(selectedDia);
          },
        },
      ],
    );
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const renderVenta = ({ item }: { item: VentaConItems }) => {
    const expanded = expandedId === item.id;
    const itemsPreview = item.items
      .slice(0, 3)
      .map((i) => `${i.productoNombre} ×${i.cantidad}`)
      .join(', ');

    return (
      <Pressable
        onPress={() => setExpandedId(expanded ? null : item.id)}
        onLongPress={() => handleDelete(item.id)}
        style={[styles.ventaCard, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Venta de ${formatCents(item.totalCentavos)}`}
        accessibilityHint="Toca para expandir, mantén pulsado para eliminar"
      >
        <View style={styles.ventaRow}>
          <Text style={[styles.ventaTime, { color: colors.muted, fontFamily: MONO }]}>
            {formatTime(item.vendidoEn)}
          </Text>
          <View style={[styles.metodoBadge, { borderColor: colors.border }]}>
            <Text style={[styles.metodoText, { color: colors.muted, fontFamily: MONO }]}>
              {item.metodoPago.charAt(0).toUpperCase() + item.metodoPago.slice(1)}
            </Text>
          </View>
          <Text style={[styles.ventaTotal, { color: colors.ink, fontFamily: MONO }]}>
            {formatCents(item.totalCentavos)}
          </Text>
        </View>

        {!expanded && (
          <Text style={[styles.itemsPreview, { color: colors.muted, fontFamily: MONO }]} numberOfLines={1}>
            {itemsPreview || '—'}
          </Text>
        )}

        {expanded && (
          <View style={styles.itemsExpanded}>
            {item.items.map((i) => (
              <View key={i.id}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemNombre, { color: colors.ink, fontFamily: MONO }]}>{i.productoNombre}</Text>
                  <Text style={[styles.itemDetalle, { color: colors.muted, fontFamily: MONO }]}>{`×${i.cantidad}  ${formatCents(i.precioUnitarioCentavos)}`}</Text>
                </View>
                {i.costoUnitarioCentavos !== null && <Text style={[styles.itemCost, { color: colors.muted, fontFamily: MONO }]}>{`Costo est. ${formatCents(i.costoUnitarioCentavos)} por unidad · margen bruto ${formatCents(i.precioUnitarioCentavos - i.costoUnitarioCentavos)}`}</Text>}
              </View>
            ))}
            {item.nota ? (
              <Text style={[styles.notaText, { color: colors.muted, fontFamily: MONO }]}>
                {`"${item.nota}"`}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: 12 }, headerStyle]}>
        <View style={styles.headerTop}>
          {router.canGoBack() ? (
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Text style={[styles.backText, { color: colors.muted, fontFamily: MONO }]}>←</Text>
            </Pressable>
          ) : <View style={styles.backBtn} />}

          <Text style={[styles.headerTitle, { color: colors.ink, fontFamily: MONO }]}>
            HISTORIAL
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Date nav */}
        <View style={styles.dateNav}>
          <Pressable
            onPress={() => setSelectedDia(addDays(selectedDia, -1))}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Día anterior"
          >
            <Text style={[styles.navArrow, { color: colors.ink, fontFamily: MONO }]}>←</Text>
          </Pressable>

          <Text style={[styles.dateLabel, { color: colors.ink, fontFamily: MONO }]}>
            {formatDayHeader(selectedDia)}
          </Text>

          <Pressable
            onPress={() => setSelectedDia(addDays(selectedDia, 1))}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Día siguiente"
          >
            <Text style={[styles.navArrow, { color: colors.ink, fontFamily: MONO }]}>→</Text>
          </Pressable>

          {!isToday && (
            <Pressable
              onPress={() => setSelectedDia(todayLocalISO())}
              style={styles.todayBtn}
              accessibilityRole="button"
              accessibilityLabel="Ir a hoy"
            >
              <Text style={[styles.todayText, { color: B.amber, fontFamily: MONO }]}>HOY</Text>
            </Pressable>
          )}
        </View>

        {/* Day summary */}
        {!loading && (
          <Text style={[styles.daySummary, { color: B.amber, fontFamily: MONO }]}>
            {ventas.length === 0
              ? 'Sin ventas'
              : `${ventas.length} ${ventas.length === 1 ? 'venta' : 'ventas'} · ${formatCents(totalDia)}`}
          </Text>
        )}
        {!loading && ventas.length > 0 && (
          <Text style={[styles.profitSummary, { color: costoDiaCompleto ? colors.ink : colors.muted, fontFamily: MONO }]}>
            {costoDiaCompleto ? `GANANCIA BRUTA EST.  ${formatCents(gananciaBrutaDia)}` : 'Completa las recetas para estimar la ganancia'}
          </Text>
        )}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerState}>
          <Text style={[styles.loadingText, { color: colors.muted, fontFamily: MONO }]}>
            Cargando…
          </Text>
        </View>
      ) : ventas.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.emptyText, { color: colors.muted, fontFamily: MONO }]}>
            Sin ventas este día
          </Text>
        </View>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVenta}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, backgroundColor: colors.bg }}
          style={{ backgroundColor: colors.bg }}
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
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 2.5,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 18,
  },
  dateLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  todayBtn: {
    height: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  daySummary: {
    fontSize: 12,
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  profitSummary: { fontSize: 8, letterSpacing: 0.4, marginTop: -5 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  emptyText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  ventaCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  ventaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ventaTime: {
    fontSize: 12,
    width: 44,
  },
  metodoBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metodoText: {
    fontSize: 10,
  },
  ventaTotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemsPreview: {
    fontSize: 12,
    paddingLeft: 52,
  },
  itemsExpanded: {
    marginTop: 8,
    paddingLeft: 52,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNombre: {
    fontSize: 13,
    flex: 1,
  },
  itemDetalle: {
    fontSize: 12,
  },
  itemCost: { fontSize: 7, lineHeight: 12, marginBottom: 5 },
  notaText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
