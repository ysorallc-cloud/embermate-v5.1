// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, useWindowDimensions, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';
import { runStartupSequence } from '../services/appStartup';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../utils/biometricAuth';
import { logError } from '../utils/devLog';
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
  const [locked, setLocked] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const checkSessionLock = useCallback(async () => {
    try {
      const enabled = await isBiometricEnabled();
      if (!enabled) return;
      const timeout = await getAutoLockTimeout();
      const stale = await shouldLockSession(timeout);
      if (stale) setLocked(true);
    } catch (err) {
      logError('RootLayout.checkSessionLock', err);
    }
  }, []);

  const handleUnlock = useCallback(async () => {
    const success = await requireAuthentication();
    if (success) {
      await updateLastActivity();
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    // Orchestrated startup: error reporting → migrations → daily reset → cleanup
    runStartupSequence();

    // Notification permissions handled separately (needs delay for UX)
    requestNotificationPermissionsOnStartup();

    // Track activity for session timeout + check lock on resume
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && appStateRef.current.match(/inactive|background/)) {
        checkSessionLock();
        updateLastActivity();
      }
      appStateRef.current = nextState;
    });

    // Cleanup timer and subscription on unmount
    return () => {
      subscription.remove();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
    };
  }, [checkSessionLock]);

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

  if (locked) {
    return (
      <ErrorBoundary>
        <WebContainer>
          <StatusBar style="light" />
          <View style={styles.lockScreen}>
            <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
            <Text style={styles.lockTitle}>EmberMate Locked</Text>
            <Text style={styles.lockSubtitle}>Authenticate to continue</Text>
            <TouchableOpacity style={styles.lockButton} onPress={handleUnlock} accessibilityRole="button">
              <Text style={styles.lockButtonText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </WebContainer>
      </ErrorBoundary>
    );
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
          <Stack.Screen name="log-water" />
          <Stack.Screen name="log-meal" />
          <Stack.Screen name="log-morning-wellness" />
          <Stack.Screen name="log-evening-wellness" />
          <Stack.Screen name="log-symptom" />
          <Stack.Screen name="care-brief" />
          <Stack.Screen name="care-summary-export" />
          <Stack.Screen name="family-sharing" />
          <Stack.Screen name="family-activity" />
          <Stack.Screen name="caregiver-management" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="medication-report" />
          <Stack.Screen name="care-plan" />
          <Stack.Screen name="log-medication-plan-item" />
          <Stack.Screen name="vital-threshold-settings" />
          <Stack.Screen name="patient" />
          <Stack.Screen name="today-scope" />
          <Stack.Screen name="trends" />
          <Stack.Screen name="data-privacy-settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="log-note" />
          <Stack.Screen name="daily-care-report" />
          <Stack.Screen name="appointment-confirmation" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="medication-confirm" />
          <Stack.Screen name="log-mood" />
          <Stack.Screen name="log-sleep" />
          <Stack.Screen name="log-activity" />
          <Stack.Screen name="quick-log-more" />
          <Stack.Screen name="daily-checkin" />
          <Stack.Screen name="log-hydration" />
          <Stack.Screen name="log-bathroom" />
          <Stack.Screen name="guide-hub" />
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
  lockScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textBright,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  lockButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  lockButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});

export default RootLayout;
