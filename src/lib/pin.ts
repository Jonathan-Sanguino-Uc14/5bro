import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY = 'letica_admin_pin_hash';

async function hashPin(pin: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Web fallback: btoa encoding (expo-crypto may not support SHA-256 on web)
    return btoa(pin + '_letica_salt');
  }
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function getPin(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function savePin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(KEY, hashed);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, hashed);
}

export async function verifyPin(input: string): Promise<boolean> {
  const stored = await getPin();
  if (!stored) return false;
  const hashed = await hashPin(input);
  return hashed === stored;
}

export async function clearPin(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
