import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  BackHandler, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { MONO } from '@/constants/boarding';
import { useAuth } from '@/lib/auth-context';
import { useAppMode } from '@/lib/mode-context';
import { DARK, LIGHT, useTheme, useThemeTransition } from '@/lib/theme';

export default function ConfiguracionesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, signOut } = useAuth();
  const { lockAdmin } = useAppMode();
  const { colors, isDark, triggerTransition } = useTheme();
  const { isTransitioning, sourceDark, targetDark, progress: transitionProgress } = useThemeTransition();
  const switchFromDark = isTransitioning ? sourceDark : isDark;
  const switchToDark = isTransitioning ? targetDark : isDark;
  const switchFromColors = switchFromDark ? DARK : LIGHT;
  const switchToColors = switchToDark ? DARK : LIGHT;

  const switchContainerRef = useRef<View>(null);
  const themeTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(transitionProgress.value, [0, 1], [
      switchFromDark ? `${switchFromColors.amber}55` : switchFromColors.border,
      switchToDark ? `${switchToColors.amber}55` : switchToColors.border,
    ]),
  }), [switchFromColors, switchFromDark, switchToColors, switchToDark]);
  const themeThumbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(transitionProgress.value, [0, 1], [
      switchFromDark ? switchFromColors.amber : switchFromColors.muted,
      switchToDark ? switchToColors.amber : switchToColors.muted,
    ]),
    transform: [{ translateX: interpolate(transitionProgress.value, [0, 1], [switchFromDark ? 20 : 0, switchToDark ? 20 : 0]) }],
  }), [switchFromColors, switchFromDark, switchToColors, switchToDark]);

  const handleThemeToggle = useCallback(() => {
    if (isTransitioning) return;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const measuredAt = globalThis.performance?.now?.() ?? Date.now();
    switchContainerRef.current?.measureInWindow((px, py, w, h) => {
      if (__DEV__ || process.env.EXPO_PUBLIC_THEME_PERF === '1') console.debug(`[theme-transition] measureInWindow(button): ${((globalThis.performance?.now?.() ?? Date.now()) - measuredAt).toFixed(1)}ms`);
      triggerTransition({
        x: px + w / 2,
        y: py + h / 2,
        startedAt,
      });
    });
  }, [isTransitioning, triggerTransition]);

  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [userName, setUserName] = useState(user?.userName ?? '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  useFocusEffect(useCallback(() => { setConfirmExit(false); }, []));

  async function saveProfile() {
    if (savingRef.current || !user) return;
    if (!businessName.trim()) { setFailed(true); setMessage('Escribe el nombre de tu negocio.'); return; }
    savingRef.current = true; setSaving(true); setMessage('');
    try {
      await updateUser({ businessName: businessName.trim(), userName: userName.trim() });
      Keyboard.dismiss(); setFailed(false); setMessage('Cambios guardados.');
    } catch { setFailed(true); setMessage('No se pudieron guardar los cambios. Intenta de nuevo.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  function exit() {
    if (savingRef.current) return;
    Keyboard.dismiss();
    signOut();
    router.replace('/(auth)/login');
    if (Platform.OS === 'android') BackHandler.exitApp();
  }
  const card = [styles.card, { backgroundColor: colors.screenBg, borderColor: colors.border }];
  const input = [styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.bg }];
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 56}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>A TU MANERA</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>Configuración</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Tu negocio, tu estilo y tus datos.</Text>
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>Perfil del negocio</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Así aparecerás en la aplicación.</Text>
        <Text style={[styles.label, { color: colors.ink }]}>Nombre del negocio</Text>
        <TextInput accessibilityLabel="Nombre del negocio" value={businessName} onChangeText={value => { setBusinessName(value); setMessage(''); }} style={input} editable={!saving} maxLength={100} returnKeyType="next" placeholder="Tu negocio" placeholderTextColor={colors.muted} />
        <Text style={[styles.label, { color: colors.ink }]}>Tu nombre · opcional</Text>
        <TextInput accessibilityLabel="Tu nombre" value={userName} onChangeText={value => { setUserName(value); setMessage(''); }} style={input} editable={!saving} maxLength={100} returnKeyType="done" onSubmitEditing={() => { void saveProfile(); }} placeholder="Cómo te llamas" placeholderTextColor={colors.muted} />
        {user?.email ? <Text style={[styles.body, { color: colors.muted }]}>{user.email}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: failed ? colors.error : colors.ink }]}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void saveProfile(); }} style={[styles.button, { backgroundColor: colors.amber, opacity: saving ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color="#141414" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
        </Pressable>
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>Apariencia</Text>
        <Pressable accessibilityRole="switch" accessibilityLabel="Modo oscuro" accessibilityState={{ checked: isDark, disabled: isTransitioning }} disabled={isTransitioning} onPress={handleThemeToggle} style={styles.row}>
          <View style={styles.rowText}><Text style={[styles.label, { color: colors.ink }]}>Modo oscuro</Text><Text style={[styles.body, { color: colors.muted }]}>{isDark ? 'Activado' : 'Desactivado'} · cambia el ambiente de la app</Text></View>
          <View ref={switchContainerRef} collapsable={false}><Animated.View style={[styles.track, themeTrackStyle]}><Animated.View style={[styles.thumb, themeThumbStyle]} /></Animated.View></View>
        </Pressable>
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>Actividad y datos</Text>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(app)/historial')} style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <View style={styles.rowText}><Text style={[styles.label, { color: colors.ink }]}>Historial de movimientos</Text><Text style={[styles.body, { color: colors.muted }]}>Consulta tus ventas y gastos.</Text></View><Text style={{ color: colors.ink }}>→</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(app)/ventas/exportar')} style={styles.row}>
          <View style={styles.rowText}><Text style={[styles.label, { color: colors.ink }]}>Exportar datos</Text><Text style={[styles.body, { color: colors.muted }]}>Descarga tus registros en CSV.</Text></View><Text style={{ color: colors.ink }}>↗</Text>
        </Pressable>
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>Modo de uso</Text>
        <Pressable accessibilityRole="button" onPress={lockAdmin} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: colors.ink }]}>Cambiar a modo vendedor</Text>
            <Text style={[styles.body, { color: colors.muted }]}>Muestra la pantalla de ventas al cajero.</Text>
          </View>
          <Text style={{ color: colors.ink }}>→</Text>
        </Pressable>
      </View>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>Sesión</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{Platform.OS === 'android' ? 'Cierra la sesión y sal de la aplicación.' : 'Cierra la sesión y vuelve a la pantalla de acceso.'} Tus registros se conservan en este dispositivo.</Text>
        {confirmExit ? <>
          <Text style={[styles.label, { color: colors.ink }]}>¿Quieres salir ahora?</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setConfirmExit(false)} style={[styles.button, styles.flexButton, { borderWidth: 1, borderColor: colors.border }]}><Text style={{ color: colors.ink }}>Cancelar</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={exit} style={[styles.button, styles.flexButton, { backgroundColor: colors.error }]}><Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Confirmar salida</Text></Pressable>
          </View>
        </> : <Pressable accessibilityRole="button" disabled={saving} onPress={() => setConfirmExit(true)} style={[styles.button, { borderWidth: 1, borderColor: colors.error }]}><Text style={{ color: colors.error, fontWeight: '600' }}>Salir de la app</Text></Pressable>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 20, maxWidth: 760, width: '100%', alignSelf: 'center' },
  heading: { gap: 8 }, eyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.5 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -1 },
  body: { fontSize: 13, lineHeight: 20 }, sectionTitle: { fontSize: 19, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  label: { fontSize: 14, fontWeight: '500' }, input: { borderWidth: 1, borderRadius: 12, minHeight: 50, padding: 14, fontSize: 16 },
  button: { minHeight: 48, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#141414', fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, minHeight: 64 }, rowText: { flex: 1, gap: 5 },
  track: { width: 48, height: 28, borderRadius: 14, padding: 4 }, thumb: { width: 20, height: 20, borderRadius: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, flexButton: { flex: 1, minWidth: 130 },
});
