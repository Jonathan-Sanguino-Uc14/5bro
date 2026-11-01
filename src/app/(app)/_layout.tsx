import { AppToolbar } from '@/components/app-toolbar';
import { useAuth } from '@/lib/auth-context';
import { useAppMode } from '@/lib/mode-context';

import { Tabs, Redirect, usePathname } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B, MONO } from '@/constants/boarding';
import { useTheme } from '@/lib/theme';

const TAB_ACTIVE = B.amber;

type TabIconProps = {
  symbol: string;
  focused: boolean;
  inactiveColor: string;
  isCenter?: boolean;
};

function TabIcon({
  symbol,
  focused,
  inactiveColor,
  isCenter = false,
}: TabIconProps) {
  if (isCenter) {
    return (
      <View style={styles.centerButton}>
        <Text style={styles.centerSymbol}>+</Text>
      </View>
    );
  }

  return (
    <Text
      style={[
        styles.tabSymbol,
        { color: focused ? TAB_ACTIVE : inactiveColor },
      ]}
    >
      {symbol}
    </Text>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { mode } = useAppMode();
  const pathname = usePathname();

  const inactiveColor = colors.muted;
  const { authenticated, loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/register" />;
  if (!authenticated) return <Redirect href="/(auth)/login" />;

  const isCashier = mode === 'cashier';
  const isCaja = pathname.includes('caja');

  return (
    <>
      {isCashier && !isCaja && <Redirect href={'/(app)/caja' as any} />}
      <Tabs
        screenOptions={{
          headerShown: !isCashier,
          header: () => <AppToolbar />,

          tabBarStyle: isCashier
            ? { display: 'none' }
            : [
                styles.tabBar,
                {
                  backgroundColor: colors.tabBar,
                  height: 64 + insets.bottom,
                  paddingBottom: Math.max(insets.bottom, 6),
                },
              ],

          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: TAB_ACTIVE,
          tabBarInactiveTintColor: inactiveColor,
          tabBarHideOnKeyboard: true,
          tabBarItemStyle: {
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 0,
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'INICIO',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="◈"
              focused={focused}
              inactiveColor={inactiveColor}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="asistente"
        options={{
          tabBarLabel: 'ASISTENTE',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="✦"
              focused={focused}
              inactiveColor={inactiveColor}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="nueva"
        options={{
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Registrar venta o gasto',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="+"
              focused={focused}
              isCenter
              inactiveColor={inactiveColor}
            />
          ),
        }}
      />

      <Tabs.Screen name="productos" options={{
        tabBarLabel: 'PRODUCTOS',
        tabBarIcon: ({ focused }) => <TabIcon symbol="▦" focused={focused} inactiveColor={inactiveColor} />,
      }} />
      <Tabs.Screen name="dashboard" options={{
        tabBarLabel: 'MÉTRICAS',
        tabBarIcon: ({ focused }) => <TabIcon symbol="▥" focused={focused} inactiveColor={inactiveColor} />,
      }} />
      <Tabs.Screen name="configuraciones" options={{ href: null }} />
      <Tabs.Screen name="historial" options={{ href: null }} />
      <Tabs.Screen name="ventas" options={{ href: null }} />
      <Tabs.Screen name="caja" options={{ href: null }} />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    elevation: 0,
  },

  tabSymbol: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },

  tabLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },

  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: B.amber,
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: -18,

    shadowColor: B.amber,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  centerSymbol: {
    fontSize: 30,
    color: B.ink,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
  },
});
