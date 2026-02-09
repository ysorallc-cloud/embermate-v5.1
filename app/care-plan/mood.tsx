// ============================================================================
// MOOD BUCKET CONFIGURATION (DEPRECATED)
// Mood tracking is now part of Wellness checks (morning + evening).
// This screen redirects to the wellness check.
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function MoodBucketScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/log-morning-wellness' as any);
  }, [router]);

  return null;
}
