import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

export function AppToolbar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const home = pathname === '/';
  const settings = pathname === '/configuraciones';
  const foreground = home ? '#F5F3EF' : colors.ink;
  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: home ? colors.header : colors.bg, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {settings && (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)')}>
            <Text style={{ color: foreground, fontSize: 22 }}>←</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir configuración" accessibilityState={{ disabled: settings }}
          disabled={settings} onPress={() => router.navigate('/(app)/configuraciones')}
          style={[styles.button, { borderColor: colors.border, backgroundColor: settings ? `${colors.amber}20` : 'transparent' }]}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={settings ? colors.amber : foreground} strokeWidth={1.6}>
            <Path strokeLinejoin="round" d="m9 3 1-2h4l1 2 2 1 2 0 2 3-1 2v3l1 2-2 3h-2l-2 1-1 3h-4l-1-3-2-1H5l-2-3 1-2V9L3 7l2-3h2Z" />
            <Circle cx={12} cy={11} r={3} />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { minWidth: 44, minHeight: 44, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  back: { width: 44, height: 44, justifyContent: 'center' },
});
