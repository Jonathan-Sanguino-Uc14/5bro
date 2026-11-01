import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getMetricsByRange } from '@/db/queries';
import { addDays, getMonthRange, getPriorPeriod, getTodayRange, getWeekRange } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { calcularComparacion, calcularTicketPromedio } from '@/lib/metrics';
import { useTheme } from '@/lib/theme';
import { MONO } from '@/constants/boarding';

type Period = 'hoy' | 'semana' | 'mes';
type Metrics = Awaited<ReturnType<typeof getMetricsByRange>>;
const PERIODS: { key: Period; label: string }[] = [{ key: 'hoy', label: 'Hoy' }, { key: 'semana', label: 'Semana' }, { key: 'mes', label: 'Mes' }];
function periodRange(period: Period) {
  const today = getTodayRange();
  return { startDia: period === 'hoy' ? today.startDia : period === 'semana' ? getWeekRange().startDia : getMonthRange().startDia, endDia: today.endDia };
}

export default function Dashboard() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('mes');
  const [data, setData] = useState<{ current: Metrics; prior: Metrics; range: ReturnType<typeof periodRange> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setError(false);
    const range = periodRange(period);
    const previous = getPriorPeriod(range);
    try {
      const [current, prior] = await Promise.all([getMetricsByRange(range.startDia, range.endDia), getMetricsByRange(previous.startDia, previous.endDia)]);
      if (request === requestId.current) setData({ current, prior, range });
    } catch {
      if (request === requestId.current) setError(true);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [period]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; }; }, [load]));
  const metrics = data?.current;
  const expenses = metrics ? metrics.compras + metrics.gastos : 0;
  const comparison = data ? calcularComparacion(data.current.totalCentavos, data.prior.totalCentavos) : null;
  const bars: { date: string; value: number }[] = [];
  if (data) {
    const totals = new Map(data.current.ventasPorDia.map(day => [day.dia, day.totalCentavos]));
    for (let date = data.range.startDia; date <= data.range.endDia && bars.length < 31; date = addDays(date, 1)) {
      bars.push({ date, value: totals.get(date) ?? 0 });
    }
  }
  const max = Math.max(1, ...bars.map(bar => bar.value));

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}
    contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void load(); }} tintColor={colors.amber} />}>
    <View style={styles.heading}>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>EL PULSO DE TU NEGOCIO</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>Tus números, claros.</Text>
      <Text style={[styles.body, { color: colors.muted }]}>Ventas, gastos y evolución en un solo lugar.</Text>
    </View>
    <View style={[styles.periods, { backgroundColor: colors.screenBg }]} accessibilityRole="tablist">
      {PERIODS.map(item => <Pressable key={item.key} onPress={() => setPeriod(item.key)} accessibilityRole="tab" accessibilityState={{ selected: item.key === period }}
        style={[styles.period, { backgroundColor: item.key === period ? colors.amber : 'transparent' }]}>
        <Text style={[styles.periodText, { color: item.key === period ? '#141414' : colors.muted }]}>{item.label}</Text>
      </Pressable>)}
    </View>
    {error ? <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={{ color: colors.error }}>No se pudieron cargar las métricas.</Text>
      <Pressable onPress={() => { void load(); }} style={styles.action} accessibilityRole="button"><Text style={{ color: colors.amber }}>Reintentar</Text></Pressable>
    </View> : loading ? <ActivityIndicator style={{ padding: 60 }} color={colors.amber} accessibilityLabel="Cargando métricas" /> : metrics && data ? <>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={[styles.eyebrow, { color: '#C7C3BB' }]}>BALANCE ESTIMADO</Text>
          <Text style={styles.badge}>{PERIODS.find(item => item.key === period)?.label.toUpperCase()}</Text>
        </View>
        <Text style={[styles.balance, { color: metrics.gananciaEstimada < 0 ? '#FF9797' : '#F5A623' }]} numberOfLines={1} adjustsFontSizeToFit>{formatCents(metrics.gananciaEstimada)}</Text>
        <Text style={[styles.body, { color: '#C7C3BB' }]}>Lo vendido menos los gastos registrados.</Text>
        <View style={styles.heroRule} />
        <Text style={styles.heroFoot}>Del {data.range.startDia.split('-').reverse().join('/')} al {data.range.endDia.split('-').reverse().join('/')}. No equivale a utilidad contable.</Text>
      </View>
      <View style={styles.grid}>
        <View style={[styles.metric, { backgroundColor: colors.screenBg, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>↗ VENTAS</Text>
          <Text style={[styles.amount, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>{formatCents(metrics.totalCentavos)}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{metrics.numVentas} ventas registradas</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: colors.screenBg, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>↘ GASTOS</Text>
          <Text style={[styles.amount, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>{formatCents(expenses)}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Incluye reposición de inventario</Text>
        </View>
      </View>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>Cómo van tus ventas</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>{comparison === null ? 'Sin base anterior para comparar.' : `${comparison > 0 ? '+' : ''}${comparison}% frente al período anterior de igual duración.`}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chart}>
          {bars.map(bar => <View key={bar.date} accessible accessibilityLabel={`${bar.date}: ${formatCents(bar.value)} en ventas`} style={styles.barColumn}>
            <View style={styles.barTrack}><View style={{ width: 20, borderRadius: 5, height: bar.value ? Math.max(3, 120 * bar.value / max) : 1, backgroundColor: bar.value ? colors.amber : colors.border }} /></View>
            <Text style={[styles.caption, { color: colors.muted }]}>{Number(bar.date.slice(-2))}</Text>
          </View>)}
        </ScrollView>
        <Text style={[styles.caption, { color: colors.muted }]}>Ventas por día · incluye ventas libres y con productos.</Text>
      </View>
      <View style={styles.grid}>
        <View style={[styles.metric, { borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>VENTA PROMEDIO</Text>
          <Text style={[styles.amount, { color: colors.ink }]} adjustsFontSizeToFit numberOfLines={1}>{metrics.numVentas ? formatCents(calcularTicketPromedio(metrics.totalCentavos, metrics.numVentas)) : '—'}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Importe por operación de venta</Text>
        </View>
        <View style={[styles.metric, { borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>PRODUCTO DESTACADO</Text>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{metrics.productoTopNombre ?? 'Sin datos'}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{metrics.productoTopNombre ? `${metrics.productoTopCantidad} unidades · ventas con productos` : 'Registra ventas con productos para conocerlo.'}</Text>
        </View>
      </View>
      {metrics.numVentas === 0 && expenses === 0 && <Text style={[styles.body, { color: colors.muted }]}>Este período todavía no tiene movimientos. Usa + para empezar a registrar.</Text>}
      <View style={styles.grid}>
        <Pressable style={[styles.action, { borderColor: colors.border }]} onPress={() => router.navigate('/(app)/historial')} accessibilityRole="button"><Text style={{ color: colors.ink }}>Ver movimientos →</Text></Pressable>
        <Pressable style={[styles.action, { borderColor: colors.border }]} onPress={() => router.navigate('/(app)/ventas/exportar')} accessibilityRole="button"><Text style={{ color: colors.ink }}>Exportar datos ↗</Text></Pressable>
      </View>
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 36, gap: 20, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  heading: { gap: 8 }, eyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.3 },
  title: { fontSize: 29, fontWeight: '700', letterSpacing: -1 }, body: { fontSize: 13, lineHeight: 20 },
  periods: { flexDirection: 'row', padding: 5, borderRadius: 14, gap: 4 }, period: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 10 }, periodText: { fontSize: 13, fontWeight: '600' },
  hero: { backgroundColor: '#191919', padding: 24, borderRadius: 22, gap: 16 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  badge: { color: '#F5A623', backgroundColor: '#F5A62318', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontFamily: MONO, fontSize: 9 },
  balance: { fontSize: 42, fontWeight: '700', letterSpacing: -1.5 }, heroRule: { height: 1, backgroundColor: '#FFFFFF15' }, heroFoot: { color: '#A9A59D', fontSize: 11, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: '43%', padding: 18, borderWidth: 1, borderRadius: 18, gap: 12 },
  amount: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6 }, caption: { fontSize: 11, lineHeight: 17 },
  card: { padding: 20, borderRadius: 18, borderWidth: 1, gap: 10 }, cardTitle: { fontSize: 17, fontWeight: '600' },
  chart: { gap: 10, paddingVertical: 16 }, barColumn: { minWidth: 24, alignItems: 'center', gap: 8 }, barTrack: { height: 120, justifyContent: 'flex-end' },
  action: { flex: 1, minWidth: 140, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, padding: 12 },
});
