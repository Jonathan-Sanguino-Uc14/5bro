import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Platform, StyleSheet, UIManager, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Image as SvgImage, Mask, Rect } from 'react-native-svg';
import * as SystemUI from 'expo-system-ui';
import { getSetting, setSetting } from './db';
import { getRevealGeometry } from './theme-transition';

export interface ThemeColors {
  bg: string; header: string; ink: string; muted: string; border: string;
  borderStrong: string; amber: string; error: string; tabBar: string; screenBg: string;
}
const LIGHT: ThemeColors = {
  bg: '#F5F3EF', header: '#141414', ink: '#1A1A1A', muted: 'rgba(138,134,128,0.75)',
  border: 'rgba(26,26,26,0.12)', borderStrong: 'rgba(26,26,26,0.28)',
  amber: '#F5A623', error: '#C0392B', tabBar: '#141414', screenBg: '#EAE7E1',
};
const DARK: ThemeColors = {
  bg: '#141414', header: '#0A0A0A', ink: '#F5F3EF', muted: 'rgba(245,243,239,0.40)',
  border: 'rgba(245,243,239,0.10)', borderStrong: 'rgba(245,243,239,0.22)',
  amber: '#F5A623', error: '#E05A4E', tabBar: '#0A0A0A', screenBg: '#1A1A1A',
};
type Point = { x: number; y: number; startedAt?: number };
interface ThemeContextType {
  isDark: boolean; colors: ThemeColors;
  toggleDark: () => void;
  /** Origin in window coordinates (measureInWindow), in logical pixels. */
  triggerTransition: (origin: Point) => void;
}
interface ThemeTransitionContextType {
  isTransitioning: boolean; sourceDark: boolean; targetDark: boolean; progress: SharedValue<number>;
}
type Snapshot = ReturnType<typeof getRevealGeometry> & { uri: string; id: number; reveal: boolean; capturedAt: number; startedAt: number };
const ThemeContext = createContext<ThemeContextType | null>(null);
const ThemeTransitionContext = createContext<ThemeTransitionContextType | null>(null);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const now = () => globalThis.performance?.now?.() ?? Date.now();
const TRACK_PERF = __DEV__ || process.env.EXPO_PUBLIC_THEME_PERF === '1';
const trace = (id: number, name: string, startedAt: number) => {
  if (TRACK_PERF) console.debug(`[theme-transition:${id}] ${name}: ${(now() - startedAt).toFixed(1)}ms`);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionSourceDark, setTransitionSourceDark] = useState(false);
  const [transitionTargetDark, setTransitionTargetDark] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const contentRef = useRef<View>(null);
  const captureModule = useRef<typeof import('react-native-view-shot') | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const dark = useRef(false), target = useRef(false), busy = useRef(false);
  const mounted = useRef(true), reduced = useRef(true), selected = useRef(false);
  const generation = useRef(0), loaded = useRef(false);
  const uri = useRef<string | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(0), contentOpacity = useSharedValue(1);
  const commit = useCallback((next: boolean) => { dark.current = next; setIsDark(next); }, []);
  const finish = useCallback(() => {
    generation.current += 1;
    cancelAnimation(progress); cancelAnimation(contentOpacity);
    contentOpacity.set(1);
    if (watchdog.current) clearTimeout(watchdog.current);
    if (busy.current && mounted.current) {
      commit(target.current); setSnapshot(null); setIsTransitioning(false);
      void setSetting('dark_mode', target.current ? '1' : '0').catch(() => {});
    }
    busy.current = false;
    const previousUri = uri.current;
    uri.current = null;
    // Wait until the native overlay unmounts before removing its image.
    if (previousUri) requestAnimationFrame(() => captureModule.current?.releaseCapture(previousUri));
  }, [commit, contentOpacity, progress]);
  const fade = useCallback((id: number) => {
    if (!mounted.current || generation.current !== id) return;
    const duration = reduced.current ? 80 : 240;
    // Unsupported captures/web: a restrained fade, keeping content visible.
    const midpoint = () => {
      if (generation.current !== id || !mounted.current) return;
      commit(target.current);
      contentOpacity.set(withTiming(1, { duration, easing: EASE, reduceMotion: ReduceMotion.Never }));
      progress.set(withTiming(1, { duration, easing: EASE, reduceMotion: ReduceMotion.Never },
        (done) => { if (done) runOnJS(finish)(); }));
    };
    contentOpacity.set(withTiming(reduced.current ? 0.9 : 0.65,
      { duration, easing: EASE, reduceMotion: ReduceMotion.Never },
      (done) => { if (done) runOnJS(midpoint)(); }));
  }, [commit, contentOpacity, finish, progress]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void getSetting('dark_mode').then((value) => {
      if (active && !selected.current) commit(value === '1');
    }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reduced.current = value;
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
      if (value && busy.current) finish();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && busy.current) finish();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy.current) return false;
      finish(); return true;
    });
    return () => {
      active = false; mounted.current = false; finish();
      motion.remove(); app.remove(); back.remove();
    };
  }, [commit, finish]);
  const triggerTransition = useCallback((origin: Point) => {
    if (busy.current || AppState.currentState === 'background') return;
    busy.current = true; selected.current = true; target.current = !dark.current;
    setTransitionSourceDark(dark.current);
    setTransitionTargetDark(target.current);
    const id = ++generation.current;
    const startedAt = origin.startedAt ?? now();
    setIsTransitioning(true); loaded.current = false; progress.set(0);
    watchdog.current = setTimeout(finish, 2500);
    if (Platform.OS === 'web' || !contentRef.current) { fade(id); return; }
    const node = contentRef.current;
    const measureAt = now();
    // Measure and start the native snapshot in the same JS turn. They used to be sequential.
    const measured = new Promise<{ x: number; y: number }>((resolve) =>
      node.measureInWindow((x, y) => { trace(id, 'measureInWindow(root)', measureAt); resolve({ x, y }); }));
    const captureAt = now();
    const captured = Promise.resolve().then(() => {
        // Lazy load so an older development build can still use the fade fallback.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module: typeof import('react-native-view-shot') = require('react-native-view-shot');
        captureModule.current = module;
        return module.captureRef(node, { format: 'jpg', quality: 0.5, result: 'tmpfile' });
      }).then((file) => { trace(id, 'captureRef(JPEG q=.5)', captureAt); return file; });
    void Promise.all([measured, captured]).then(([position, file]) => {
        if (generation.current !== id || !mounted.current) { captureModule.current?.releaseCapture(file); return; }
        const geometry = getRevealGeometry(size.current, { x: origin.x - position.x, y: origin.y - position.y });
        if (!geometry.width || !geometry.height) { captureModule.current?.releaseCapture(file); fade(id); return; }
        let reveal = false;
        try {
          reveal = !reduced.current && !!UIManager.getViewManagerConfig(
            Platform.OS === 'android' ? 'RNSVGSvgViewAndroid' : 'RNSVGSvgView',
          );
        } catch { /* A plain crossfade also works without native SVG support. */ }
        const capturedAt = now();
        uri.current = file; setSnapshot({ ...geometry, uri: file, id, reveal, capturedAt, startedAt });
      }).catch(() => { fade(id); });
  }, [fade, finish, progress]);
  const startReveal = useCallback(() => {
    if (!snapshot || loaded.current || generation.current !== snapshot.id) return;
    loaded.current = true;
    trace(snapshot.id, 'image decode + overlay mount', snapshot.capturedAt);
    const paintAt = now();
    // One frame lets the decoded snapshot paint. A second frame here added 16ms without benefit.
    requestAnimationFrame(() => {
      if (!mounted.current || generation.current !== snapshot.id) return;
      trace(snapshot.id, 'paint-ready RAF', paintAt);
      const duration = reduced.current ? 160 : 600;
      trace(snapshot.id, 'theme commit after touch', snapshot.startedAt);
      commit(target.current);
      if (!snapshot.reveal) {
        progress.set(withTiming(1, {
          duration, easing: EASE, reduceMotion: ReduceMotion.Never,
        }, (done) => { if (done) runOnJS(finish)(); }));
        return;
      }
      progress.set(withTiming(1, { duration, easing: EASE, reduceMotion: ReduceMotion.Never },
        (done) => { if (done) runOnJS(finish)(); }));
    });
  }, [commit, finish, progress, snapshot]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (busy.current && (width !== size.current.width || height !== size.current.height)) finish();
    size.current = { width, height };
  }, [finish]);
  const toggleDark = useCallback(() => {
    const startedAt = now();
    const measureAt = now();
    contentRef.current?.measureInWindow((x, y, width, height) => {
      trace(generation.current + 1, 'measureInWindow(toggle fallback)', measureAt);
      triggerTransition({ x: x + width / 2, y: y + height / 2, startedAt });
    });
  }, [triggerTransition]);
  const circleProps = useAnimatedProps(() => ({ r: snapshot ? snapshot.radius * progress.value : 0, opacity: progress.value }));
  const snapshotStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const colors = isDark ? DARK : LIGHT;
  useEffect(() => {
    if (!isTransitioning) void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg, isTransitioning]);
  const value = useMemo(() => ({ isDark, colors, toggleDark, triggerTransition }),
    [colors, isDark, toggleDark, triggerTransition]);
  const transitionValue = useMemo(() => ({ isTransitioning, sourceDark: transitionSourceDark,
    targetDark: transitionTargetDark, progress }),
    [isTransitioning, transitionSourceDark, transitionTargetDark, progress]);
  return (
    <ThemeContext.Provider value={value}>
      <ThemeTransitionContext.Provider value={transitionValue}>
        <View style={[styles.root, { backgroundColor: colors.bg }]} onLayout={onLayout}>
          <Animated.View ref={contentRef} collapsable={false} style={[styles.root, contentStyle]}>
            {children}
          </Animated.View>
          {isTransitioning && (
            <View style={styles.overlay} pointerEvents="auto" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {snapshot && !snapshot.reveal && (
                <Animated.Image source={{ uri: snapshot.uri }} style={[StyleSheet.absoluteFill, snapshotStyle]}
                  resizeMode="stretch" fadeDuration={0} onLoad={startReveal} onError={finish} />
              )}
              {snapshot?.reveal && (
                <Svg width={snapshot.width} height={snapshot.height} viewBox={`0 0 ${snapshot.width} ${snapshot.height}`}>
                  <Defs>
                    <Mask id="theme-reveal" x={0} y={0} width={snapshot.width} height={snapshot.height}
                      maskUnits="userSpaceOnUse" maskType="luminance">
                      <Rect width={snapshot.width} height={snapshot.height} fill="white" />
                      <AnimatedCircle cx={snapshot.x} cy={snapshot.y} fill="black" animatedProps={circleProps} />
                    </Mask>
                  </Defs>
                  <SvgImage href={{ uri: snapshot.uri }} x={0} y={0} width={snapshot.width} height={snapshot.height}
                    preserveAspectRatio="none" mask="url(#theme-reveal)" onLoad={startReveal} />
                </Svg>
              )}
            </View>
          )}
        </View>
      </ThemeTransitionContext.Provider>
    </ThemeContext.Provider>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999 } });
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
export function useThemeTransition() {
  const context = useContext(ThemeTransitionContext);
  if (!context) throw new Error('useThemeTransition must be used within ThemeProvider');
  return context;
}
export { LIGHT, DARK };
