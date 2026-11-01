import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';

export default function Index() {
  const { user, authenticated, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={'/(auth)/register' as any} />;
  }

  if (!authenticated) {
    return <Redirect href={'/(auth)/login' as any} />;
  }

  return <Redirect href={'/(app)/' as any} />;
}
