import { useEffect, useState } from 'react';
import {
  Platform,
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
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getOperations } from '@/lib/operations';
import { financialCSV } from '@/lib/csv';
import { todayLocalISO } from '@/lib/dates';
import { B, MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

export default function Exportar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [count, setCount] = useState<number | null>(null);
  const [minDate, setMinDate] = useState<string | null>(null);
  const [maxDate, setMaxDate] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-16);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [headerOpacity, headerTranslateY]);

  useEffect(() => {
    let active = true;
    getOperations(-1).then((ventas) => {
      if (!active) return;
      setCount(ventas.length);
      if (ventas.length > 0) {
        const days = ventas.map((v) => v.date).sort();
        setMinDate(days[0] ?? null);
        setMaxDate(days[days.length - 1] ?? null);
      }
    }).catch(() => { if (active) setError('No se pudo cargar el resumen de exportación.'); });
    return () => { active = false; };
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const ventas = await getOperations(-1);
      if (ventas.length === 0) {
        setError('No hay operaciones para exportar');
        return;
      }
      const csv = financialCSV(ventas);
      const filename = `operaciones_${todayLocalISO()}.csv`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      if (!cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('No se puede compartir en este dispositivo.');
      const path = cacheDirectory + filename;
      await writeAsStringAsync(path, csv, {
        encoding: EncodingType.UTF8,
      });
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar operaciones',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      setError('Error al exportar. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const hasVentas = count !== null && count > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <Animated.View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: 12 }, headerStyle]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backText, { color: colors.muted, fontFamily: MONO }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.ink, fontFamily: MONO }]}>
          EXPORTAR
        </Text>
        <View style={styles.backBtn} />
      </Animated.View>

      <View style={[styles.content, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 24 }]}>
        {/* Info card */}
        <View style={[styles.infoCard, { borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.muted, fontFamily: MONO }]}>
            OPERACIONES REGISTRADAS
          </Text>
          <Text style={[styles.infoValue, { color: colors.ink, fontFamily: MONO }]}>
            {count === null ? '…' : String(count)}
          </Text>
          {hasVentas && minDate && maxDate && (
            <Text style={[styles.infoSub, { color: colors.muted, fontFamily: MONO }]}>
              {minDate === maxDate
                ? `Fecha: ${minDate}`
                : `Desde ${minDate} hasta ${maxDate}`}
            </Text>
          )}
          {!hasVentas && count !== null && (
            <Text style={[styles.infoSub, { color: colors.muted, fontFamily: MONO }]}>
              Sin operaciones registradas aún
            </Text>
          )}
        </View>

        {/* Export button */}
        <Pressable
          onPress={handleExport}
          disabled={!hasVentas || exporting}
          style={[
            styles.exportBtn,
            { backgroundColor: hasVentas && !exporting ? B.amber : colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Exportar CSV"
          accessibilityState={{ disabled: !hasVentas || exporting }}
        >
          <Text style={[styles.exportBtnText, { color: B.ink, fontFamily: MONO }]}>
            {exporting ? 'EXPORTANDO…' : 'EXPORTAR CSV'}
          </Text>
        </Pressable>

        <Text style={[styles.description, { color: colors.muted, fontFamily: MONO }]}>
          CSV compatible con Excel / Sheets
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: colors.error, fontFamily: MONO }]}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  infoCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoSub: {
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  exportBtn: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  exportBtnText: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  description: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
