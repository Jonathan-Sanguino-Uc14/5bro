import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ProductsPanel } from '@/components/catalog/products-panel';
import { InventoryPanel } from '@/components/catalog/inventory-panel';
import { MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

const SECTIONS = [
  { key: 'productos', label: 'PRODUCTOS' },
  { key: 'inventario', label: 'INVENTARIO' },
] as const;

export default function ProductManagement() {
  const { colors } = useTheme();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const selected = tab === 'inventario' ? 'inventario' : 'productos';

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header, { paddingTop: 20 }]}>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>TU NEGOCIO</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>PRODUCTOS</Text>
      <Text style={[styles.description, { color: colors.muted }]}>Organiza lo que vendes y lo que necesitas para prepararlo.</Text>
    </View>
    <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.border }]}>
      {SECTIONS.map(section => <Pressable key={section.key} onPress={() => router.setParams({ tab: section.key })}
        accessibilityRole="tab" accessibilityLabel={section.label} accessibilityState={{ selected: selected === section.key }}
        style={[styles.tab, { borderBottomColor: selected === section.key ? colors.amber : 'transparent' }]}>
        <Text style={[styles.tabLabel, { color: selected === section.key ? colors.amber : colors.muted }]}>{section.label}</Text>
      </Pressable>)}
    </View>
    {/* Preserve drafts while switching sections; only the active panel refreshes. */}
    <View style={{ flex: 1, display: selected === 'productos' ? 'flex' : 'none' }}
      accessibilityElementsHidden={selected !== 'productos'} importantForAccessibility={selected === 'productos' ? 'auto' : 'no-hide-descendants'}>
      <ProductsPanel active={selected === 'productos'} />
    </View>
    <View style={{ flex: 1, display: selected === 'inventario' ? 'flex' : 'none' }}
      accessibilityElementsHidden={selected !== 'inventario'} importantForAccessibility={selected === 'inventario' ? 'auto' : 'no-hide-descendants'}>
      <InventoryPanel active={selected === 'inventario'} />
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  eyebrow: { fontFamily: MONO, fontSize: 9, letterSpacing: 2 },
  title: { fontFamily: MONO, fontSize: 24, fontWeight: '700', letterSpacing: 1 },
  description: { fontSize: 13, lineHeight: 20 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tab: { flex: 1, minHeight: 50, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2 },
  tabLabel: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.5 },
});
