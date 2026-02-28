/**
 * @deprecated This screen has been replaced by the unified Care Report screen.
 * Redirects to /care-report?scope=today
 * See app/care-report.tsx for the replacement implementation.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function MedicationReportScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/care-report?scope=today' as any);
  }, []);

  return null;
}
