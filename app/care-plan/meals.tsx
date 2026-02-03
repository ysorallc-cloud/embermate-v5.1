// ============================================================================
// MEALS BUCKET CONFIGURATION
// Configure meal tracking in the Care Plan
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  MealsBucketConfig,
  TimeOfDay,
  TIME_OF_DAY_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MealsBucketScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const mealsConfig = config?.meals as MealsBucketConfig | undefined;
  const enabled = mealsConfig?.enabled ?? false;
  const priority = mealsConfig?.priority ?? 'recommended';
  const timesOfDay = mealsConfig?.timesOfDay ?? ['morning', 'midday', 'evening'];
  const trackingStyle = mealsConfig?.trackingStyle ?? 'quick';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('meals', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('meals', { priority: newPriority });
  }, [updateBucket]);

  const handleToggleMealTime = useCallback(async (time: TimeOfDay) => {
    const currentTimes = timesOfDay || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];

    // Ensure at least one time is selected
    if (newTimes.length > 0) {
      await updateBucket('meals', { timesOfDay: newTimes });
    }
  }, [timesOfDay, updateBucket]);

  const handleChangeTrackingStyle = useCallback(async (style: 'quick' | 'detailed') => {
    await updateBucket('meals', { trackingStyle: style } as Partial<MealsBucketConfig>);
  }, [updateBucket]);

  const mealTimeLabels: Record<string, string> = {
    morning: 'Breakfast',
    midday: 'Lunch',
    evening: 'Dinner',
    night: 'Snack/Late',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>MEALS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Meals</Text>
            <Text style={styles.subtitle}>
              Helps connect nutrition to mood, energy, and symptoms.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Meals</Text>
              <Text style={styles.settingDescription}>
                Enable meal tracking in your Care Plan
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

              {/* Meals to Track */}
              <Text style={styles.sectionLabel}>MEALS TO TRACK</Text>
              <View style={styles.mealsGrid}>
                {TIME_OF_DAY_OPTIONS.filter(t => t.value !== 'custom').map(timeOption => (
                  <TouchableOpacity
                    key={timeOption.value}
                    style={[
                      styles.mealItem,
                      timesOfDay.includes(timeOption.value) && styles.mealItemSelected,
                    ]}
                    onPress={() => handleToggleMealTime(timeOption.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mealEmoji}>
                      {timeOption.value === 'morning' ? '🌅' :
                       timeOption.value === 'midday' ? '☀️' :
                       timeOption.value === 'evening' ? '🌆' : '🌙'}
                    </Text>
                    <Text style={[
                      styles.mealLabel,
                      timesOfDay.includes(timeOption.value) && styles.mealLabelSelected,
                    ]}>
                      {mealTimeLabels[timeOption.value] || timeOption.label}
                    </Text>
                    <View style={[
                      styles.checkbox,
                      timesOfDay.includes(timeOption.value) && styles.checkboxSelected,
                    ]}>
                      {timesOfDay.includes(timeOption.value) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tracking Style */}
              <Text style={styles.sectionLabel}>TRACKING STYLE</Text>
              <View style={styles.styleContainer}>
                <TouchableOpacity
                  style={[
                    styles.styleOption,
                    trackingStyle === 'quick' && styles.styleOptionSelected,
                  ]}
                  onPress={() => handleChangeTrackingStyle('quick')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.styleEmoji}>⚡</Text>
                  <View style={styles.styleInfo}>
                    <Text style={[
                      styles.styleLabel,
                      trackingStyle === 'quick' && styles.styleLabelSelected,
                    ]}>
                      Quick Log
                    </Text>
                    <Text style={styles.styleDescription}>
                      Just tap to log that you ate
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.styleOption,
                    trackingStyle === 'detailed' && styles.styleOptionSelected,
                  ]}
                  onPress={() => handleChangeTrackingStyle('detailed')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.styleEmoji}>📝</Text>
                  <View style={styles.styleInfo}>
                    <Text style={[
                      styles.styleLabel,
                      trackingStyle === 'detailed' && styles.styleLabelSelected,
                    ]}>
                      Detailed
                    </Text>
                    <Text style={styles.styleDescription}>
                      Log what you ate and how much
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Meal Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified at meal times
                  </Text>
                </View>
                <Switch
                  value={mealsConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('meals', { notificationsEnabled: value })}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
                  thumbColor={(mealsConfig?.notificationsEnabled ?? false) ? '#FFFFFF' : '#F4F3F4'}
                  ios_backgroundColor="rgba(255,255,255,0.2)"
                />
              </View>
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
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

  // Meals Grid
  mealsGrid: {
    gap: Spacing.sm,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  mealItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  mealLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Tracking Style
  styleContainer: {
    gap: Spacing.sm,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  styleOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
  },
  styleEmoji: {
    fontSize: 24,
  },
  styleInfo: {
    flex: 1,
  },
  styleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  styleLabelSelected: {
    color: Colors.accent,
  },
  styleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
