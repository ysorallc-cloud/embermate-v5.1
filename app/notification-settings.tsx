// ============================================================================
// NOTIFICATION SETTINGS - Delivery Controls Only
// Controls HOW alerts are delivered, not WHAT generates them.
// Care Plan is the single source of truth for reminder configuration.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { navigate } from '../lib/navigate';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  hasNotificationPermissions,
  getScheduledNotifications,
  rescheduleAllNotifications,
  NotificationSettings,
} from '../utils/notificationService';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import {
  getMedicationsFromPlan,
  getCarePlanConfig,
} from '../storage/carePlanConfigRepo';
import { useWellnessSettings } from '../hooks/useWellnessSettings';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';

// Components
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { SubScreenHeader } from '../components/SubScreenHeader';

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [loading, setLoading] = useState(true);
  // Phase 34 NOT.D-summary — intent-side data sources (NOT the
  // registry, which fluctuates as notifications fire). The summary
  // renders the four-row breakdown caregivers can act on.
  const [medsEnabledCount, setMedsEnabledCount] = useState(0);
  const [vitalsGateOpen, setVitalsGateOpen] = useState(false);
  const [mealsGateOpen, setMealsGateOpen] = useState(false);
  const { settings: wellnessSettings } = useWellnessSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Phase 34 NOT.D-summary — also read the live intent-side
      // sources for the SCHEDULE SUMMARY section. getMedicationsFromPlan
      // is the canonical meds source (per-med notificationsEnabled is
      // the A1 gate); getCarePlanConfig is the live-read for the
      // vitals/meals bucket gates HIGH #7 wired into the scheduler.
      const [savedSettings, permission, plannedMeds, carePlanCfg] =
        await Promise.all([
          getNotificationSettings(),
          hasNotificationPermissions(),
          getMedicationsFromPlan(DEFAULT_PATIENT_ID),
          getCarePlanConfig(DEFAULT_PATIENT_ID),
        ]);

      setSettings(savedSettings);
      setHasPermission(permission);
      const enabledMeds = (plannedMeds || []).filter(
        (m: any) => m && m.active !== false && m.notificationsEnabled !== false,
      );
      setMedsEnabledCount(enabledMeds.length);
      const vitalsBucket = (carePlanCfg as any)?.vitals;
      const mealsBucket = (carePlanCfg as any)?.meals;
      setVitalsGateOpen(vitalsBucket?.notificationsEnabled === true);
      setMealsGateOpen(mealsBucket?.notificationsEnabled === true);
    } catch (error) {
      logError('NotificationSettingsScreen.loadSettings', error);
    } finally {
      setLoading(false);
    }
  };

  // Phase 34 NOT.D-summary — D.summary.1 lock: Medications row is
  // count + "reminders". Wellness row is windows + times. Vitals +
  // Meals rows are live-read on/off (no per-window time UI yet).
  // D.summary.2 lock: four rows always; only the value varies.
  const medsSummaryValue =
    medsEnabledCount === 0
      ? 'disabled'
      : `${medsEnabledCount} ${medsEnabledCount === 1 ? 'reminder' : 'reminders'}`;

  const wellnessSummaryValue = (() => {
    const morning = wellnessSettings?.morning;
    const evening = wellnessSettings?.evening;
    const morningOn = morning?.reminderEnabled === true;
    const eveningOn = evening?.reminderEnabled === true;
    if (!morningOn && !eveningOn) return 'disabled';
    const pieces: string[] = [];
    if (morningOn) pieces.push(`morning ${morning?.time ?? '07:00'}`);
    if (eveningOn) pieces.push(`evening ${evening?.time ?? '20:00'}`);
    return pieces.join(' • ');
  })();

  const vitalsSummaryValue = vitalsGateOpen ? 'on' : 'disabled';
  const mealsSummaryValue = mealsGateOpen ? 'on' : 'disabled';

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);

    if (granted) {
      Alert.alert(
        'Permissions Granted',
        'EmberMate can now send you reminders.'
      );
      // Phase 34 NOT.D-wiring — routes through the UNIFIED scheduler
      // path (NOT.A1+NOT.A2 wired CarePlanItem.notification through
      // here). Pre-D-wiring this called the LEGACY
      // scheduleMedicationNotifications, silently bypassing the
      // per-med config wiring. See
      // [[feedback_canonical_path_when_implementations_coexist]] for
      // the trap-class context.
      await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
      await loadSettings();
    } else {
      Alert.alert(
        'Permissions Denied',
        'You can enable notifications later in your device settings.'
      );
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
    emitDataUpdate(EVENT.NOTIFICATIONS);

    // Phase 34 NOT.D-wiring — routes through the UNIFIED scheduler.
    // Pre-D-wiring this called the LEGACY scheduleMedicationNotifications
    // after every sound/vibration/quiet-hours/follow-up toggle, silently
    // bypassing NOT.A1+A2's per-med config wiring. The unified path
    // reads CarePlanItem.notification (wired in A1) so delivery-setting
    // changes propagate correctly. Trap class: legacy-vs-unified caller
    // drift — see
    // [[feedback_canonical_path_when_implementations_coexist]].
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
  };

  const handleToggleSound = async (value: boolean) => {
    await updateSettings({ soundEnabled: value });
  };

  const handleToggleVibration = async (value: boolean) => {
    await updateSettings({ vibrationEnabled: value });
  };

  const handleToggleQuietHours = async (value: boolean) => {
    await updateSettings({ quietHoursEnabled: value });
  };

  const handleToggleOverdueAlerts = async (value: boolean) => {
    await updateSettings({ overdueAlertsEnabled: value });
  };

  const handleChangeGracePeriod = async (minutes: number) => {
    await updateSettings({ gracePeriodMinutes: minutes });
  };

  const handleChangeOverdueInterval = async (minutes: number) => {
    await updateSettings({ overdueAlertMinutes: minutes });
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Cycle through quiet hours start times
  const cycleQuietHoursStart = () => {
    const times = ['20:00', '21:00', '22:00', '23:00', '00:00'];
    const currentIndex = times.indexOf(settings.quietHoursStart);
    const nextIndex = (currentIndex + 1) % times.length;
    updateSettings({ quietHoursStart: times[nextIndex] });
  };

  // Cycle through quiet hours end times
  const cycleQuietHoursEnd = () => {
    const times = ['05:00', '06:00', '07:00', '08:00', '09:00'];
    const currentIndex = times.indexOf(settings.quietHoursEnd);
    const nextIndex = (currentIndex + 1) % times.length;
    updateSettings({ quietHoursEnd: times[nextIndex] });
  };

  // Grace period options
  const gracePeriodOptions = [
    { label: '5 minutes', value: 5 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
  ];

  // Overdue alert interval options
  const overdueIntervalOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
  ];

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
          <SubScreenHeader title="Notifications" subtitle="How we reach you" emoji="🔔" />

          {/* Explanation Card */}
          <View style={styles.explanationCard}>
            <Text style={styles.explanationIcon}>💡</Text>
            <Text style={styles.explanationText}>
              These settings control how reminders are delivered.{'\n'}
              To change what generates reminders, edit your Care Plan.
            </Text>
          </View>

          {/* Permission Required Warning */}
          {!hasPermission && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={24} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Permissions Required</Text>
                <Text style={styles.warningText}>
                  Allow EmberMate to send notifications to receive any reminders.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleRequestPermissions}
                accessibilityLabel="Enable notification permissions"
                accessibilityRole="button"
              >
                <Text style={styles.permissionButtonText}>Enable</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Permission Granted Indicator */}
          {hasPermission && (
            <View style={styles.permissionGranted}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={styles.permissionGrantedText}>
                System notifications enabled
              </Text>
            </View>
          )}

          {/* SOUND & VIBRATION Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SOUND & VIBRATION</Text>
            <Text style={styles.sectionDescription}>
              Control how alerts get your attention
            </Text>

            <View style={styles.settingCard}>
              {/* Sound Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Sound</Text>
                  <Text style={styles.settingHint}>Play audio for reminders</Text>
                </View>
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={handleToggleSound}
                  trackColor={{ false: colors.glassStrong, true: colors.sageGlow }}
                  thumbColor={settings.soundEnabled ? colors.sage : colors.textHalf}
                  accessibilityLabel="Sound"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: settings.soundEnabled }}
                />
              </View>

              <View style={styles.settingDivider} />

              {/* Vibration Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Vibration</Text>
                  <Text style={styles.settingHint}>Haptic feedback for alerts</Text>
                </View>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={handleToggleVibration}
                  trackColor={{ false: colors.glassStrong, true: colors.sageGlow }}
                  thumbColor={settings.vibrationEnabled ? colors.sage : colors.textHalf}
                  accessibilityLabel="Vibration"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: settings.vibrationEnabled }}
                />
              </View>
            </View>
          </View>

          {/* QUIET HOURS Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>QUIET HOURS</Text>
            <Text style={styles.sectionDescription}>
              Pause non-critical reminders during rest time
            </Text>

            <View style={styles.settingCard}>
              {/* Quiet Hours Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable quiet hours</Text>
                  <Text style={styles.settingHint}>Only critical alerts during this window</Text>
                </View>
                <Switch
                  value={settings.quietHoursEnabled}
                  onValueChange={handleToggleQuietHours}
                  trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
                  thumbColor={settings.quietHoursEnabled ? colors.accent : colors.textHalf}
                  accessibilityLabel="Enable quiet hours"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: settings.quietHoursEnabled }}
                />
              </View>

              {settings.quietHoursEnabled && (
                <>
                  <View style={styles.settingDivider} />

                  {/* Time Range */}
                  <View style={styles.timeRangeRow}>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={cycleQuietHoursStart}
                      activeOpacity={0.7}
                      accessibilityLabel={`Quiet hours start time, ${formatTime(settings.quietHoursStart)}. Tap to change`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.timeLabel}>From</Text>
                      <Text style={styles.timeValue}>{formatTime(settings.quietHoursStart)}</Text>
                    </TouchableOpacity>

                    <Text style={styles.timeArrow}>→</Text>

                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={cycleQuietHoursEnd}
                      activeOpacity={0.7}
                      accessibilityLabel={`Quiet hours end time, ${formatTime(settings.quietHoursEnd)}. Tap to change`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.timeLabel}>Until</Text>
                      <Text style={styles.timeValue}>{formatTime(settings.quietHoursEnd)}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.quietHoursNote}>
                    Tap times to adjust. Medications marked "critical" will still alert.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* FOLLOW-UP REMINDERS Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>FOLLOW-UP REMINDERS</Text>
            <Text style={styles.sectionDescription}>
              Re-alert when items aren't logged
            </Text>

            <View style={styles.settingCard}>
              {/* Overdue Alerts Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Allow follow-up alerts</Text>
                  <Text style={styles.settingHint}>Enable re-alerts for missed items</Text>
                </View>
                <Switch
                  value={settings.overdueAlertsEnabled}
                  onValueChange={handleToggleOverdueAlerts}
                  trackColor={{ false: colors.glassStrong, true: colors.sageGlow }}
                  thumbColor={settings.overdueAlertsEnabled ? colors.sage : colors.textHalf}
                  accessibilityLabel="Allow follow-up alerts"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: settings.overdueAlertsEnabled }}
                />
              </View>

              {settings.overdueAlertsEnabled && (
                <>
                  <View style={styles.settingDivider} />
                  <View style={styles.perItemNote}>
                    <Text style={styles.perItemNoteIcon}>💡</Text>
                    <Text style={styles.perItemNoteText}>
                      Follow-up timing is set per item in your Care Plan. Tap the bell icon on any medication to configure its reminder settings.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Care Plan Link */}
          <TouchableOpacity
            style={styles.carePlanLink}
            onPress={() => navigate('/care-plan')}
            activeOpacity={0.7}
            accessibilityLabel="Edit Care Plan, configure what generates reminders"
            accessibilityRole="link"
          >
            <View style={styles.carePlanLinkContent}>
              <Text style={styles.carePlanLinkIcon}>📋</Text>
              <View style={styles.carePlanLinkText}>
                <Text style={styles.carePlanLinkTitle}>Edit Care Plan</Text>
                <Text style={styles.carePlanLinkSubtitle}>
                  Configure what generates reminders
                </Text>
              </View>
            </View>
            <Text style={styles.carePlanLinkChevron}>›</Text>
          </TouchableOpacity>

          {/* Phase 34 NOT.D-summary — SCHEDULE SUMMARY section.
              Replaces the pre-D-summary bare scheduledCount footer
              (debug-side, not caregiver-useful). The structured rows
              read intent-side (config, not the OS registry) so the
              caregiver sees what THEY configured, not what happens to
              be scheduled at this exact second. */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionHeader}>SCHEDULE SUMMARY</Text>
            <View style={styles.settingCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Medications</Text>
                <Text style={styles.summaryRowValue}>{medsSummaryValue}</Text>
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Wellness</Text>
                <Text style={styles.summaryRowValue}>{wellnessSummaryValue}</Text>
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Vitals</Text>
                <Text style={styles.summaryRowValue}>{vitalsSummaryValue}</Text>
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Meals</Text>
                <Text style={styles.summaryRowValue}>{mealsSummaryValue}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: c.textSecondary,
  },


  // Explanation Card
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: c.blueFaint,
    borderWidth: 1,
    borderColor: c.blueWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  explanationIcon: {
    fontSize: 16,
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    color: c.textBright,
    lineHeight: 19,
  },

  // Permission Warning
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.amberBrightTint,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  permissionButton: {
    backgroundColor: c.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.background,
  },

  // Permission Granted
  permissionGranted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  permissionGrantedText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  settingHint: {
    fontSize: 12,
    color: c.textHalf,
  },
  settingDivider: {
    height: 1,
    backgroundColor: c.glassHover,
    marginHorizontal: 14,
  },

  // Time Range
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 16,
  },
  timeButton: {
    alignItems: 'center',
    backgroundColor: c.accentTint,
    borderWidth: 1,
    borderColor: c.accentLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 100,
  },
  timeLabel: {
    fontSize: 11,
    color: c.textHalf,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  timeArrow: {
    fontSize: 16,
    color: c.textPlaceholder,
  },
  quietHoursNote: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  // Per-item note
  perItemNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  perItemNoteIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  perItemNoteText: {
    flex: 1,
    fontSize: 12,
    color: c.textTertiary,
    lineHeight: 17,
  },

  // Option Selector
  optionSelector: {
    padding: 14,
  },
  optionLabel: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 10,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionButtonSelected: {
    backgroundColor: c.sageBorder,
    borderColor: c.sageMuted,
  },
  optionButtonText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  optionButtonTextSelected: {
    color: c.sage,
    fontWeight: '600',
  },

  // Care Plan Link
  carePlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.sageTint,
    borderWidth: 1,
    borderColor: c.sageBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  carePlanLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carePlanLinkIcon: {
    fontSize: 24,
  },
  carePlanLinkText: {
    flex: 1,
  },
  carePlanLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
    marginBottom: 2,
  },
  carePlanLinkSubtitle: {
    fontSize: 12,
    color: c.textHalf,
  },
  carePlanLinkChevron: {
    fontSize: 20,
    color: c.accentMuted,
    fontWeight: '600',
  },

  // Phase 34 NOT.D-summary — SCHEDULE SUMMARY section styles.
  // Mirrors the existing settingCard / sectionHeader pattern used
  // by SOUND & VIBRATION / QUIET HOURS / FOLLOW-UP REMINDERS above.
  summarySection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  summaryRowLabel: {
    fontSize: 14,
    color: c.textPrimary,
  },
  summaryRowValue: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
