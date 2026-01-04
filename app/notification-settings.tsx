// ============================================================================
// NOTIFICATION SETTINGS SCREEN
// Configure medication reminder preferences
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  hasNotificationPermissions,
  getScheduledNotifications,
  NotificationSettings,
} from '../utils/notificationService';
import { getMedications } from '../utils/medicationStorage';
import { scheduleMedicationNotifications } from '../utils/notificationService';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminderMinutesBefore: 0,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedSettings, permission, scheduled] = await Promise.all([
        getNotificationSettings(),
        hasNotificationPermissions(),
        getScheduledNotifications(),
      ]);
      
      setSettings(savedSettings);
      setHasPermission(permission);
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    
    if (granted) {
      Alert.alert(
        'Permissions Granted',
        'You will now receive medication reminders.'
      );
      // Reschedule notifications
      const medications = await getMedications();
      await scheduleMedicationNotifications(medications);
      await loadSettings();
    } else {
      Alert.alert(
        'Permissions Denied',
        'You can enable notifications later in your device settings.'
      );
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    const newSettings = { ...settings, enabled: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
    
    // Reschedule or cancel notifications
    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
    await loadSettings();
  };

  const handleToggleSound = async (value: boolean) => {
    const newSettings = { ...settings, soundEnabled: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
    
    // Reschedule with new settings
    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
  };

  const handleToggleVibration = async (value: boolean) => {
    const newSettings = { ...settings, vibrationEnabled: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleReminderTimeChange = async (minutes: number) => {
    const newSettings = { ...settings, reminderMinutesBefore: minutes };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
    
    // Reschedule with new timing
    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
    await loadSettings();
  };

  const reminderOptions = [
    { label: 'At scheduled time', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>NOTIFICATIONS</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Notification Settings</Text>

          {/* Permission Status */}
          {!hasPermission && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={24} color={Colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Permissions Required</Text>
                <Text style={styles.warningText}>
                  Allow EmberMate to send notifications to receive medication reminders.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleRequestPermissions}
              >
                <Text style={styles.permissionButtonText}>Enable</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Toggle */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Medication Reminders</Text>
                <Text style={styles.settingDescription}>
                  Daily notifications for scheduled medications
                </Text>
              </View>
              <Switch
                value={settings.enabled && hasPermission}
                onValueChange={handleToggleEnabled}
                disabled={!hasPermission}
                trackColor={{ false: Colors.textMuted, true: Colors.accent }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>

          {/* Reminder Timing */}
          {settings.enabled && hasPermission && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>REMINDER TIMING</Text>
                {reminderOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.optionRow}
                    onPress={() => handleReminderTimeChange(option.value)}
                  >
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {settings.reminderMinutesBefore === option.value && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sound & Vibration */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NOTIFICATION STYLE</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Sound</Text>
                    <Text style={styles.settingDescription}>Play notification sound</Text>
                  </View>
                  <Switch
                    value={settings.soundEnabled}
                    onValueChange={handleToggleSound}
                    trackColor={{ false: Colors.textMuted, true: Colors.accent }}
                    thumbColor={Colors.surface}
                  />
                </View>

                {Platform.OS === 'android' && (
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Vibration</Text>
                      <Text style={styles.settingDescription}>Vibrate on notification</Text>
                    </View>
                    <Switch
                      value={settings.vibrationEnabled}
                      onValueChange={handleToggleVibration}
                      trackColor={{ false: Colors.textMuted, true: Colors.accent }}
                      thumbColor={Colors.surface}
                    />
                  </View>
                )}
              </View>

              {/* Status Info */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={Colors.accent} />
                <Text style={styles.infoText}>
                  {scheduledCount} {scheduledCount === 1 ? 'reminder' : 'reminders'} scheduled for active medications
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  placeholder: { width: 40 },
  title: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, marginBottom: Spacing.xl },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  warningText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  permissionButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: { fontSize: 14, fontWeight: '600', color: Colors.surface },
  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  settingLabel: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500', marginBottom: 4 },
  settingDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  optionLabel: { fontSize: 15, color: Colors.textPrimary },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
