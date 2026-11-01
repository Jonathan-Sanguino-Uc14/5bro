import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { buildBusinessSummary } from '@/lib/financial-summary';
import { sendMessage, aiErrorMessage, type ChatMessage } from '@/lib/ai-client';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'error';

interface AppMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const SUGGESTIONS = [
  '¿Cuánto vendí hoy?',
  '¿Cuánto gasté este mes?',
  'Resumen de esta semana',
];

function SuggestionChip({
  suggestion,
  index,
  colors,
  onPress,
}: {
  suggestion: string;
  index: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: (text: string) => void;
}) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(6);

  useEffect(() => {
    const delay = 200 + index * 40;
    opacity.value = withDelay(delay, withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(delay, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={chipStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: pressed ? colors.ink : colors.screenBg,
            borderColor: colors.border,
          },
        ]}
        onPress={() => onPress(suggestion)}
        accessibilityRole="button"
        accessibilityLabel={`Preguntar: ${suggestion}`}
      >
        {({ pressed }) => (
          <Text style={[styles.chipText, { color: pressed ? colors.bg : colors.ink }]}>
            {suggestion}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({
  colors,
  onSuggest,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  onSuggest: (text: string) => void;
}) {
  const emptyOpacity = useSharedValue(0);

  useEffect(() => {
    emptyOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyStyle = useAnimatedStyle(() => ({ opacity: emptyOpacity.value }));

  return (
    <Animated.View style={[styles.emptyState, emptyStyle]}>
      <Text style={[styles.emptyIcon, { color: colors.amber }]}>✦</Text>
      <Text style={[styles.emptyHeadline, { color: colors.ink }]}>
        ¿Qué querés saber sobre tu negocio?
      </Text>
      <Text style={[styles.emptySub, { color: colors.muted }]}>
        Preguntame sobre tus ventas, gastos o tendencias.
      </Text>
      <View style={styles.chipsContainer}>
        {SUGGESTIONS.map((suggestion, i) => (
          <SuggestionChip
            key={suggestion}
            suggestion={suggestion}
            index={i}
            colors={colors}
            onPress={onSuggest}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function UserBubble({
  content,
  colors,
  maxWidth,
}: {
  content: string;
  colors: ReturnType<typeof useTheme>['colors'];
  maxWidth: number;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    tx.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[styles.bubbleRow, styles.bubbleRowUser, style]}>
      <View
        style={[
          styles.bubble,
          styles.bubbleUser,
          { backgroundColor: colors.ink, maxWidth },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Tú: ${content}`}
      >
        <Text style={[styles.bubbleText, { color: colors.bg }]}>{content}</Text>
      </View>
    </Animated.View>
  );
}

function AiBubble({
  content,
  colors,
  maxWidth,
}: {
  content: string;
  colors: ReturnType<typeof useTheme>['colors'];
  maxWidth: number;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    tx.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[styles.bubbleRow, styles.bubbleRowAi, style]}>
      <View
        style={[
          styles.bubble,
          styles.bubbleAi,
          {
            backgroundColor: colors.screenBg,
            borderColor: colors.border,
            maxWidth,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`leticIA: ${content}`}
      >
        <Text style={[styles.bubbleText, { color: colors.ink }]}>{content}</Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  const dotAnim = (sv: typeof dot1, delay: number) => {
    sv.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  };

  useEffect(() => {
    dotAnim(dot1, 0);
    dotAnim(dot2, 150);
    dotAnim(dot3, 300);
    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View
      style={styles.typingRow}
      accessible={true}
      accessibilityLabel="leticIA está procesando tu pregunta"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.typingBubble,
          { backgroundColor: colors.screenBg, borderColor: colors.border },
        ]}
      >
        <Animated.Text style={[styles.typingDot, { color: colors.amber }, d1Style]}>
          •
        </Animated.Text>
        <Animated.Text style={[styles.typingDot, { color: colors.amber }, d2Style]}>
          •
        </Animated.Text>
        <Animated.Text style={[styles.typingDot, { color: colors.amber }, d3Style]}>
          •
        </Animated.Text>
      </View>
      <Text style={[styles.typingLabel, { color: colors.muted }]}>Analizando datos…</Text>
    </View>
  );
}

function ErrorBubble({
  message,
  colors,
  onRetry,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  onRetry: () => void;
  message: string;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const errorBg = `${colors.error}1F`; // ~12% opacity

  return (
    <Animated.View style={[styles.bubbleRow, styles.bubbleRowAi, styles.errorBubbleRow, style]}>
      <View
        style={[
          styles.errorBanner,
          {
            backgroundColor: errorBg,
            borderLeftColor: colors.error,
          },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error, flex: 1 }]}>
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Reintentar el último mensaje"
          style={styles.retryBtn}
        >
          <Text style={[styles.retryText, { color: colors.error }]}>REINTENTAR</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AsistenteScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);

  const sendingRef = useRef(false);
  const historyRef = useRef<ChatMessage[]>([]);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // bubble maxWidths from spec
  const bubbleMaxWidthAi = (width - 32) * 0.85;
  const bubbleMaxWidthUser = (width - 32) * 0.80;

  // ── Header animation ──────────────────────────────────────────────────────
  const headerOpacity = useSharedValue(0);
  const headerTy = useSharedValue(-6);

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    headerOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    headerTy.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTy.value }],
  }));

  // ── Auto-scroll helper ────────────────────────────────────────────────────
  function scrollToEnd(animated = true) {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 80);
  }

  // ── Core send logic ───────────────────────────────────────────────────────
  async function doSend(text: string, retry = false) {
    const question = text.trim();
    if (!question || sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);
    setPendingRetry(question);
    setMessages(prev => [...prev.filter(m => m.role !== 'error'), ...(!retry ? [{ id: msgId(), role: 'user' as const, content: question, timestamp: Date.now() }] : [])]);
    setInputText('');
    scrollToEnd();
    try {
      // Only completed turns enter history. A retry reuses the visible question.
      const summary = await buildBusinessSummary(user?.businessName ?? 'tu negocio');
      const result = await sendMessage(question, historyRef.current, summary);
      if (!aliveRef.current) return;
      if (result.ok) {
        historyRef.current = [...historyRef.current, { role: 'user', content: question }, { role: 'assistant', content: result.content }].slice(-10) as ChatMessage[];
        setMessages(prev => [...prev, { id: msgId(), role: 'assistant', content: result.content, timestamp: Date.now() }]);
        setPendingRetry(null);
      } else {
        setMessages(prev => [...prev, { id: msgId(), role: 'error', content: aiErrorMessage(result.error), timestamp: Date.now() }]);
      }
    } catch {
      if (aliveRef.current) setMessages(prev => [...prev, { id: msgId(), role: 'error', content: 'No se pudieron leer los datos del negocio. Reintenta; no se enviaron cifras incompletas.', timestamp: Date.now() }]);
    } finally {
      sendingRef.current = false;
      if (aliveRef.current) { setLoading(false); scrollToEnd(); }
    }
  }

  function handleSend() {
    doSend(inputText);
  }

  function handleSuggest(text: string) {
    doSend(text);
  }

  function handleRetry() {
    if (!pendingRetry) return;
    doSend(pendingRetry, true);
  }

  function handleClear() {
    if (messages.length === 0 || sendingRef.current) return;
    Alert.alert(
      'Limpiar conversación',
      'Se borrarán todos los mensajes de esta sesión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            if (sendingRef.current) return;
            historyRef.current = [];
            setMessages([]);
            setPendingRetry(null);
          },
        },
      ],
    );
  }

  const hasText = inputText.trim().length > 0;
  const inputDisabled = loading;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: 0 }]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.header, { backgroundColor: colors.bg }, headerStyle]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.carrier, { color: colors.muted }]}>
              ASISTENTE DE NEGOCIO
            </Text>
            <Text
              style={[styles.title, { color: colors.ink }]}
              accessibilityRole="header"
            >
              leticIA
            </Text>
          </View>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Limpiar conversación"
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.clearBtnText,
                  { color: pressed ? colors.ink : colors.muted },
                ]}
              >
                🗑 LIMPIAR
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── Messages area ──────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            messages.length === 0 && styles.scrollContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityLiveRegion="polite"
        >
          {messages.length === 0 && !loading ? (
            <EmptyState colors={colors} onSuggest={handleSuggest} />
          ) : (
            <>
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <UserBubble
                      key={msg.id}
                      content={msg.content}
                      colors={colors}
                      maxWidth={bubbleMaxWidthUser}
                    />
                  );
                }
                if (msg.role === 'assistant') {
                  return (
                    <AiBubble
                      key={msg.id}
                      content={msg.content}
                      colors={colors}
                      maxWidth={bubbleMaxWidthAi}
                    />
                  );
                }
                if (msg.role === 'error') {
                  return <ErrorBubble key={msg.id} message={msg.content} colors={colors} onRetry={handleRetry} />;
                }
                return null;
              })}
              {loading && <TypingIndicator colors={colors} />}
            </>
          )}
        </ScrollView>

        {/* ── Input bar ────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.bg,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.screenBg,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribí tu pregunta…"
            placeholderTextColor={colors.muted}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            editable={!inputDisabled}
            accessibilityLabel="Escribe tu pregunta"
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  hasText && !loading && !inputDisabled ? colors.amber : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!hasText || loading || inputDisabled}
            accessibilityRole="button"
            accessibilityLabel="Enviar pregunta"
            accessibilityState={{ disabled: !hasText || loading || inputDisabled }}
          >
            <Text
              style={[
                styles.sendBtnText,
                {
                  color:
                    hasText && !loading && !inputDisabled ? '#1A1A1A' : colors.muted,
                },
              ]}
            >
              {loading ? '···' : '→'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  carrier: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnPressed: { opacity: 0.7 },
  clearBtnText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  divider: { height: 1 },

  // Status banners
  statusBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statusBannerText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.3,
    lineHeight: 14,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  scrollContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyHeadline: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 0.2,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 24,
  },
  chipsContainer: {
    width: '100%',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 16,
    textAlign: 'center',
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    // no border
  },
  bubbleAi: {
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },

  // Typing indicator
  typingRow: {
    alignItems: 'flex-start',
    gap: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  typingDot: {
    fontSize: 18,
    lineHeight: 20,
  },
  typingLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  // Error bubble
  errorBubbleRow: {
    // Make error banner expand to available width like AI bubbles
    width: '85%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    gap: 8,
    width: '100%',
  },
  errorText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
