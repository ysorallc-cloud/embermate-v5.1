// ============================================================================
// NOTIFICATION SETTINGS - Human-Focused Redesign
// "Here's how often we're allowed to bother you, and about what."
// Hierarchy: Status Summary → Critical → Helpful → Timing → Alerts → Quiet Mode
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
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

// Aurora Components
import { AuroraBackground } from '../components/aurora/AuroraBackground';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminderMinutesBefore: 0,
    soundEnabled: true,
    vibrationEnabled: true,
    overdueAlertsEnabled: true,
    gracePeriodMinutes: 15,
    overdueAlertMinutes: 30,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // New state for redesign
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(true);
  const [vitalsEnabled, setVitalsEnabled] = useState(false);
  const [timingExpanded, setTimingExpanded] = useState(false);
  const [quietModeEnabled, setQuietModeEnabled] = useState(false);

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

  const handleToggleMedications = async (value: boolean) => {
    const newSettings = { ...settings, enabled: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);

    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
    await loadSettings();
  };

  const handleToggleSound = async (value: boolean) => {
    const newSettings = { ...settings, soundEnabled: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);

    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
  };

  const handleReminderTimeChange = async (minutes: number) => {
    const newSettings = { ...settings, reminderMinutesBefore: minutes };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
    setTimingExpanded(false);

    const medications = await getMedications();
    await scheduleMedicationNotifications(medications);
    await loadSettings();
  };

  const handleQuietModeToggle = (enabled: boolean) => {
    setQuietModeEnabled(enabled);
    if (enabled) {
      // Pause non-critical reminders
      setVitalsEnabled(false);
    }
  };

  const reminderOptions = [
    { label: 'At scheduled time', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
  ];

  const currentTimingLabel = useMemo(() => {
    const option = reminderOptions.find(o => o.value === settings.reminderMinutesBefore);
    return option?.label || 'At scheduled time';
  }, [settings.reminderMinutesBefore]);

  // Generate status summary
  const statusSummary = useMemo(() => {
    const enabled = [];
    if (settings.enabled && hasPermission) enabled.push('medications');
    if (appointmentsEnabled) enabled.push('appointments');

    if (enabled.length === 0) {
      return 'No reminders are currently enabled.';
    } else if (enabled.length === 1) {
      return `You'll receive reminders for ${enabled[0]}.`;
    } else {
      return `You'll receive reminders for ${enabled.join(' and ')}.`;
    }
  }, [settings.enabled, hasPermission, appointmentsEnabled]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuroraBackground variant="settings" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="settings" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerLabel}>NOTIFICATIONS</Text>
          <Text style={styles.title}>Notification Settings</Text>

          {/* Status Summary - Instant Orientation */}
          <View style={styles.statusSummary}>
            <Text style={styles.statusSummaryText}>{statusSummary}</Text>
          </View>

          {/* Permission Required Warning */}
          {!hasPermission && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={24} color={Colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Permissions Required</Text>
                <Text style={styles.warningText}>
                  Allow EmberMate to send notifications to receive reminders.
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

          {/* CRITICAL Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>CRITICAL</Text>

            {/* Medications */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderTitle}>Medications</Text>
                <Switch
                  value={settings.enabled && hasPermission}
                  onValueChange={handleToggleMedications}
                  disabled={!hasPermission}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(94,234,212,0.3)' }}
                  thumbColor={settings.enabled && hasPermission ? '#5EEAD4' : 'rgba(255,255,255,0.5)'}
                />
              </View>
              <Text style={styles.reminderSubtitle}>Daily reminders at scheduled times</Text>
            </View>

            {/* Appointments */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderTitle}>Appointments</Text>
                <Switch
                  value={appointmentsEnabled}
                  onValueChange={setAppointmentsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(94,234,212,0.3)' }}
                  thumbColor={appointmentsEnabled ? '#5EEAD4' : 'rgba(255,255,255,0.5)'}
                />
              </View>
              <Text style={styles.reminderSubtitle}>1 day and 1 hour before</Text>
            </View>
          </View>

          {/* HELPFUL Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>HELPFUL</Text>

            {/* Vitals */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderTitle}>Vitals</Text>
                <Switch
                  value={vitalsEnabled && !quietModeEnabled}
                  onValueChange={setVitalsEnabled}
                  disabled={quietModeEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(94,234,212,0.3)' }}
                  thumbColor={vitalsEnabled && !quietModeEnabled ? '#5EEAD4' : 'rgba(255,255,255,0.5)'}
                />
              </View>
              <Text style={styles.reminderSubtitle}>Daily at 9:00 AM</Text>
            </View>
          </View>

          {/* TIMING Section - Collapsed by Default */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>TIMING</Text>

            <TouchableOpacity
              style={styles.timingSection}
              onPress={() => setTimingExpanded(!timingExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.timingSelected}>
                <Text style={styles.timingLabel}>Reminder timing</Text>
                <Text style={styles.timingValue}>{currentTimingLabel} ›</Text>
              </View>
            </TouchableOpacity>

            {timingExpanded && (
              <View style={styles.timingOptions}>
                {reminderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.timingOption}
                    onPress={() => handleReminderTimeChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.timingOptionText,
                      settings.reminderMinutesBefore === option.value && styles.timingOptionSelected,
                    ]}>
                      {settings.reminderMinutesBefore === option.value ? '✓ ' : ''}{option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ALERTS Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ALERTS</Text>

            <View style={styles.soundSection}>
              <View style={styles.soundHeader}>
                <Text style={styles.soundTitle}>Allow audible alerts</Text>
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={handleToggleSound}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(94,234,212,0.3)' }}
                  thumbColor={settings.soundEnabled ? '#5EEAD4' : 'rgba(255,255,255,0.5)'}
                />
              </View>
              <Text style={styles.soundHelper}>Recommended for medications</Text>
            </View>
          </View>

          {/* Quiet Mode - New */}
          <View style={styles.quietMode}>
            <View style={styles.quietModeHeader}>
              <Text style={styles.quietModeTitle}>Quiet mode</Text>
              <Switch
                value={quietModeEnabled}
                onValueChange={handleQuietModeToggle}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(139,92,246,0.3)' }}
                thumbColor={quietModeEnabled ? '#A78BFA' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            <Text style={styles.quietModeSubtitle}>Pause non-critical reminders</Text>
          </View>

          {/* Footer Message - Human, Not Warning */}
          <View style={styles.footerMessage}>
            <Text style={styles.footerIcon}>💬</Text>
            <Text style={styles.footerText}>
              {scheduledCount > 0
                ? `${scheduledCount} ${scheduledCount === 1 ? 'reminder' : 'reminders'} scheduled. Adjust anytime.`
                : 'No medication reminders are active right now. You can turn these on anytime.'}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },

  // Status Summary
  statusSummary: {
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  statusSummaryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },

  // Permission Warning
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
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Reminder Items
  reminderItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Timing Section
  timingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  timingSelected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timingValue: {
    fontSize: 13,
    color: 'rgba(94, 234, 212, 0.8)',
  },
  timingOptions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  timingOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timingOptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timingOptionSelected: {
    color: '#5EEAD4',
  },

  // Sound Section
  soundSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  soundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  soundTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  soundHelper: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Quiet Mode
  quietMode: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  quietModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quietModeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A78BFA',
  },
  quietModeSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Footer Message
  footerMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  footerIcon: {
    fontSize: 16,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
});
