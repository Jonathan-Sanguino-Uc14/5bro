/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories resolve React locally. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import NuevaScreen from '../src/app/(app)/nueva';

const mockOperation = jest.fn(() => Promise.resolve());
const mockSale = jest.fn(() => Promise.resolve());
jest.mock('../src/lib/operations', () => ({
  createOperation: (...args: unknown[]) => mockOperation(...args as []),
  todayISO: () => '2026-10-27', formatDate: (date: string) => date,
}));
jest.mock('../src/db/queries', () => ({
  createVenta: (...args: unknown[]) => mockSale(...args as []),
  getProductos: () => Promise.resolve([{ id: 1, nombre: 'Pan', precioCentavos: 1250, costoUnitarioCentavos: 500, activo: true }]),
}));
jest.mock('../src/lib/theme', () => ({ useTheme: () => ({ colors: {
  bg: '#fff', ink: '#111', muted: '#666', border: '#ddd', borderStrong: '#999', amber: '#F5A623', error: '#E05A4E',
} }) }));
jest.mock('../src/components/operation-products', () => ({
  OperationProducts: (props: unknown) => require('react').createElement('ProductPicker', props),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => unknown) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'android', select: (options: { android: unknown }) => options.android },
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { Text: 'AnimatedText' },
  useSharedValue: (value: number) => require('react').useRef({ value, set(next: number) { this.value = next; } }).current,
  useAnimatedStyle: (fn: () => unknown) => fn(), withTiming: (value: number) => value,
  Easing: { out: (value: unknown) => value, cubic: 'cubic' },
}));

let screen: ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  // Expo lazily resolves native fetch; this screen does not use the network.
  Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), configurable: true, writable: true });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { screen = create(<NuevaScreen />); });
});
afterEach(async () => { await act(async () => screen.unmount()); });
const field = (label: string) => screen.root.findByProps({ accessibilityLabel: label });

test('free sale saves cents once and stays ready for another entry', async () => {
  await act(async () => {
    field('Concepto de la operación').props.onChangeText('Servicio');
    field('Monto de la operación').props.onChangeText('12.50');
  });
  await act(async () => { await field('Guardar operación').props.onPress(); });
  expect(mockOperation).toHaveBeenCalledWith(expect.objectContaining({ type: 'venta', amount: 1250, concept: 'Servicio' }));
  expect(mockSale).not.toHaveBeenCalled();
  expect(field('Monto de la operación').props.value).toBe('');
});

test('product sale uses inventory flow without creating a second manual operation', async () => {
  const mode = screen.root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'radio')
    .find(node => node.findAll(child => String(child.type) === 'Text' && child.props.children === 'CON PRODUCTOS').length);
  await act(async () => mode!.props.onPress());
  await act(async () => screen.root.find(node => String(node.type) === 'ProductPicker').props.onChange(1, 2));
  await act(async () => { await field('Guardar operación').props.onPress(); });
  expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({
    items: [{ productoId: 1, cantidad: 2, precioUnitarioCentavos: 1250 }], metodoPago: 'efectivo',
  }));
  expect(mockOperation).not.toHaveBeenCalled();
});

test('only sale and expense choices remain and expense saves correctly', async () => {
  expect(screen.root.findAllByProps({ accessibilityLabel: 'COMPRA' })).toHaveLength(0);
  await act(async () => field('GASTO').props.onPress());
  await act(async () => {
    field('Concepto de la operación').props.onChangeText('Materiales');
    field('Monto de la operación').props.onChangeText('100');
  });
  await act(async () => { await field('Guardar operación').props.onPress(); });
  expect(mockOperation).toHaveBeenCalledWith(expect.objectContaining({ type: 'gasto', amount: 10000 }));
  expect(mockSale).not.toHaveBeenCalled();
});
