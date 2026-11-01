import { Redirect } from 'expo-router';

export default function MetricsRedirect() {
  return <Redirect href={'/(app)/dashboard' as never} />;
}
