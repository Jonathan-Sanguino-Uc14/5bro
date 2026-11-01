import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { savePin, verifyPin } from '@/lib/pin';
import { B, MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

export interface PinModalProps {
  visible: boolean;
  mode: 'setup' | 'verify';
  onSetupComplete: () => void;
  onVerifySuccess: () => void;
  onDismiss: () => void;
}

type Step = 'first' | 'confirm';

// ─── PinDot ───────────────────────────────────────────────────────────────────

interface PinDotProps {
  filled: boolean;
  error: boolean;
  dotColor: string;
}

function PinDot({ filled, error, dotColor }: PinDotProps) {
  const scale = useSharedValue(filled ? 1 : 0.4);
  const opacity = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    if (filled) {
      scale.set(withSpring(1, { damping: 15, stiffness: 250 }));
      opacity.set(withTiming(1, { duration: 80 }));
    } else {
      scale.set(withTiming(0.4, { duration: 100 }));
      opacity.set(withTiming(0, { duration: 100 }));
    }
  }, [filled, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: error ? B.error : dotColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: error ? B.error : dotColor,
          },
          animStyle,
        ]}
      />
    </View>
  );
}

// ─── PadButton ────────────────────────────────────────────────────────────────

interface PadButtonProps {
  label: string;
  onPress: () => void;
  color: string;
  mutedColor: string;
  isDelete?: boolean;
}

function PadButton({ label, onPress, color, mutedColor, isDelete = false }: PadButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.set(withSpring(0.92, { damping: 20, stiffness: 300 })); }}
      onPressOut={() => { scale.set(withSpring(1, { damping: 20, stiffness: 300 })); }}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }}
      accessibilityRole="button"
      accessibilityLabel={isDelete ? 'Borrar' : label}
    >
      <Animated.View style={animStyle}>
        <Text
          style={{
            fontSize: 22,
            color: isDelete ? mutedColor : color,
            fontWeight: '400',
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── PinModal ─────────────────────────────────────────────────────────────────

export default function PinModal({
  visible,
  mode,
  onSetupComplete,
  onVerifySuccess,
  onDismiss,
}: PinModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState('');
  const [step, setStep] = useState<Step>('first');
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const translateY = useSharedValue(300);
  const sheetOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const processingRef = useRef(false);

  // Animate sheet in/out
  useEffect(() => {
    if (visible) {
      setDigits('');
      setStep('first');
      setFirstPin('');
      setErrorMsg(null);
      processingRef.current = false;
      translateY.set(withSpring(0, { damping: 20, stiffness: 180 }));
      sheetOpacity.set(withTiming(1, { duration: 200 }));
    } else {
      translateY.set(
        withTiming(300, { duration: 200, easing: Easing.bezier(0.32, 0, 0.67, 0) }),
      );
      sheetOpacity.set(withTiming(0, { duration: 200 }));
    }
  }, [visible, sheetOpacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    opacity: sheetOpacity.get(),
  }));

  const dotsRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.get() }],
  }));

  function triggerShake(cb?: () => void) {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    shakeX.set(
      withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }, (done) => {
          if (done && cb) runOnJS(cb)();
        }),
      ),
    );
  }

  const processPin = useCallback(
    async (pin: string) => {
      if (processingRef.current) return;
      processingRef.current = true;

      if (mode === 'verify') {
        const ok = await verifyPin(pin);
        if (ok) {
          processingRef.current = false;
          onVerifySuccess();
        } else {
          setErrorMsg('PIN incorrecto.');
          triggerShake(() => {
            setDigits('');
            setErrorMsg(null);
            processingRef.current = false;
          });
        }
        return;
      }

      // setup mode
      if (step === 'first') {
        setFirstPin(pin);
        setDigits('');
        setStep('confirm');
        processingRef.current = false;
        return;
      }

      // confirm step
      if (pin === firstPin) {
        await savePin(pin);
        processingRef.current = false;
        onSetupComplete();
      } else {
        setErrorMsg('Los PINs no coinciden.');
        triggerShake(() => {
          setDigits('');
          setStep('first');
          setFirstPin('');
          setErrorMsg(null);
          processingRef.current = false;
        });
      }
    },
    [mode, step, firstPin, onVerifySuccess, onSetupComplete],
  );

  function handleDigit(d: string) {
    if (digits.length >= 4 || processingRef.current) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => {
        processPin(next);
      }, 50);
    }
  }

  function handleDelete() {
    if (processingRef.current) return;
    setDigits((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  }

  const title = mode === 'setup'
    ? step === 'first' ? 'NUEVO PIN' : 'CONFIRMAR PIN'
    : 'INGRESAR PIN';

  const subtitle = mode === 'setup'
    ? step === 'first'
      ? 'Elige un PIN de 4 dígitos para el modo administrador'
      : 'Repite el PIN para confirmar'
    : 'Ingresa tu PIN de administrador';

  const isError = errorMsg !== null;
  const dotColor = colors.ink;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={mode === 'verify' ? onDismiss : undefined}
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={mode === 'verify' ? onDismiss : undefined}
      >
        {/* Sheet — intercept presses so they don't close the modal */}
        <Pressable
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          onPress={() => {}}
        >
          <Animated.View
            style={[
              {
                backgroundColor: colors.bg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: Math.max(insets.bottom, 16),
                paddingHorizontal: 24,
                paddingTop: 12,
              },
              sheetStyle,
            ]}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />

            {/* Title */}
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 2,
                color: colors.ink,
                textAlign: 'center',
                marginBottom: 6,
              }}
            >
              {title}
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: colors.muted,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {subtitle}
            </Text>

            {/* Dots */}
            <Animated.View
              style={[{ flexDirection: 'row', gap: 20, justifyContent: 'center', marginBottom: 8 }, dotsRowStyle]}
            >
              {[0, 1, 2, 3].map((i) => (
                <PinDot
                  key={i}
                  filled={digits.length > i}
                  error={isError}
                  dotColor={dotColor}
                />
              ))}
            </Animated.View>

            {/* Error message */}
            <View style={{ height: 20, alignItems: 'center', marginBottom: 24 }}>
              {isError && (
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: 0.3,
                    color: B.error,
                  }}
                >
                  {errorMsg}
                </Text>
              )}
            </View>

            {/* Pad */}
            {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).reduce<React.ReactNode[]>(
              (rows, _, i) => {
                if (i % 3 === 0) {
                  const row = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].slice(i, i + 3);
                  rows.push(
                    <View key={i} style={{ flexDirection: 'row' }}>
                      {row.map((d) => (
                        <PadButton
                          key={d}
                          label={d}
                          onPress={() => handleDigit(d)}
                          color={colors.ink}
                          mutedColor={colors.muted}
                        />
                      ))}
                    </View>,
                  );
                }
                return rows;
              },
              [],
            )}

            {/* Bottom row: [placeholder, 0, delete] */}
            <View style={{ flexDirection: 'row' }}>
              {/* Inert placeholder */}
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }} />

              <PadButton
                label="0"
                onPress={() => handleDigit('0')}
                color={colors.ink}
                mutedColor={colors.muted}
              />

              <PadButton
                label="⌫"
                onPress={handleDelete}
                color={colors.ink}
                mutedColor={colors.muted}
                isDelete
              />
            </View>

            {/* Cancel (verify only) */}
            {mode === 'verify' && (
              <Pressable
                onPress={onDismiss}
                style={{ alignItems: 'center', paddingVertical: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: colors.muted,
                  }}
                >
                  CANCELAR
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
