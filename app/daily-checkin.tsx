// ============================================================================
// DAILY CHECK-IN — REDIRECT
// Consolidated into log-evening-wellness.tsx (Feb 2026)
// This screen now redirects to the unified evening wellness check.
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function DailyCheckinScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/log-evening-wellness');
  }, []);

  return null;
}
