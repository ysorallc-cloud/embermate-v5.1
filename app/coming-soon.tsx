// Placeholder redirect - "Coming soon" features route back to hub
import { Redirect } from 'expo-router';
export default function ComingSoonRedirect() {
  return <Redirect href="/(tabs)/now" />;
}
