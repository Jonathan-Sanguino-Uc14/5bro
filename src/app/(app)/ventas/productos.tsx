import { Redirect } from 'expo-router';

export default function LegacyCatalogRoute() {
  return <Redirect href={ { pathname: '/(app)/productos', params: { tab: 'productos' } } as never } />;
}
