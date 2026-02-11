// ============================================================================
// MEDICATIONS BUCKET CONFIGURATION
// Configure medication tracking in the Care Plan
// ============================================================================

import React, { useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  MedsBucketConfig,
  MedicationPlanItem,
  PRIORITY_OPTIONS,
  formatTimeForDisplay,
} from '../../types/carePlanConfig';
import { NotificationConfigSheet } from '../../components/care-plan/NotificationConfigSheet';
import type { NotificationConfig, NotificationTiming } from '../../types/notifications';
import type { ReminderTiming } from '../../types/carePlanConfig';

// ============================================================================
// MEDICATION ITEM COMPONENT
// ============================================================================

interface MedicationItemProps {
  medication: MedicationPlanItem;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onRemove: () => void;
  onNotificationPress: () => void;
}

function MedicationItem({ medication, onEdit, onToggleActive, onRemove, onNotificationPress }: MedicationItemProps) {
  const timeDisplay = medication.customTimes?.length
    ? medication.customTimes.map(t => formatTimeForDisplay(t)).join(', ')
    : medication.timesOfDay?.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') || 'No time set';

  // Check if notifications are enabled for this medication
  const notificationsEnabled = medication.notificationsEnabled ?? true;

  return (
    <View style={[styles.medItem, !medication.active && styles.medItemInactive]}>
      <TouchableOpacity
        style={styles.medItemMain}
        onPress={onEdit}
        activeOpacity={0.7}
        accessibilityLabel={`Edit ${medication.name}, ${medication.dosage}, ${timeDisplay}`}
        accessibilityRole="button"
      >
        <View style={styles.medItemLeft}>
          <Text style={styles.medEmoji}>💊</Text>
          <View style={styles.medInfo}>
            <Text style={[styles.medName, !medication.active && styles.medNameInactive]}>
              {medication.name}
            </Text>
            <Text style={styles.medDosage}>{medication.dosage}</Text>
            <Text style={styles.medTime}>{timeDisplay}</Text>
            {medication.instructions && (
              <Text style={styles.medInstructions} numberOfLines={1}>
                {medication.instructions}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.medItemRight}>
          {/* Notification Bell Toggle */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={notificationsEnabled ? `${medication.name} notifications on, tap to configure` : `${medication.name} notifications off, tap to configure`}
            accessibilityRole="button"
            accessibilityState={{ checked: notificationsEnabled }}
          >
            <Text style={[styles.notificationIcon, !notificationsEnabled && styles.notificationIconOff]}>
              {notificationsEnabled ? '🔔' : '🔕'}
            </Text>
          </TouchableOpacity>
          <Switch
            value={medication.active}
            onValueChange={onToggleActive}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
            thumbColor={medication.active ? '#FFFFFF' : '#F4F3F4'}
            ios_backgroundColor="rgba(255,255,255,0.2)"
          />
        </View>
      </TouchableOpacity>
      <View style={styles.medItemActions}>
        <TouchableOpacity style={styles.medActionButton} onPress={onEdit} accessibilityLabel={`Edit ${medication.name}`} accessibilityRole="button">
          <Text style={styles.medActionText}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.medActionDivider} />
        <TouchableOpacity
          style={styles.medActionButton}
          onPress={() => {
            Alert.alert(
              'Remove Medication',
              `Are you sure you want to remove ${medication.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ]
            );
          }}
          accessibilityLabel={`Remove ${medication.name}`}
          accessibilityRole="button"
        >
          <Text style={[styles.medActionText, styles.medActionTextDanger]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedsBucketScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
    updateMedication,
    removeMedication,
    getActiveMedications,
  } = useCarePlanConfig();

  const medsConfig = config?.meds as MedsBucketConfig | undefined;
  const medications = medsConfig?.medications || [];
  const enabled = medsConfig?.enabled ?? false;
  const priority = medsConfig?.priority ?? 'recommended';

  // Notification config sheet state
  const [notificationSheetVisible, setNotificationSheetVisible] = useState(false);
  const [selectedMedForNotification, setSelectedMedForNotification] = useState<MedicationPlanItem | null>(null);

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('meds', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('meds', { priority: newPriority });
  }, [updateBucket]);

  const handleToggleMedActive = useCallback(async (medId: string, active: boolean) => {
    await updateMedication(medId, { active });
  }, [updateMedication]);

  const handleRemoveMed = useCallback(async (medId: string) => {
    await removeMedication(medId);
  }, [removeMedication]);

  const handleEditMed = useCallback((medId: string) => {
    // Navigate to medication form with edit mode
    router.push(`/medication-form?id=${medId}&source=careplan` as any);
  }, [router]);

  const handleAddMed = useCallback(() => {
    // Navigate to medication form to add new
    router.push('/medication-form?source=careplan' as any);
  }, [router]);

  const handleNotificationPress = useCallback((med: MedicationPlanItem) => {
    setSelectedMedForNotification(med);
    setNotificationSheetVisible(true);
  }, []);

  const handleSaveNotificationConfig = useCallback(async (config: NotificationConfig) => {
    if (!selectedMedForNotification) return;

    // Convert NotificationTiming to ReminderTiming (they're compatible except before_5)
    const timing = config.timing === 'before_5' ? 'at_time' : config.timing as ReminderTiming;

    await updateMedication(selectedMedForNotification.id, {
      notificationsEnabled: config.enabled,
      reminderTiming: timing,
      reminderCustomMinutes: config.customMinutesBefore,
      followUpEnabled: config.followUp.enabled,
      followUpInterval: config.followUp.intervalMinutes,
      followUpMaxAttempts: config.followUp.maxAttempts,
    });

    setNotificationSheetVisible(false);
    setSelectedMedForNotification(null);
  }, [selectedMedForNotification, updateMedication]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>MEDICATIONS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Medications</Text>
            <Text style={styles.subtitle}>
              Keeps dosing and adherence accurate for reports and patterns.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Medications</Text>
              <Text style={styles.settingDescription}>
                Enable medication tracking in your Care Plan
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
              thumbColor={enabled ? '#FFFFFF' : '#F4F3F4'}
              ios_backgroundColor="rgba(255,255,255,0.2)"
            />
          </View>

          {enabled && (
            <>
              {/* Priority Selector */}
              <Text style={styles.sectionLabel}>PRIORITY</Text>
              <View style={styles.priorityContainer}>
                {PRIORITY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      priority === option.value && styles.priorityOptionSelected,
                    ]}
                    onPress={() => handleChangePriority(option.value)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label} priority, ${option.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: priority === option.value }}
                  >
                    <Text style={[
                      styles.priorityLabel,
                      priority === option.value && styles.priorityLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.priorityDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Medications List */}
              <View style={styles.medsHeaderRow}>
                <Text style={styles.sectionLabel}>YOUR MEDICATIONS</Text>
                <TouchableOpacity onPress={handleAddMed} accessibilityLabel="Add medication" accessibilityRole="button">
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {medications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💊</Text>
                  <Text style={styles.emptyTitle}>No medications added</Text>
                  <Text style={styles.emptySubtitle}>
                    Add your medications to track doses and get reminders.
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddMed}
                    activeOpacity={0.7}
                    accessibilityLabel="Add medication"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonTextLarge}>+ Add Medication</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {medications.map(med => (
                    <MedicationItem
                      key={med.id}
                      medication={med}
                      onEdit={() => handleEditMed(med.id)}
                      onToggleActive={(active) => handleToggleMedActive(med.id, active)}
                      onRemove={() => handleRemoveMed(med.id)}
                      onNotificationPress={() => handleNotificationPress(med)}
                    />
                  ))}
                  <TouchableOpacity
                    style={styles.addButtonOutline}
                    onPress={handleAddMed}
                    activeOpacity={0.7}
                    accessibilityLabel="Add another medication"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonText}>+ Add Another Medication</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Medication Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when medications are due
                  </Text>
                </View>
                <Switch
                  value={medsConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('meds', { notificationsEnabled: value })}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
                  thumbColor={(medsConfig?.notificationsEnabled ?? false) ? '#FFFFFF' : '#F4F3F4'}
                  ios_backgroundColor="rgba(255,255,255,0.2)"
                />
              </View>
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Notification Config Sheet */}
        {selectedMedForNotification && (
          <NotificationConfigSheet
            visible={notificationSheetVisible}
            itemId={selectedMedForNotification.id}
            itemName={selectedMedForNotification.name}
            itemType="medication"
            currentConfig={selectedMedForNotification.notificationsEnabled !== undefined ? {
              enabled: selectedMedForNotification.notificationsEnabled,
              timing: selectedMedForNotification.reminderTiming || 'at_time',
              customMinutesBefore: selectedMedForNotification.reminderCustomMinutes,
              followUp: {
                enabled: selectedMedForNotification.followUpEnabled ?? true,
                intervalMinutes: selectedMedForNotification.followUpInterval ?? 30,
                maxAttempts: selectedMedForNotification.followUpMaxAttempts ?? 3,
              },
            } : undefined}
            onSave={handleSaveNotificationConfig}
            onClose={() => {
              setNotificationSheetVisible(false);
              setSelectedMedForNotification(null);
            }}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#0d332e',
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
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Title
  titleSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Priority
  priorityContainer: {
    gap: Spacing.sm,
  },
  priorityOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  priorityOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  priorityLabelSelected: {
    color: Colors.accent,
  },
  priorityDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Meds Header Row
  medsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Medication Item
  medItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  medItemInactive: {
    opacity: 0.6,
  },
  medItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  medItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  medEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medNameInactive: {
    color: Colors.textSecondary,
  },
  medDosage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  medTime: {
    fontSize: 13,
    color: Colors.accent,
  },
  medInstructions: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  medItemRight: {
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationIconOff: {
    opacity: 0.5,
  },
  medItemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  medActionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  medActionDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  medActionText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  medActionTextDanger: {
    color: '#EF4444',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonTextLarge: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.background,
  },
  addButtonOutline: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
});
