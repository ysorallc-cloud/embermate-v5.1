// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';
import { runStartupSequence } from '../services/appStartup';
import ErrorBoundary from '../components/ErrorBoundary';

import { Colors } from '../theme/theme-tokens';
function WebContainer({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Responsive breakpoints - narrower for better readability
  const isSmallScreen = width <= 768;
  const isMediumScreen = width > 768 && width <= 1024;
  const isLargeScreen = width > 1024;

  // Calculate container width - much narrower for data readability
  let containerWidth = '100%';
  if (isSmallScreen) {
    containerWidth = '100%'; // Full width on mobile
  } else if (isMediumScreen) {
    containerWidth = '440px'; // Tablet - phone-like width
  } else {
    containerWidth = '480px'; // Desktop - comfortable phone-like width
  }

  return (
    <View style={styles.webOuter}>
      <View style={[
        styles.webInner,
        {
          width: containerWidth as any,
          maxWidth: isSmallScreen ? '100%' : 480,
        }
      ]}>
        {children}
      </View>
    </View>
  );
}

function RootLayout() {
  // Handle notification taps
  useNotificationHandler();
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Orchestrated startup: error reporting → migrations → daily reset → cleanup
    runStartupSequence();

    // Notification permissions handled separately (needs delay for UX)
    requestNotificationPermissionsOnStartup();

    // Cleanup timer on unmount
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
    };
  }, []);

  async function requestNotificationPermissionsOnStartup() {
    try {
      // Only request on first launch or if not yet requested
      const hasAskedBefore = await AsyncStorage.getItem('@embermate_notification_permissions_asked');

      if (!hasAskedBefore) {
        // Wait a moment to let UI settle before showing permission dialog
        // Store ref for cleanup on unmount
        notificationTimerRef.current = setTimeout(async () => {
          await requestNotificationPermissions();
          await AsyncStorage.setItem('@embermate_notification_permissions_asked', 'true');
          notificationTimerRef.current = null;
        }, 1000);
      }
    } catch (error) {
      // Non-critical — permission dialog failure shouldn't crash the app
      if (__DEV__) console.error('Error requesting notification permissions:', error);
    }
  }

  return (
    <ErrorBoundary>
      <WebContainer>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="coffee" options={{ presentation: 'modal' }} />
          <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medication-schedule" />
          <Stack.Screen name="medication-form" />
          <Stack.Screen name="medication-interactions" />
          <Stack.Screen name="medications" />
          <Stack.Screen name="appointment-form" />
          <Stack.Screen name="appointments" />
          <Stack.Screen name="photos" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="log-vitals" />
          <Stack.Screen name="log-symptom" />
          <Stack.Screen name="care-brief" />
          <Stack.Screen name="care-summary-export" />
          <Stack.Screen name="family-sharing" />
          <Stack.Screen name="family-activity" />
          <Stack.Screen name="caregiver-management" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="correlation-report" />
          <Stack.Screen name="care-plan" />
          <Stack.Screen name="log-medication-plan-item" />
          <Stack.Screen name="vital-threshold-settings" />
        </Stack>
      </WebContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: Colors.backgroundDeep, // Match app background
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    backgroundColor: Colors.background,
    boxShadow: '0px 0px 30px rgba(0, 0, 0, 0.4)',
    // Add border radius for larger screens
    borderRadius: 0,
  },
  webInnerConstrained: {
    // Legacy style - no longer used but kept for compatibility
    maxWidth: 480,
  },
});

export default Sentry.wrap(RootLayout);
