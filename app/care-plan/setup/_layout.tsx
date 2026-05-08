// ============================================================================
// CARE PLAN SETUP WIZARD LAYOUT — Phase 5.13.
//
// Three-step wizard mounted under /care-plan/setup. Each step renders its
// own header (progress dots + title), so we hide the navigation header
// at the layout level.
// ============================================================================

import { Stack } from 'expo-router';

export default function CarePlanSetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="who" />
      <Stack.Screen name="template" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
