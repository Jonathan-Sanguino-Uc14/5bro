/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories resolve React locally. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, BackHandler } from 'react-native';
import Settings from '../src/app/(app)/configuraciones';
const mockSignOut = jest.fn();
const mockReplace = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/lib/auth-context', () => ({ useAuth: () => ({ user: { businessName: 'Tienda', userName: 'Ana' }, updateUser: mockUpdate, signOut: mockSignOut }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, navigate: jest.fn() }), useFocusEffect: (callback: () => unknown) => require('react').useEffect(callback, [callback]) }));
jest.mock('../src/lib/theme', () => {
  const colors = { bg: '#fff', ink: '#111', muted: '#666', border: '#ddd', amber: '#F5A623', error: '#E05A4E' };
  return { LIGHT: colors, DARK: colors, useTheme: () => ({ colors, isDark: false, triggerTransition: jest.fn() }), useThemeTransition: () => ({ isTransitioning: false, sourceDark: false, targetDark: false, progress: { value: 0 } }) };
});
jest.mock('react-native-reanimated', () => ({ __esModule: true, default: { View: 'AnimatedView' }, useAnimatedStyle: (fn: () => unknown) => fn(), interpolate: () => 0, interpolateColor: () => '#fff' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'ActivityIndicator',
  Keyboard: { dismiss: jest.fn() }, BackHandler: { exitApp: jest.fn() },
  Platform: { OS: 'android', select: (options: { android: unknown }) => options.android },
  StyleSheet: { create: (styles: unknown) => styles },
}));

let screen: ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), configurable: true, writable: true });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { screen = create(<Settings />); });
});
afterEach(async () => { await act(async () => screen.unmount()); });
function button(label: string) {
  return screen.root.findAll(node => String(node.type) === 'Pressable').find(node => node.findAll(child => String(child.type) === 'Text' && child.props.children === label).length)!;
}
test.each(['android', 'ios', 'web'])('exit on %s requires confirmation and keeps platform behavior', async os => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  await act(async () => button('Salir de la app').props.onPress());
  expect(mockSignOut).not.toHaveBeenCalled();
  await act(async () => button('Cancelar').props.onPress());
  expect(mockSignOut).not.toHaveBeenCalled();
  await act(async () => button('Salir de la app').props.onPress());
  await act(async () => button('Confirmar salida').props.onPress());
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  expect(BackHandler.exitApp).toHaveBeenCalledTimes(os === 'android' ? 1 : 0);
});
