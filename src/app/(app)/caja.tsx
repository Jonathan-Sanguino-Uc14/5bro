import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useAppMode } from '@/lib/mode-context';
import { getProductos, createVenta } from '@/db/queries';
import { formatAmount } from '@/lib/operations';
import { useTheme } from '@/lib/theme';
import { B, MONO } from '@/constants/boarding';
import PinModal from '@/components/pin-modal';
import type { Producto, MetodoPago } from '@/db/types';

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  producto: Producto;
  qty: number;
  cardWidth: number;
  onAdd: () => void;
  onSubtract: () => void;
  onLongPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ProductCard({ producto, qty, cardWidth, onAdd, onSubtract, onLongPress, colors }: ProductCardProps) {
  const hasQty = qty > 0;
  const outOfStock = producto.maxVendible !== null && producto.maxVendible <= 0;
  const atMax = producto.maxVendible !== null && qty >= producto.maxVendible;
  const remaining = producto.maxVendible !== null ? producto.maxVendible - qty : null;

  return (
    <Pressable
      onLongPress={outOfStock ? undefined : onLongPress}
      delayLongPress={400}
      style={{ width: cardWidth }}
      accessibilityRole="none"
    >
      <View
        style={{
          width: cardWidth,
          minHeight: 90,
          padding: 10,
          paddingBottom: 6,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: hasQty ? B.amber : outOfStock ? `${colors.border}60` : colors.border,
          backgroundColor: outOfStock ? `${colors.bg}80` : hasQty ? `${B.amber}10` : colors.bg,
          opacity: outOfStock ? 0.5 : 1,
          gap: 2,
        }}
      >
        {/* Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors.ink,
            flexShrink: 1,
          }}
          numberOfLines={2}
        >
          {producto.nombre}
        </Text>

        {/* Price + stock */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.muted }}>
            {formatAmount(producto.precioCentavos)}
          </Text>
          {producto.maxVendible !== null && (
            <Text style={{ fontFamily: MONO, fontSize: 9, color: outOfStock ? B.error : remaining === 1 ? B.amber : colors.muted }}>
              {outOfStock ? 'SIN STOCK' : `${remaining} disp.`}
            </Text>
          )}
        </View>

        {/* Stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          {/* Minus */}
          <Pressable
            onPress={onSubtract}
            disabled={qty === 0}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: qty === 0 ? `${colors.border}40` : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Quitar uno"
          >
            <Text style={{ fontSize: 16, color: qty === 0 ? `${colors.muted}40` : colors.ink, lineHeight: 20 }}>−</Text>
          </Pressable>

          {/* Qty */}
          <Text style={{
            fontFamily: MONO,
            fontSize: 15,
            fontWeight: '700',
            color: hasQty ? B.amber : `${colors.muted}40`,
            minWidth: 28,
            textAlign: 'center',
          }}>
            {qty}
          </Text>

          {/* Plus */}
          <Pressable
            onPress={onAdd}
            disabled={outOfStock || atMax}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: outOfStock || atMax ? `${colors.border}40` : hasQty ? B.amber : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Agregar uno"
          >
            <Text style={{
              fontSize: 16,
              color: outOfStock || atMax ? `${colors.muted}40` : hasQty ? B.ink : colors.ink,
              lineHeight: 20,
            }}>+</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── QuantityPickerModal ───────────────────────────────────────────────────────

interface QuantityPickerModalProps {
  producto: Producto | null;
  qty: number;
  onClose: () => void;
  onChange: (qty: number) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  insets: { bottom: number };
}

function QuantityPickerModal({ producto, qty, onClose, onChange, onRemove, colors, insets }: QuantityPickerModalProps) {
  const translateY = useSharedValue(200);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (producto) {
      translateY.set(withSpring(0, { damping: 18, stiffness: 160 }));
      backdropOpacity.set(withTiming(1, { duration: 200 }));
    } else {
      translateY.set(withTiming(200, { duration: 180, easing: Easing.bezier(0.32, 0, 0.67, 0) }));
      backdropOpacity.set(withTiming(0, { duration: 180 }));
    }
  }, [producto, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.get(),
  }));

  if (!producto) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
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
        {/* Handle */}
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

        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.ink,
            textAlign: 'center',
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {producto.nombre}
        </Text>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: colors.muted,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          {formatAmount(producto.precioCentavos)} c/u
        </Text>

        {/* Quantity stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
          <Pressable
            onPress={() => { if (qty > 0) onChange(qty - 1); }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Reducir cantidad"
          >
            <Text style={{ fontSize: 22, color: colors.ink, lineHeight: 26 }}>−</Text>
          </Pressable>

          <Text
            style={{
              fontFamily: MONO,
              fontSize: 32,
              fontWeight: '700',
              color: colors.ink,
              minWidth: 48,
              textAlign: 'center',
            }}
          >
            {qty}
          </Text>

          <Pressable
            onPress={() => onChange(qty + 1)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: B.amber,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Aumentar cantidad"
          >
            <Text style={{ fontSize: 22, color: B.ink, lineHeight: 26 }}>+</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <Pressable
          onPress={onClose}
          style={{
            height: 48,
            borderRadius: 4,
            backgroundColor: B.amber,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
          accessibilityRole="button"
          accessibilityLabel="Listo"
        >
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '600', letterSpacing: 1.5, color: B.ink }}>
            LISTO
          </Text>
        </Pressable>

        <Pressable
          onPress={onRemove}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Quitar del carrito"
        >
          <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: B.error }}>
            QUITAR DEL CARRITO
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── CajaScreen ───────────────────────────────────────────────────────────────

export default function CajaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { unlockAdmin, hasPin, setHasPin } = useAppMode();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState<MetodoPago>('efectivo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<{ visible: boolean; mode: 'setup' | 'verify' }>({
    visible: false,
    mode: 'verify',
  });
  const [pickerProduct, setPickerProduct] = useState<Producto | null>(null);

  const saleErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const numColumns = Math.max(2, Math.min(3, Math.floor((screenWidth - 24) / 120)));
  const cardWidth = (screenWidth - 24 - 8 * (numColumns - 1)) / numColumns;

  // Load data
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const prods = await getProductos(true);
        if (!active) return;
        setProductos(prods);
      } catch {
        if (active) setError('No se pudieron cargar los productos.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const total = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const p = productos.find((pr) => pr.id === +id);
    return sum + (p?.precioCentavos ?? 0) * qty;
  }, 0);

  const hasItems = total > 0;

  function handleCardPress(producto: Producto) {
    if (producto.maxVendible !== null && (quantities[producto.id] ?? 0) >= producto.maxVendible) return;
    setQuantities((prev) => ({ ...prev, [producto.id]: (prev[producto.id] ?? 0) + 1 }));
  }

  function handleCardSubtract(producto: Producto) {
    setQuantities((prev) => {
      const cur = prev[producto.id] ?? 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[producto.id];
        return next;
      }
      return { ...prev, [producto.id]: cur - 1 };
    });
  }

  function handleCardLongPress(producto: Producto) {
    setPickerProduct(producto);
  }

  function handlePickerChange(qty: number) {
    if (!pickerProduct) return;
    if (qty <= 0) {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[pickerProduct.id];
        return next;
      });
    } else {
      setQuantities((prev) => ({ ...prev, [pickerProduct.id]: qty }));
    }
  }

  function handlePickerRemove() {
    if (!pickerProduct) return;
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[pickerProduct.id];
      return next;
    });
    setPickerProduct(null);
  }

  async function handleRegistrar() {
    if (!hasItems || saving) return;
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const p = productos.find((pr) => pr.id === +id)!;
        return { productoId: p.id, cantidad: qty, precioUnitarioCentavos: p.precioCentavos };
      });

    setSaving(true);
    try {
      await createVenta({ items, metodoPago: payment });
      setQuantities({});
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      setSaleError('No se pudo registrar. Intenta de nuevo.');
      if (saleErrorTimerRef.current) clearTimeout(saleErrorTimerRef.current);
      saleErrorTimerRef.current = setTimeout(() => setSaleError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleLockPress() {
    setPinModal({ visible: true, mode: hasPin ? 'verify' : 'setup' });
  }

  function handlePinVerifySuccess() {
    setPinModal({ visible: false, mode: 'verify' });
    unlockAdmin();
    router.replace('/');
  }

  function handlePinSetupComplete() {
    setPinModal({ visible: false, mode: 'setup' });
    setHasPin(true);
    unlockAdmin();
    router.replace('/');
  }

  const PAYMENT_OPTIONS: { key: MetodoPago; label: string }[] = [
    { key: 'efectivo', label: 'EFECTIVO' },
    { key: 'tarjeta', label: 'TARJETA' },
    { key: 'transferencia', label: 'TRANSF.' },
    { key: 'otro', label: 'OTRO' },
  ];

  // ─── States ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: colors.muted }}>
          CARGANDO...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
        <Pressable
          onPress={() => { setError(null); setLoading(true); }}
          style={{ paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 4 }}
        >
          <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: colors.ink }}>
            REINTENTAR
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 8,
          paddingHorizontal: 16,
          alignItems: 'flex-end',
          backgroundColor: colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleLockPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 44,
            paddingHorizontal: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel="Modo administrador"
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 4 }}
        >
          <Text style={{ fontSize: 13, color: colors.muted }}>⚙</Text>
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: 1.5,
              color: colors.muted,
            }}
          >
            CONFIG
          </Text>
        </Pressable>
      </View>

      {/* Product grid */}
      {productos.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
            No tienes productos activos.{'\n'}Agrega productos desde el modo admin.
          </Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{
            padding: 12,
            gap: 8,
            paddingBottom: 16,
          }}
          columnWrapperStyle={numColumns > 1 ? { gap: 8 } : undefined}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <ProductCard
              producto={item}
              qty={quantities[item.id] ?? 0}
              cardWidth={cardWidth}
              onAdd={() => handleCardPress(item)}
              onSubtract={() => handleCardSubtract(item)}
              onLongPress={() => handleCardLongPress(item)}
              colors={colors}
            />
          )}
        />
      )}

      {/* Footer */}
      <View
        style={{
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        {/* Total */}
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: '700',
            color: hasItems ? B.amber : colors.ink,
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          {formatAmount(total)}
        </Text>

        {/* Payment pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          {PAYMENT_OPTIONS.map(({ key, label }) => {
            const isActive = payment === key;
            return (
              <Pressable
                key={key}
                onPress={() => setPayment(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isActive ? B.amber : colors.border,
                  backgroundColor: isActive ? `${B.amber}18` : 'transparent',
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: 1,
                    color: isActive ? B.amber : colors.muted,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sale error */}
        {saleError && (
          <Text
            style={{
              fontSize: 12,
              color: B.error,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {saleError}
          </Text>
        )}

        {/* CTA */}
        <Pressable
          onPress={handleRegistrar}
          disabled={!hasItems || saving}
          style={{
            height: 52,
            borderRadius: 4,
            backgroundColor: hasItems ? B.amber : 'transparent',
            borderWidth: hasItems ? 0 : 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={hasItems ? 'Registrar venta' : 'Registrar venta'}
          accessibilityHint={!hasItems ? 'Agrega productos para continuar' : undefined}
          accessibilityState={{ disabled: !hasItems || saving }}
        >
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 2,
              color: hasItems ? B.ink : colors.muted,
            }}
          >
            {saving ? 'REGISTRANDO...' : 'REGISTRAR VENTA'}
          </Text>
        </Pressable>
      </View>

      {/* Quantity picker overlay */}
      <QuantityPickerModal
        producto={pickerProduct}
        qty={pickerProduct ? (quantities[pickerProduct.id] ?? 0) : 0}
        onClose={() => setPickerProduct(null)}
        onChange={handlePickerChange}
        onRemove={handlePickerRemove}
        colors={colors}
        insets={insets}
      />

      {/* PIN modal */}
      <PinModal
        visible={pinModal.visible}
        mode={pinModal.mode}
        onSetupComplete={handlePinSetupComplete}
        onVerifySuccess={handlePinVerifySuccess}
        onDismiss={() => setPinModal({ ...pinModal, visible: false })}
      />
    </View>
  );
}
