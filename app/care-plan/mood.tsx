// ============================================================================
// MOOD BUCKET CONFIGURATION
// Configure mood tracking in the Care Plan
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
  BucketConfig,
  TimeOfDay,
  TIME_OF_DAY_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoodBucketScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const moodConfig = config?.mood as BucketConfig | undefined;
  const enabled = moodConfig?.enabled ?? false;
  const priority = moodConfig?.priority ?? 'recommended';
  const timesOfDay = moodConfig?.timesOfDay ?? ['morning'];

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('mood', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('mood', { priority: newPriority });
  }, [updateBucket]);

  const handleToggleTime = useCallback(async (time: TimeOfDay) => {
    const currentTimes = timesOfDay || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];

    // Ensure at least one time is selected
    if (newTimes.length > 0) {
      await updateBucket('mood', { timesOfDay: newTimes });
    }
  }, [timesOfDay, updateBucket]);

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
          <Text style={styles.headerLabel}>MOOD</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Mood</Text>
            <Text style={styles.subtitle}>
              Creates context for 'why today felt harder' without overthinking.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Mood</Text>
              <Text style={styles.settingDescription}>
                Enable mood tracking in your Care Plan
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

              {/* Check-in Times */}
              <Text style={styles.sectionLabel}>WHEN TO CHECK IN</Text>
              <View style={styles.timesGrid}>
                {TIME_OF_DAY_OPTIONS.filter(t => t.value !== 'custom').map(timeOption => (
                  <TouchableOpacity
                    key={timeOption.value}
                    style={[
                      styles.timeItem,
                      timesOfDay.includes(timeOption.value) && styles.timeItemSelected,
                    ]}
                    onPress={() => handleToggleTime(timeOption.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeEmoji}>
                      {timeOption.value === 'morning' ? '🌅' :
                       timeOption.value === 'midday' ? '☀️' :
                       timeOption.value === 'evening' ? '🌆' : '🌙'}
                    </Text>
                    <Text style={[
                      styles.timeLabel,
                      timesOfDay.includes(timeOption.value) && styles.timeLabelSelected,
                    ]}>
                      {timeOption.label}
                    </Text>
                    <Text style={styles.timeSubtext}>{timeOption.time}</Text>
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

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoEmoji}>💡</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Quick and simple</Text>
                  <Text style={styles.infoText}>
                    Mood check-ins take just a few seconds. Pick how you're feeling
                    and optionally add a note. Over time, this helps spot patterns.
                  </Text>
                </View>
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Mood Check-in Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get gentle reminders to log your mood
                  </Text>
                </View>
                <Switch
                  value={moodConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('mood', { notificationsEnabled: value })}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
                  thumbColor={(moodConfig?.notificationsEnabled ?? false) ? '#FFFFFF' : '#F4F3F4'}
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

  // Times Grid
  timesGrid: {
    gap: Spacing.sm,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  timeItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
  },
  timeEmoji: {
    fontSize: 24,
  },
  timeLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  timeLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  timeSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
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

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
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
    color: '#A78BFA',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
