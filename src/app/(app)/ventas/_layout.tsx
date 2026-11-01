import { Stack } from 'expo-router';

// The root layout initializes the shared database before any screen is mounted.
export default function VentasLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
