import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Producto } from '@/db/types';
import { formatCents } from '@/lib/money';
import { MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

export function OperationProducts({ products, quantities, onChange, onManage }: {
  products: Producto[];
  quantities: Record<number, number>;
  onChange: (id: number, quantity: number) => void;
  onManage: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = products.filter(product => (quantities[product.id] ?? 0) > 0);
  const count = selected.reduce((sum, product) => sum + quantities[product.id], 0);
  const row = (product: Producto) => {
    const quantity = quantities[product.id] ?? 0;
    return <View key={product.id} style={[styles.row, { borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.ink, fontSize: 15 }}>{product.nombre}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>{formatCents(product.precioCentavos)} / unidad</Text>
      </View>
      <View style={styles.controls}>
        <Pressable disabled={quantity === 0} onPress={() => onChange(product.id, Math.max(0, quantity - 1))}
          style={styles.step} accessibilityRole="button" accessibilityLabel={`Quitar ${product.nombre}`}>
          <Text style={{ color: quantity ? colors.ink : colors.muted, fontSize: 22 }}>−</Text>
        </Pressable>
        <Text style={[styles.meta, { color: colors.ink, minWidth: 24, textAlign: 'center' }]}>{quantity}</Text>
        <Pressable onPress={() => onChange(product.id, quantity + 1)} style={styles.step}
          accessibilityRole="button" accessibilityLabel={`Agregar ${product.nombre}`}>
          <Text style={{ color: colors.amber, fontSize: 22 }}>+</Text>
        </Pressable>
      </View>
    </View>;
  };
  return <View style={{ gap: 10 }}>
    <Text style={[styles.meta, { color: colors.muted }]}>PRODUCTOS</Text>
    {selected.map(row)}
    <Pressable onPress={() => setOpen(true)} style={[styles.action, { borderColor: colors.borderStrong }]}
      accessibilityRole="button">
      <Text style={[styles.meta, { color: colors.amber }]}>+ {selected.length ? 'AGREGAR PRODUCTOS' : 'ELEGIR PRODUCTOS'}</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={[styles.row, { paddingHorizontal: 20, borderColor: colors.border }]}>
          <Text style={[styles.meta, { color: colors.ink }]}>ELEGIR PRODUCTOS</Text>
          <Pressable onPress={() => setOpen(false)} style={styles.step} accessibilityRole="button" accessibilityLabel="Cerrar productos">
            <Text style={{ color: colors.ink, fontSize: 22 }}>×</Text>
          </Pressable>
        </View>
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar producto"
          accessibilityLabel="Buscar producto" placeholderTextColor={colors.muted}
          style={{ padding: 20, color: colors.ink, fontSize: 16 }} />
        <FlatList data={products.filter(product => product.nombre.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))}
          extraData={quantities} keyExtractor={product => String(product.id)} renderItem={({ item }) => row(item)}
          keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={<Text style={{ color: colors.muted, paddingVertical: 24 }}>
            {products.length ? 'No encontramos ese producto.' : 'Agrega tu primer producto para empezar.'}
          </Text>} />
        <Pressable onPress={() => { setOpen(false); onManage(); }} style={styles.action} accessibilityRole="button">
          <Text style={[styles.meta, { color: colors.muted }]}>GESTIONAR PRODUCTOS</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(false)} style={[styles.action, { margin: 20, backgroundColor: colors.amber }]}
          accessibilityRole="button">
          <Text style={[styles.meta, { color: '#1A1A1A' }]}>LISTO · {count} UNIDADES</Text>
        </Pressable>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  meta: { fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  step: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  action: { minHeight: 48, padding: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
});
