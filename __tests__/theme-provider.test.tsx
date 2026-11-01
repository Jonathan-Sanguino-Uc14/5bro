/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest factories resolve their dependencies locally. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ThemeProvider, useTheme, useThemeTransition } from '../src/lib/theme';

const mockCapture = jest.fn();
const mockRelease = jest.fn();
const mockPersist = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
const mockAnimations: { callback?: (done: boolean) => void }[] = [];
const mockListeners: Record<string, (value: any) => unknown> = {};
let mockReduced = false;
let mockNativeSvg = true;

jest.mock('../src/lib/db', () => ({
  getSetting: () => Promise.resolve('0'),
  setSetting: (...args: unknown[]) => mockPersist(...args),
}));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: () => Promise.resolve() }));
jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCapture(...args),
  releaseCapture: (...args: unknown[]) => mockRelease(...args),
}));
jest.mock('react-native', () => {
  const React = require('react');
  const View = React.forwardRef(function MockView(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({
      measureInWindow: (fn: (...args: number[]) => void) => fn(0, 24, 390, 820),
    }));
    return React.createElement('View', props, props.children);
  });
  return {
    View, Platform: { OS: 'android' },
    UIManager: { getViewManagerConfig: () => mockNativeSvg ? {} : null },
    StyleSheet: { create: (s: unknown) => s, absoluteFill: {} },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(mockReduced),
      addEventListener: (name: string, fn: (v: any) => void) => {
        mockListeners[name] = fn; return { remove: jest.fn() };
      },
    },
    AppState: { currentState: 'active', addEventListener: (_: string, fn: (v: any) => void) => {
      mockListeners.app = fn; return { remove: jest.fn() };
    } },
    BackHandler: { addEventListener: (_: string, fn: (v: any) => void) => {
      mockListeners.back = fn; return { remove: jest.fn() };
    } },
  };
});
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, Image: 'SnapshotImage', createAnimatedComponent: (v: unknown) => v },
    Easing: { bezier: () => 'ease' }, ReduceMotion: { Never: 'never' },
    cancelAnimation: jest.fn(), runOnJS: (fn: unknown) => fn,
    useAnimatedProps: (fn: () => unknown) => fn(),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (initial: number) => React.useRef({
      value: initial,
      set(value: any) {
        if (typeof value === 'object') { this.value = value.next; mockAnimations.push(value); }
        else this.value = value;
      },
    }).current,
    withTiming: (next: number, _: unknown, callback: unknown) => ({ next, callback }),
  };
});
jest.mock('react-native-svg', () => ({
  __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', Image: 'SvgImage', Mask: 'Mask', Rect: 'Rect',
}));

let theme: ReturnType<typeof useTheme> & Pick<ReturnType<typeof useThemeTransition>, 'isTransitioning'>;
function Consumer() {
  const current = useTheme();
  const transition = useThemeTransition();
  React.useEffect(() => { theme = { ...current, isTransitioning: transition.isTransitioning }; }, [current, transition]);
  return null;
}
let tree: ReactTestRenderer;
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
async function mount() {
  await act(async () => { tree = create(<ThemeProvider><Consumer /></ThemeProvider>); await settle(); });
  act(() => tree.root.findAllByType('View' as any)[0].props.onLayout({
    nativeEvent: { layout: { width: 390, height: 820 } },
  }));
}
async function trigger() {
  await act(async () => { theme.triggerTransition({ x: 340, y: 640 }); await settle(); });
}
async function load(kind: string) {
  await act(async () => { tree.root.findByType(kind as any).props.onLoad(); await settle(); });
  await act(async () => { jest.advanceTimersByTime(40); await settle(); });
  await act(async () => { jest.advanceTimersByTime(40); await settle(); });
}
beforeEach(() => {
  jest.useFakeTimers();
  // Avoid Expo's lazy native fetch getter during Jest environment teardown.
  Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), configurable: true, writable: true });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(0), 16) as any;
  mockCapture.mockReset().mockResolvedValue('file:///theme-old.png');
  mockRelease.mockClear(); mockPersist.mockClear(); mockAnimations.length = 0;
  mockReduced = false; mockNativeSvg = true;
  jest.spyOn(console, 'error').mockImplementation(() => {}); // React renderer deprecation.
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks();
});

test('locks repeated taps, waits for decoded image, completes both directions, releases capture', async () => {
  await mount(); await trigger();
  expect(theme.isDark).toBe(false);
  expect(theme.isTransitioning).toBe(true);
  await trigger(); expect(mockCapture).toHaveBeenCalledTimes(1);
  await load('SvgImage'); expect(theme.isDark).toBe(true);
  act(() => mockAnimations.at(-1)?.callback?.(true));
  expect(theme.isTransitioning).toBe(false);
  expect(mockPersist).toHaveBeenLastCalledWith('dark_mode', '1');
  act(() => jest.advanceTimersByTime(20)); expect(mockRelease).toHaveBeenCalledTimes(1);
  await trigger(); await load('SvgImage');
  act(() => mockAnimations.at(-1)?.callback?.(true));
  expect(theme.isDark).toBe(false);
  expect(mockPersist).toHaveBeenLastCalledWith('dark_mode', '0');
});
test('background interruption commits target and discards a late capture', async () => {
  let resolveCapture!: (uri: string) => void;
  mockCapture.mockImplementation(() => new Promise<string>((resolve) => { resolveCapture = resolve; }));
  await mount(); await trigger();
  act(() => { mockListeners.app('background'); });
  expect(theme.isDark).toBe(true); expect(theme.isTransitioning).toBe(false);
  await act(async () => { resolveCapture('file:///late.png'); await settle(); });
  expect(mockRelease).toHaveBeenCalledWith('file:///late.png');
  expect(tree.root.findAllByType('SvgImage' as any)).toHaveLength(0);
});
test.each(['reduce motion', 'missing SVG'])('%s uses snapshot crossfade without a circle', async (mode) => {
  mockReduced = mode === 'reduce motion'; mockNativeSvg = mode !== 'missing SVG';
  await mount(); await trigger();
  expect(tree.root.findAllByType('Circle' as any)).toHaveLength(0);
  await load('SnapshotImage');
  act(() => mockAnimations.at(-1)?.callback?.(true));
  expect(theme.isDark).toBe(true); expect(theme.isTransitioning).toBe(false);
});
test('capture failure uses the fade fallback and releases the interaction lock', async () => {
  mockCapture.mockRejectedValue(new Error('Capture unsupported'));
  await mount(); await trigger();
  await act(async () => { mockAnimations.at(-1)?.callback?.(true); await settle(); });
  await act(async () => { jest.advanceTimersByTime(40); await settle(); });
  act(() => mockAnimations.at(-1)?.callback?.(true));
  expect(theme.isDark).toBe(true); expect(theme.isTransitioning).toBe(false);
});
