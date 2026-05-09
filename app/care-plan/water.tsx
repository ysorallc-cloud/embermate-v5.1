// ============================================================================
// WATER BUCKET CONFIGURATION — Phase 10.3.x migrated to
// CarePlanConfigScreen (chrome=gradient, the bucket-config family).
//
// The primitive owns SafeAreaView + LinearGradient + header chrome.
// Body unchanged: enable toggle, priority, daily goal, units,
// reminder frequency, notifications.
// ============================================================================

import React, { useCallback, useMemo } from 'react';
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
import { CarePlanConfigScreen } from '../../components/care-plan/CarePlanConfigScreen';
import {
  WaterBucketConfig,
  PRIORITY_OPTIONS,
  WaterReminderFrequency,
  WATER_REMINDER_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// GOAL SELECTOR COMPONENT
// ============================================================================

interface GoalOption {
  value: number;
  label: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { value: 4, label: '4 glasses' },
  { value: 6, label: '6 glasses' },
  { value: 8, label: '8 glasses' },
  { value: 10, label: '10 glasses' },
  { value: 12, label: '12 glasses' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WaterBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const waterConfig = config?.water as WaterBucketConfig | undefined;
  const enabled = waterConfig?.enabled ?? false;
  const priority = waterConfig?.priority ?? 'recommended';
  const dailyGoalGlasses = waterConfig?.dailyGoalGlasses ?? 8;
  const units = waterConfig?.units ?? 'glasses';
  const reminderFrequency = waterConfig?.reminderFrequency ?? 'none';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('water', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('water', { priority: newPriority });
  }, [updateBucket]);

  const handleChangeGoal = useCallback(async (goal: number) => {
    await updateBucket('water', { dailyGoalGlasses: goal } as Partial<WaterBucketConfig>);
  }, [updateBucket]);

  const handleChangeUnits = useCallback(async (newUnits: string) => {
    await updateBucket('water', { units: newUnits });
  }, [updateBucket]);

  const handleChangeReminderFrequency = useCallback(async (frequency: WaterReminderFrequency) => {
    await updateBucket('water', { reminderFrequency: frequency } as Partial<WaterBucketConfig>);
  }, [updateBucket]);

  return (
    <CarePlanConfigScreen
      title="Water"
      subtitle="Supports hydration goals and explains fatigue or headaches."
      chrome="gradient"
      onBack={() => router.back()}
    >
      {/* Enable Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Track Water Intake</Text>
          <Text style={styles.settingDescription}>
            Enable hydration tracking in your Care Plan
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
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

          {/* Daily Goal */}
          <Text style={styles.sectionLabel}>DAILY GOAL</Text>
          <View style={styles.goalContainer}>
            <View style={styles.goalDisplay}>
              <Text style={styles.goalEmoji}>💧</Text>
              <Text style={styles.goalValue}>{dailyGoalGlasses}</Text>
              <Text style={styles.goalUnits}>{units}</Text>
            </View>
            <View style={styles.goalOptions}>
              {GOAL_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.goalOption,
                    dailyGoalGlasses === option.value && styles.goalOptionSelected,
                  ]}
                  onPress={() => handleChangeGoal(option.value)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${option.label} daily goal`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: dailyGoalGlasses === option.value }}
                >
                  <Text style={[
                    styles.goalOptionLabel,
                    dailyGoalGlasses === option.value && styles.goalOptionLabelSelected,
                  ]}>
                    {option.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.goalHint}>
              About {Math.round(dailyGoalGlasses * 8)} oz or {Math.round(dailyGoalGlasses * 0.24)} liters
            </Text>
          </View>

          {/* Units */}
          <Text style={styles.sectionLabel}>UNITS</Text>
          <View style={styles.unitsContainer}>
            {[
              { value: 'glasses', label: 'Glasses', subtext: '~8 oz each' },
              { value: 'oz', label: 'Ounces', subtext: 'Fluid oz' },
              { value: 'ml', label: 'Milliliters', subtext: 'Metric' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.unitOption,
                  units === option.value && styles.unitOptionSelected,
                ]}
                onPress={() => handleChangeUnits(option.value)}
                activeOpacity={0.7}
                accessibilityLabel={`${option.label}, ${option.subtext}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: units === option.value }}
              >
                <Text style={[
                  styles.unitLabel,
                  units === option.value && styles.unitLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.unitSubtext}>{option.subtext}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reminder Frequency */}
          <Text style={styles.sectionLabel}>REMINDER FREQUENCY</Text>
          <Text style={styles.sectionDescription}>
            Get prompts to drink water throughout the day
          </Text>
          <View style={styles.reminderContainer}>
            {WATER_REMINDER_OPTIONS.filter(o => o.value !== 'custom').map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderOption,
                  reminderFrequency === option.value && styles.reminderOptionSelected,
                ]}
                onPress={() => handleChangeReminderFrequency(option.value)}
                activeOpacity={0.7}
                accessibilityLabel={`${option.label}, ${option.description}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: reminderFrequency === option.value }}
              >
                <Text style={[
                  styles.reminderLabel,
                  reminderFrequency === option.value && styles.reminderLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.reminderDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notifications Setting */}
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Hydration Reminders</Text>
              <Text style={styles.settingDescription}>
                Get periodic reminders to drink water
              </Text>
            </View>
            <Switch
              value={waterConfig?.notificationsEnabled ?? false}
              onValueChange={(value) => updateBucket('water', { notificationsEnabled: value })}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={(waterConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
            />
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

  // Goal
  goalContainer: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  goalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: '300',
    color: c.accent,
  },
  goalUnits: {
    fontSize: 18,
    color: c.textSecondary,
    marginTop: 12,
  },
  goalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  goalOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginHorizontal: 4,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.sm,
  },
  goalOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageBorder,
  },
  goalOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textSecondary,
  },
  goalOptionLabelSelected: {
    color: c.textPrimary,
    fontWeight: '600' as const,
  },
  goalHint: {
    textAlign: 'center',
    fontSize: 12,
    color: c.textMuted,
  },

  // Units
  unitsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  unitOption: {
    flex: 1,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  unitOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  unitLabelSelected: {
    fontWeight: '700' as const,
  },
  unitSubtext: {
    fontSize: 11,
    color: c.textMuted,
  },

  // Reminder Frequency
  sectionDescription: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  reminderContainer: {
    gap: Spacing.xs,
  },
  reminderOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  reminderOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  reminderLabelSelected: {
    fontWeight: '600' as const,
  },
  reminderDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
