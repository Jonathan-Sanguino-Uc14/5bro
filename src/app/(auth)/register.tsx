import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { B, MONO } from '@/constants/boarding';

const DARK_BG = '#0D0D0D';
const BORDER_IDLE = 'rgba(255,255,255,0.12)';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessFocused, setBusinessFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const headerOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.94);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(32);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    headerOpacity.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    headerScale.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    formOpacity.set(withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) })));
    formTranslateY.set(withDelay(200, withSpring(0, { damping: 22, stiffness: 180 })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  async function handleSubmit() {
    if (submitting) return;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    let hasError = false;
    if (!businessName.trim()) { setNameError('Ingresá el nombre de tu negocio.'); hasError = true; }
    if (!email.trim() || !email.includes('@')) { setEmailError('Ingresá un correo válido.'); hasError = true; }
    if (password.length < 6) { setPasswordError('La contraseña debe tener al menos 6 caracteres.'); hasError = true; }
    if (hasError) return;

    setSubmitting(true);
    const result = await signUp(email.trim(), password, businessName.trim());
    setSubmitting(false);

    if (result?.error) {
      setGeneralError(result.error);
    } else {
      router.replace('/(app)/' as never);
    }
  }

  function handleCtaPressIn() { ctaScale.set(withSpring(0.975, { damping: 20, stiffness: 300 })); }
  function handleCtaPressOut() { ctaScale.set(withSpring(1.0, { damping: 20, stiffness: 300 })); }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.logoRow}>
            <Text style={styles.logoLetic}>letic</Text>
            <Text style={styles.logoIA}>IA</Text>
          </View>
          <Text style={styles.tagline}>Configura tu negocio</Text>
        </Animated.View>

        <Animated.View style={[styles.form, formStyle]}>
          {/* Business name */}
          <View>
            <Text style={styles.fieldLabel}>NOMBRE DEL NEGOCIO</Text>
            <View style={[styles.fieldUnderline, businessFocused && styles.fieldUnderlineFocused, nameError ? styles.fieldUnderlineError : null]} />
            <TextInput
              style={styles.fieldInput}
              placeholder="Mi tienda"
              placeholderTextColor="rgba(245,243,239,0.18)"
              value={businessName}
              onChangeText={(v) => { setBusinessName(v); if (v.trim()) setNameError(''); }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              onFocus={() => setBusinessFocused(true)}
              onBlur={() => setBusinessFocused(false)}
              editable={!submitting}
              selectionColor={B.amber}
              cursorColor={B.amber}
              accessibilityLabel="Nombre del negocio"
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
          </View>

          {/* Email */}
          <View style={{ marginTop: 28 }}>
            <Text style={styles.fieldLabel}>CORREO</Text>
            <View style={[styles.fieldUnderline, emailFocused && styles.fieldUnderlineFocused, emailError ? styles.fieldUnderlineError : null]} />
            <TextInput
              ref={emailRef}
              style={styles.fieldInput}
              placeholder="email@negocio.com"
              placeholderTextColor="rgba(245,243,239,0.18)"
              value={email}
              onChangeText={(v) => { setEmail(v); if (v.trim()) setEmailError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              editable={!submitting}
              selectionColor={B.amber}
              cursorColor={B.amber}
              accessibilityLabel="Correo electrónico"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          {/* Password */}
          <View style={{ marginTop: 28 }}>
            <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
            <View style={[styles.fieldUnderline, passwordFocused && styles.fieldUnderlineFocused, passwordError ? styles.fieldUnderlineError : null]} />
            <TextInput
              ref={passwordRef}
              style={styles.fieldInput}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="rgba(245,243,239,0.18)"
              value={password}
              onChangeText={(v) => { setPassword(v); if (v.length >= 6) setPasswordError(''); }}
              autoCapitalize="none"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              editable={!submitting}
              selectionColor={B.amber}
              cursorColor={B.amber}
              accessibilityLabel="Contraseña"
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          <Text style={styles.note}>
            Tus datos se guardan en la nube. Podés acceder desde cualquier dispositivo.
          </Text>

          {generalError ? (
            <View style={styles.errorBanner}>
              <View style={styles.errorBannerAccent} />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          <Animated.View style={[ctaAnimStyle, { marginTop: 32 }]}>
            <Pressable
              onPress={handleSubmit}
              onPressIn={handleCtaPressIn}
              onPressOut={handleCtaPressOut}
              disabled={submitting}
              style={[styles.cta, submitting && styles.ctaBusy]}
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color={B.ink} size="small" />
              ) : (
                <Text style={styles.ctaText}>CREAR CUENTA  →</Text>
              )}
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => router.push('/(auth)/login' as never)}
            style={styles.loginLink}
            accessibilityRole="button"
            accessibilityLabel="Ya tengo cuenta"
          >
            <Text style={styles.loginLinkText}>Ya tengo cuenta</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },
  scroll: { flexGrow: 1, paddingHorizontal: 32 },
  header: { gap: 10, marginBottom: 52 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoLetic: { fontSize: 44, fontWeight: '900', color: B.ivory, letterSpacing: -1.5, lineHeight: 50 },
  logoIA: { fontSize: 44, fontWeight: '900', color: B.amber, letterSpacing: -1.5, lineHeight: 50 },
  tagline: { fontFamily: MONO, fontSize: 13, letterSpacing: 0.2, color: B.muted },
  form: { flex: 1 },
  fieldLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: B.muted, marginBottom: 2 },
  fieldUnderline: { height: 1, backgroundColor: BORDER_IDLE },
  fieldUnderlineFocused: { backgroundColor: B.amber },
  fieldUnderlineError: { backgroundColor: B.error },
  fieldInput: { fontSize: 17, color: B.ivory, paddingVertical: 12, paddingHorizontal: 0, backgroundColor: 'transparent', letterSpacing: 0.2 },
  fieldError: { fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, color: B.error, marginTop: 6 },
  note: { fontSize: 10, color: 'rgba(245,243,239,0.38)', lineHeight: 16, marginTop: 24, letterSpacing: 0.1 },
  errorBanner: { flexDirection: 'row', backgroundColor: 'rgba(192,57,43,0.14)', marginTop: 16, overflow: 'hidden' },
  errorBannerAccent: { width: 2, backgroundColor: B.error },
  errorBannerText: { flex: 1, fontFamily: MONO, fontSize: 10, color: '#E87B6E', letterSpacing: 0.4, lineHeight: 16, paddingVertical: 10, paddingHorizontal: 12 },
  cta: { backgroundColor: B.amber, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  ctaBusy: { opacity: 0.65 },
  ctaText: { fontFamily: MONO, fontSize: 13, fontWeight: '700', letterSpacing: 2.5, color: B.ink },
  loginLink: { alignSelf: 'center', marginTop: 20, paddingVertical: 8 },
  loginLinkText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: B.muted },
});
