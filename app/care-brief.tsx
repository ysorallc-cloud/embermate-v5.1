/**
 * @deprecated This screen has been replaced by the unified Care Report screen.
 * Redirects to /care-report?scope=handoff
 * See app/care-report.tsx for the replacement implementation.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CareBriefScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/care-report?scope=handoff' as any);
  }, []);

  return null;
}
