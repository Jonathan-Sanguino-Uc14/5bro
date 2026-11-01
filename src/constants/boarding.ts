import { Platform } from 'react-native';

export const B = {
  ivory: '#F5F3EF',
  ink: '#1A1A1A',
  amber: '#F5A623',
  muted: '#8A8680',
  border: 'rgba(26,26,26,0.12)',
  borderStrong: 'rgba(26,26,26,0.28)',
  perfBorder: 'rgba(138,134,128,0.35)',
  inkFade: 'rgba(26,26,26,0.2)',
  error: '#C0392B',
  screenBg: '#EAE7E1',
} as const;

export const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});
