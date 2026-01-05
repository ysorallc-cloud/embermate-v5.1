// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, useWindowDimensions, AppState } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDailyMedicationStatus } from '../utils/medicationStorage';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';
import SecurityLockScreen from '../components/SecurityLockScreen';
import WebLoginScreen from '../components/WebLoginScreen';
import {
  shouldLockSession,
  hasActiveSession,
  updateLastActivity,
  isBiometricEnabled,
  hasPIN,
} from '../utils/biometricAuth';
import {
  shouldLockSession as shouldLockWebSession,
  hasActiveSession as hasActiveWebSession,
  updateLastActivity as updateWebLastActivity,
  hasPassword as hasWebPassword,
} from '../utils/webAuth';
import { isWeb } from '../utils/platform';
import { logLogin } from '../utils/auditLog';

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
          width: containerWidth,
          maxWidth: isSmallScreen ? '100%' : 480,
        }
      ]}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  // Handle notification taps
  useNotificationHandler();

  // Security state
  const [isLocked, setIsLocked] = useState(true);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAndResetMedicationStatus();
    requestNotificationPermissionsOnStartup();
    checkSecurityStatus();
    setupAppStateListener();
  }, []);

  // Check if security is enabled and if session should be locked
  async function checkSecurityStatus() {
    try {
      if (isWeb) {
        // Web platform: check for password-based auth
        const passwordExists = await hasWebPassword();
        setIsSecurityEnabled(passwordExists);

        if (passwordExists) {
          const shouldLock = await shouldLockWebSession();
          const hasSession = await hasActiveWebSession();

          // Lock if no active session or timeout exceeded
          setIsLocked(shouldLock || !hasSession);
        } else {
          // No password set yet, don't lock (will show setup)
          setIsLocked(false);
        }
      } else {
        // Mobile platform: check for biometric/PIN auth
        const biometricEnabled = await isBiometricEnabled();
        const pinExists = await hasPIN();
        const securityEnabled = biometricEnabled || pinExists;

        setIsSecurityEnabled(securityEnabled);

        if (securityEnabled) {
          const shouldLock = await shouldLockSession();
          const hasSession = await hasActiveSession();

          // Lock if no active session or timeout exceeded
          setIsLocked(shouldLock || !hasSession);
        } else {
          // No security enabled, don't lock
          setIsLocked(false);
        }
      }
    } catch (error) {
      console.error('Error checking security status:', error);
      setIsLocked(false);
    } finally {
      setIsCheckingLock(false);
    }
  }

  // Monitor app state changes for auto-lock
  function setupAppStateListener() {
    if (isWeb) {
      // Web: No AppState on web, handled by auto-lock timer in webAuth
      return () => {};
    }

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // App going to background
      if (appState.current.match(/active/) && nextAppState === 'background') {
        await updateLastActivity();
      }

      // App coming to foreground
      if (appState.current.match(/background/) && nextAppState === 'active') {
        // Check if we should lock
        if (isSecurityEnabled) {
          const shouldLock = await shouldLockSession();
          if (shouldLock) {
            setIsLocked(true);
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }

  // Handle successful unlock
  function handleUnlock() {
    setIsLocked(false);
    if (isWeb) {
      updateWebLastActivity();
    } else {
      updateLastActivity();
    }
  }

  async function requestNotificationPermissionsOnStartup() {
    try {
      // Only request on first launch or if not yet requested
      const hasAskedBefore = await AsyncStorage.getItem('@embermate_notification_permissions_asked');
      
      if (!hasAskedBefore) {
        // Wait a moment to let UI settle before showing permission dialog
        setTimeout(async () => {
          await requestNotificationPermissions();
          await AsyncStorage.setItem('@embermate_notification_permissions_asked', 'true');
        }, 1000);
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  }

  async function checkAndResetMedicationStatus() {
    try {
      const lastReset = await AsyncStorage.getItem('@embermate_last_reset_date');
      const today = new Date().toISOString().split('T')[0];
      
      if (lastReset !== today) {
        console.log('🔄 Resetting daily medication status for new day');
        await resetDailyMedicationStatus();
        await AsyncStorage.setItem('@embermate_last_reset_date', today);
      }
    } catch (error) {
      console.error('Error checking medication reset:', error);
    }
  }
  
  // Show lock screen if security is enabled and locked
  if (isLocked && !isCheckingLock) {
    if (isWeb) {
      return <WebLoginScreen onUnlock={handleUnlock} />;
    } else if (isSecurityEnabled) {
      return <SecurityLockScreen onUnlock={handleUnlock} />;
    }
  }

  // Show blank screen while checking lock status
  if (isCheckingLock) {
    return <View style={{ flex: 1, backgroundColor: '#051614' }} />;
  }

  return (
    <WebContainer>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="patient" />
        <Stack.Screen name="coffee" options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="medication-schedule" />
        <Stack.Screen name="medication-form" />
        <Stack.Screen name="medication-interactions" />
        <Stack.Screen name="medications" />
        <Stack.Screen name="appointment-form" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="cloud-sync" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="vitals" />
        <Stack.Screen name="vitals-log" />
        <Stack.Screen name="symptoms" />
        <Stack.Screen name="symptoms-log" />
        <Stack.Screen name="care-brief" />
        <Stack.Screen name="care-summary-export" />
        <Stack.Screen name="family-sharing" />
        <Stack.Screen name="family-activity" />
        <Stack.Screen name="caregiver-management" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="correlation-report" />
        <Stack.Screen name="correlation-test" />
      </Stack>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#0D1F1C', // Match app background
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    backgroundColor: '#051614',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    // Add border radius for larger screens
    borderRadius: 0,
  },
  webInnerConstrained: {
    // Legacy style - no longer used but kept for compatibility
    maxWidth: 480,
  },
});
