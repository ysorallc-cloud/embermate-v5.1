// Symptoms is no longer a standalone bucket — symptom tracking is embedded
// within meds (side effects), vitals (abnormals), and wellness (pain/orientation).
// Redirect to wellness configuration.

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SymptomsBucketScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/care-plan/wellness' as any);
  }, [router]);
  return null;
}
