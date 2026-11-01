import { createContext, useContext, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AppUser {
  id: string;
  businessName: string;
  userName: string | null;
  email: string;
}

interface AuthContextType {
  user: AppUser | null;
  authenticated: boolean;
  loading: boolean;
  canUseBiometrics: boolean;
  authenticate: () => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, businessName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (fields: { businessName?: string; userName?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authenticated: false,
  loading: true,
  canUseBiometrics: false,
  authenticate: async () => ({ success: false }),
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  updateUser: async () => {},
});

async function fetchProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_name, user_name, email')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    businessName: data.business_name as string,
    userName: (data.user_name as string | null) ?? null,
    email: data.email as string,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const [{ data: { session: s } }, hasHardware, isEnrolled] = await Promise.all([
          supabase.auth.getSession(),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        if (!active) return;

        setCanUseBiometrics(hasHardware && isEnrolled);
        setSession(s);

        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          if (active) setUser(profile);
        }
      } catch {
        // leave defaults
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!active) return;
        setSession(s);
        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          setUser(profile);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function authenticate(): Promise<{ success: boolean; error?: string }> {
    if (!canUseBiometrics) {
      setAuthenticated(true);
      return { success: true };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma tu identidad para continuar',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar código del dispositivo',
      });

      if (result.success) {
        setAuthenticated(true);
        return { success: true };
      }

      const errorMap: Record<string, string> = {
        UserCancel: 'Autenticación cancelada.',
        UserFallback: 'Autenticación cancelada.',
        SystemCancel: 'Cancelado por el sistema.',
        PasscodeNotSet: 'No hay PIN ni biometría configurada en el dispositivo.',
        BiometryNotAvailable: 'Biometría no disponible.',
        BiometryNotEnrolled: 'No hay biometría registrada.',
        BiometryLockout: 'Biometría bloqueada. Usa el código del dispositivo.',
      };

      const msg =
        'error' in result && result.error
          ? (errorMap[result.error] ?? 'No se pudo verificar tu identidad.')
          : 'No se pudo verificar tu identidad.';

      return { success: false, error: msg };
    } catch {
      return { success: false, error: 'Error al iniciar la autenticación.' };
    }
  }

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setAuthenticated(true);
    return {};
  }

  async function signUp(
    email: string,
    password: string,
    businessName: string,
  ): Promise<{ error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName.trim() } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'No se pudo crear la cuenta. Intentá de nuevo.' };

    // If email confirmation is disabled, session is active immediately.
    // If enabled, profile is created by the DB trigger using raw_user_meta_data.
    if (data.session) {
      // Session active: upsert profile (trigger may have already created it)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        business_name: businessName.trim(),
        email: email.trim().toLowerCase(),
      }, { onConflict: 'id' });

      const profile = await fetchProfile(data.user.id);
      setUser(profile);
      setAuthenticated(true);
    }

    return {};
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setUser(null);
    setSession(null);
  }

  async function updateUser(
    fields: { businessName?: string; userName?: string },
  ): Promise<void> {
    if (!session?.user) return;

    const updates: Record<string, string | null> = {};
    if (fields.businessName !== undefined) updates.business_name = fields.businessName.trim();
    if (fields.userName !== undefined) updates.user_name = fields.userName.trim() || null;

    if (Object.keys(updates).length === 0) return;

    await supabase.from('profiles').update(updates).eq('id', session.user.id);

    setUser((prev) =>
      prev
        ? {
            ...prev,
            businessName: fields.businessName ?? prev.businessName,
            userName: fields.userName !== undefined
              ? (fields.userName.trim() || null)
              : prev.userName,
          }
        : prev,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated,
        loading,
        canUseBiometrics,
        authenticate,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
