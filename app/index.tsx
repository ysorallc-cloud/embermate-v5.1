// ============================================================================
// APP ENTRY POINT
// Handles onboarding gating (P1.1)
// ============================================================================

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { isOnboardingComplete } from '../utils/sampleData';
import { Colors } from './_theme/theme-tokens';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    try {
      const complete = await isOnboardingComplete();
      setOnboardingDone(complete);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      // Default to showing onboarding on error
      setOnboardingDone(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  // P1.1: Route to onboarding if not complete, otherwise to Today
  if (onboardingDone) {
    return <Redirect href="/(tabs)/today" />;
  }
  
  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
