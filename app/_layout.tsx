// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDailyMedicationStatus } from '../utils/medicationStorage';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';

function WebContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={[styles.webInner, width > 500 && styles.webInnerConstrained]}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  // Handle notification taps
  useNotificationHandler();
  
  useEffect(() => {
    checkAndResetMedicationStatus();
    requestNotificationPermissionsOnStartup();
  }, []);

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
        <Stack.Screen name="medication-interactions" />
        <Stack.Screen name="cloud-sync" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="appointments" />
      </Stack>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#16162a',
    alignItems: 'center',
  },
  webInner: {
    flex: 1,
    width: '100%',
  },
  webInnerConstrained: {
    maxWidth: 430,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
});
