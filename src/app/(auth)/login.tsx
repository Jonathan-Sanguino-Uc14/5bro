import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { B, MONO } from '@/constants/boarding';

const DARK_BG = '#0D0D0D';
const ORB1 = 'rgba(245,166,35,0.12)';
const ORB2 = 'rgba(245,166,35,0.08)';
const CARD_BORDER = 'rgba(245,166,35,0.20)';
const BORDER_IDLE = 'rgba(255,255,255,0.12)';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { user, signIn, authenticate, signOut, canUseBiometrics } = useAuth();
  const router = useRouter();

  const hasSession = user != null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef<TextInput>(null);

  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.94);
  const orb1Scale = useSharedValue(1);
  const orb2Scale = useSharedValue(1);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    contentOpacity.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    contentScale.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));

    orb1Scale.set(withRepeat(
      withSequence(
        withTiming(1.18, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    ));
    orb2Scale.set(withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      ),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerBiometric = useCallback(async () => {
    setError('');
    setLoading(true);
    cardScale.set(withSpring(0.96, { damping: 20, stiffness: 300 }));
    const result = await authenticate();
    cardScale.set(withSpring(1.0, { damping: 18, stiffness: 280 }));
    setLoading(false);
    if (result.success) {
      router.replace('/(app)/' as never);
    } else {
      setError(result.error ?? 'No se pudo verificar la identidad. Intentá de nuevo.');
    }
  }, [authenticate, cardScale, router]);

  useEffect(() => {
    if (!hasSession) return;
    const timer = setTimeout(triggerBiometric, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession]);

  async function handleSignIn() {
    if (loading) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresá tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError('Correo o contraseña incorrectos.');
    } else {
      router.replace('/(app)/' as never);
    }
  }

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));
  const orb1Style = useAnimatedStyle(() => ({ transform: [{ scale: orb1Scale.value }] }));
  const orb2Style = useAnimatedStyle(() => ({ transform: [{ scale: orb2Scale.value }] }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.orb1, orb1Style]} pointerEvents="none" />
      <Animated.View style={[styles.orb2, orb2Style]} pointerEvents="none" />

      {hasSession ? (
        /* ── Biometric mode ─────────────────────────────────── */
        <Animated.View
          style={[styles.inner, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }, contentStyle]}
        >
          <View style={styles.greeting}>
            <Text style={styles.greetingLabel}>BIENVENIDO DE VUELTA</Text>
            <Text style={styles.businessName} numberOfLines={2}>
              {user?.businessName ?? ''}
            </Text>
          </View>

          <View style={styles.authZone}>
            {canUseBiometrics ? (
              <>
                <Animated.View style={cardStyle}>
                  <Pressable
                    onPress={triggerBiometric}
                    disabled={loading}
                    style={styles.biometricCard}
                    accessibilityRole="button"
                    accessibilityLabel={loading ? 'Verificando identidad' : 'Confirmar identidad con biometría'}
                    accessibilityState={{ disabled: loading, busy: loading }}
                  >
                    <View style={styles.biometricIconSlot}>
                      {loading ? (
                        <ActivityIndicator color={B.amber} size="large" />
                      ) : (
                        <Text style={styles.biometricIcon}>◉</Text>
                      )}
                    </View>
                    <Text style={styles.biometricLabel}>
                      {loading ? 'VERIFICANDO…' : 'CONFIRMAR IDENTIDAD'}
                    </Text>
                  </Pressable>
                </Animated.View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            ) : (
              <View style={styles.noBiometricBox}>
                <Text style={styles.noBiometricText}>
                  Activa la biometría en ajustes del dispositivo para continuar.
                </Text>
                <Pressable onPress={triggerBiometric} style={styles.retryButton} accessibilityRole="button">
                  <Text style={styles.retryText}>REINTENTAR</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Pressable
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              style={styles.signOutButton}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            >
              {({ pressed }) => (
                <Text style={[styles.signOutText, pressed && { opacity: 0.5 }]}>
                  CERRAR SESIÓN
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        /* ── Email + password mode ──────────────────────────── */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[
              styles.inner,
              { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={contentStyle}>
              <View style={styles.greeting}>
                <View style={styles.logoRow}>
                  <Text style={styles.logoLetic}>letic</Text>
                  <Text style={styles.logoIA}>IA</Text>
                </View>
                <Text style={styles.greetingLabel}>INGRESA A TU CUENTA</Text>
              </View>

              <View style={{ marginTop: 48, gap: 28 }}>
                <View>
                  <Text style={styles.fieldLabel}>CORREO</Text>
                  <View style={[styles.fieldUnderline, emailFocused && styles.fieldUnderlineFocused]} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="email@negocio.com"
                    placeholderTextColor="rgba(245,243,239,0.18)"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    editable={!loading}
                    selectionColor={B.amber}
                    cursorColor={B.amber}
                    accessibilityLabel="Correo electrónico"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
                  <View style={[styles.fieldUnderline, passwordFocused && styles.fieldUnderlineFocused]} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.fieldInput}
                    placeholder="Tu contraseña"
                    placeholderTextColor="rgba(245,243,239,0.18)"
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    autoCapitalize="none"
                    secureTextEntry
                    textContentType="password"
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!loading}
                    selectionColor={B.amber}
                    cursorColor={B.amber}
                    accessibilityLabel="Contraseña"
                  />
                </View>
              </View>

              {error ? (
                <View style={[styles.errorBanner, { marginTop: 16 }]}>
                  <View style={styles.errorBannerAccent} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={[styles.cta, { marginTop: 32 }, loading && styles.ctaBusy]}
                accessibilityRole="button"
                accessibilityLabel="Ingresar"
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <ActivityIndicator color={B.ink} size="small" />
                ) : (
                  <Text style={styles.ctaText}>INGRESAR  →</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <View style={styles.footerDivider} />
                <Pressable
                  onPress={() => router.push('/(auth)/register' as never)}
                  style={styles.signOutButton}
                  accessibilityRole="button"
                  accessibilityLabel="Crear cuenta nueva"
                >
                  {({ pressed }) => (
                    <Text style={[styles.signOutText, pressed && { opacity: 0.5 }]}>
                      CREAR CUENTA NUEVA
                    </Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },
  orb1: { position: 'absolute', width: 350, height: 350, borderRadius: 175, top: -80, right: -80, backgroundColor: ORB1 },
  orb2: { position: 'absolute', width: 280, height: 280, borderRadius: 140, bottom: 60, left: -60, backgroundColor: ORB2 },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between' },
  greeting: { gap: 10 },
  greetingLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: B.muted },
  businessName: { fontSize: 28, fontWeight: '700', color: B.ivory, letterSpacing: -0.5, lineHeight: 34 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoLetic: { fontSize: 44, fontWeight: '900', color: B.ivory, letterSpacing: -1.5, lineHeight: 50 },
  logoIA: { fontSize: 44, fontWeight: '900', color: B.amber, letterSpacing: -1.5, lineHeight: 50 },
  authZone: { alignItems: 'center', gap: 20 },
  biometricCard: { borderWidth: 1, borderColor: CARD_BORDER, paddingVertical: 40, paddingHorizontal: 48, alignItems: 'center', gap: 16, minWidth: 200, minHeight: 180, justifyContent: 'center' },
  biometricIconSlot: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  biometricIcon: { fontSize: 64, color: B.amber, lineHeight: 72 },
  biometricLabel: { fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: B.muted },
  errorText: { fontFamily: MONO, fontSize: 10, letterSpacing: 0.4, color: B.error, textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 },
  noBiometricBox: { alignItems: 'center', gap: 24, paddingHorizontal: 16 },
  noBiometricText: { fontFamily: MONO, fontSize: 11, letterSpacing: 0.4, color: B.muted, textAlign: 'center', lineHeight: 18 },
  retryButton: { borderWidth: 1, borderColor: CARD_BORDER, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  retryText: { fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: B.amber },
  footer: { gap: 16, marginTop: 32 },
  footerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  signOutButton: { alignSelf: 'center', paddingVertical: 8 },
  signOutText: { fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: B.muted },
  fieldLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: B.muted, marginBottom: 2 },
  fieldUnderline: { height: 1, backgroundColor: BORDER_IDLE },
  fieldUnderlineFocused: { backgroundColor: B.amber },
  fieldInput: { fontSize: 17, color: B.ivory, paddingVertical: 12, paddingHorizontal: 0, backgroundColor: 'transparent', letterSpacing: 0.2 },
  errorBanner: { flexDirection: 'row', backgroundColor: 'rgba(192,57,43,0.14)', overflow: 'hidden' },
  errorBannerAccent: { width: 2, backgroundColor: B.error },
  errorBannerText: { flex: 1, fontFamily: MONO, fontSize: 10, color: '#E87B6E', letterSpacing: 0.4, lineHeight: 16, paddingVertical: 10, paddingHorizontal: 12 },
  cta: { backgroundColor: B.amber, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  ctaBusy: { opacity: 0.65 },
  ctaText: { fontFamily: MONO, fontSize: 13, fontWeight: '700', letterSpacing: 2.5, color: B.ink },
});
