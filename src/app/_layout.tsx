import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { AppModeProvider } from '@/lib/mode-context';

SplashScreen.preventAutoHideAsync();

function ThemedNavigator() {
  const { isDark } = useTheme();
  const pathname = usePathname();
  const darkHeader = isDark || pathname === '/' || pathname === '/login' || pathname === '/register';
  return (
    <>
      <StatusBar style={darkHeader ? 'light' : 'dark'} animated />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 280 }} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppModeProvider>
          <ThemedNavigator />
        </AppModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
