// ============================================================================
// VITALS BUCKET CONFIGURATION — Phase 10.3.x migrated to
// CarePlanConfigScreen (chrome=gradient, the bucket-config family).
//
// The primitive owns SafeAreaView + LinearGradient + header chrome.
// Body unchanged: enable toggle, priority, vital types grid, frequency,
// notifications, auto-import card.
// ============================================================================

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  VitalsBucketConfig,
  VitalType,
  VITAL_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';
import { getHealthDataProvider } from '../../utils/healthDataProvider';
import { CarePlanConfigScreen } from '../../components/care-plan/CarePlanConfigScreen';

// ============================================================================
// VITAL TYPE ITEM COMPONENT
// ============================================================================

interface VitalTypeItemProps {
  vital: { value: VitalType; label: string; emoji: string };
  selected: boolean;
  onToggle: () => void;
}

function VitalTypeItem({ vital, selected, onToggle }: VitalTypeItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.vitalItem, selected && styles.vitalItemSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityLabel={`${vital.label}, ${selected ? 'selected' : 'not selected'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Text style={styles.vitalEmoji}>{vital.emoji}</Text>
      <Text style={[styles.vitalLabel, selected && styles.vitalLabelSelected]}>
        {vital.label}
      </Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VitalsBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const vitalsConfig = config?.vitals as VitalsBucketConfig | undefined;
  const enabled = vitalsConfig?.enabled ?? false;
  const priority = vitalsConfig?.priority ?? 'recommended';
  const vitalTypes = vitalsConfig?.vitalTypes ?? ['bp', 'hr'];
  const frequency = vitalsConfig?.frequency ?? 'daily';

  const [healthKitAvailable, setHealthKitAvailable] = useState(false);
  useEffect(() => {
    getHealthDataProvider().isAvailable().then(setHealthKitAvailable);
  }, []);

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('vitals', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('vitals', { priority: newPriority });
  }, [updateBucket]);

  const handleToggleVitalType = useCallback(async (vitalType: VitalType) => {
    const currentTypes = vitalTypes || [];
    const newTypes = currentTypes.includes(vitalType)
      ? currentTypes.filter(t => t !== vitalType)
      : [...currentTypes, vitalType];

    if (newTypes.length > 0) {
      await updateBucket('vitals', { vitalTypes: newTypes } as Partial<VitalsBucketConfig>);
    }
  }, [vitalTypes, updateBucket]);

  const handleChangeFrequency = useCallback(async (newFrequency: 'daily' | 'weekly' | 'as_needed') => {
    await updateBucket('vitals', { frequency: newFrequency } as Partial<VitalsBucketConfig>);
  }, [updateBucket]);

  return (
    <CarePlanConfigScreen
      title="Vitals"
      subtitle="Makes trends visible over time, even when each reading seems normal."
      chrome="gradient"
      onBack={() => router.back()}
    >
      {/* Enable Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Track Vitals</Text>
          <Text style={styles.settingDescription}>
            Enable vitals tracking in your Care Plan
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Track Vitals"
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
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

          {/* Vital Types */}
          <Text style={styles.sectionLabel}>WHAT TO TRACK</Text>
          <View style={styles.vitalsGrid}>
            {VITAL_TYPE_OPTIONS.map(vital => (
              <VitalTypeItem
                key={vital.value}
                vital={vital}
                selected={vitalTypes.includes(vital.value)}
                onToggle={() => handleToggleVitalType(vital.value)}
              />
            ))}
          </View>

          {/* Frequency */}
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          <View style={styles.frequencyContainer}>
            {[
              { value: 'daily', label: 'Daily', description: 'Check vitals every day' },
              { value: 'weekly', label: 'Weekly', description: 'Check vitals once a week' },
              { value: 'as_needed', label: 'As Needed', description: 'Log when symptoms arise' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyOption,
                  frequency === option.value && styles.frequencyOptionSelected,
                ]}
                onPress={() => handleChangeFrequency(option.value as 'daily' | 'weekly' | 'as_needed')}
                activeOpacity={0.7}
                accessibilityLabel={`${option.label} frequency, ${option.description}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: frequency === option.value }}
              >
                <Text style={[
                  styles.frequencyLabel,
                  frequency === option.value && styles.frequencyLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.frequencyDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notifications Setting */}
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Vitals Reminders</Text>
              <Text style={styles.settingDescription}>
                Get notified when it's time to check vitals
              </Text>
            </View>
            <Switch
              value={vitalsConfig?.notificationsEnabled ?? false}
              onValueChange={(value) => updateBucket('vitals', { notificationsEnabled: value })}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={(vitalsConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Vitals reminders"
              accessibilityRole="switch"
              accessibilityState={{ checked: vitalsConfig?.notificationsEnabled ?? false }}
            />
          </View>
        </>
      )}

      {/* Auto-import toggle — only visible when HealthKit is available (iOS) */}
      {healthKitAvailable && enabled && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Auto-Import</Text>
          </View>
          <View style={styles.autoImportCard}>
            <Text style={styles.autoImportDesc}>
              Import vitals automatically from Apple Health. Data stays on your device.
            </Text>
            {VITAL_TYPE_OPTIONS.filter(v => vitalTypes.includes(v.value)).map(vital => (
              <View key={vital.value} style={styles.autoImportRow}>
                <Text style={styles.autoImportLabel}>{vital.emoji} {vital.label}</Text>
                <Text style={styles.autoImportStatus}>Manual only</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </CarePlanConfigScreen>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  // Section Labels
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Priority
  priorityContainer: {
    gap: Spacing.xs,
  },
  priorityOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  priorityOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  priorityLabelSelected: {
    fontWeight: '600' as const,
  },
  priorityDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Vitals Grid
  vitalsGrid: {
    gap: Spacing.xs,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  vitalItemSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  vitalEmoji: {
    fontSize: 24,
  },
  vitalLabel: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
  },
  vitalLabelSelected: {
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    color: c.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Frequency
  frequencyContainer: {
    gap: Spacing.xs,
  },
  frequencyOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  frequencyOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  frequencyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  frequencyLabelSelected: {
    fontWeight: '600' as const,
  },
  frequencyDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Auto-import
  autoImportCard: {
    backgroundColor: c.glassFaint,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: Spacing.sm,
  },
  autoImportDesc: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  autoImportRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: c.glassBorder,
  },
  autoImportLabel: {
    fontSize: 14,
    color: c.textPrimary,
  },
  autoImportStatus: {
    fontSize: 12,
    color: c.textMuted,
  },
});
