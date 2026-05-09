// ============================================================================
// SLEEP BUCKET CONFIGURATION — Phase 10.3.x migrated to
// CarePlanConfigScreen (chrome=gradient, the bucket-config family).
//
// The primitive owns SafeAreaView + LinearGradient + header chrome.
// Body unchanged: enable toggle, priority, what-to-track features,
// info card, notifications.
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
  BucketConfig,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SleepBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const sleepConfig = config?.sleep as BucketConfig | undefined;
  const enabled = sleepConfig?.enabled ?? false;
  const priority = sleepConfig?.priority ?? 'recommended';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('sleep', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('sleep', { priority: newPriority });
  }, [updateBucket]);

  return (
    <CarePlanConfigScreen
      title="Sleep"
      subtitle="Links rest quality to symptoms and energy."
      chrome="gradient"
      onBack={() => router.back()}
    >
      {/* Enable Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Track Sleep</Text>
          <Text style={styles.settingDescription}>
            Enable sleep tracking in your Care Plan
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
          accessibilityLabel="Track Sleep"
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
                accessibilityLabel={`${option.label} priority: ${option.description}`}
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

          {/* What to Track */}
          <Text style={styles.sectionLabel}>WHAT TO TRACK</Text>
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🛏️</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureLabel}>Sleep Duration</Text>
                <Text style={styles.featureDescription}>
                  How many hours of sleep
                </Text>
              </View>
              <View style={styles.checkboxActive}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>⭐</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureLabel}>Sleep Quality</Text>
                <Text style={styles.featureDescription}>
                  Rate how restful it was
                </Text>
              </View>
              <View style={styles.checkboxActive}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📝</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureLabel}>Sleep Notes</Text>
                <Text style={styles.featureDescription}>
                  Optional notes about the night
                </Text>
              </View>
              <View style={styles.checkboxActive}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Morning check-in</Text>
              <Text style={styles.infoText}>
                Sleep is best logged in the morning when you wake up.
                It only takes a moment to record how you slept.
              </Text>
            </View>
          </View>

          {/* Notifications Setting */}
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sleep Log Reminder</Text>
              <Text style={styles.settingDescription}>
                Get reminded each morning to log sleep
              </Text>
            </View>
            <Switch
              value={sleepConfig?.notificationsEnabled ?? false}
              onValueChange={(value) => updateBucket('sleep', { notificationsEnabled: value })}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={(sleepConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Sleep Log Reminder"
              accessibilityRole="switch"
              accessibilityState={{ checked: sleepConfig?.notificationsEnabled ?? false }}
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

  // Features
  featuresContainer: {
    gap: Spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },
  checkboxActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: c.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: c.caregiverAccentMuted,
    borderWidth: 1,
    borderColor: c.caregiverAccentStrong,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  infoEmoji: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.caregiverAccentText,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
});
