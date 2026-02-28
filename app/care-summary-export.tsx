/**
 * @deprecated This screen has been replaced by the unified Care Report screen.
 * Redirects to /care-report?scope=full
 * See app/care-report.tsx for the replacement implementation.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CareSummaryExportScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/care-report?scope=full' as any);
  }, []);

  return null;
}
