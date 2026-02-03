// ============================================================================
// SYMPTOMS BUCKET CONFIGURATION
// Configure symptom tracking in the Care Plan
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
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SymptomsBucketScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const symptomsConfig = config?.symptoms as BucketConfig | undefined;
  const enabled = symptomsConfig?.enabled ?? false;
  const priority = symptomsConfig?.priority ?? 'recommended';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('symptoms', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('symptoms', { priority: newPriority });
  }, [updateBucket]);

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
          <Text style={styles.headerLabel}>SYMPTOMS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Symptoms</Text>
            <Text style={styles.subtitle}>
              Captures patterns that help doctors understand the full picture.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Symptoms</Text>
              <Text style={styles.settingDescription}>
                Enable symptom tracking in your Care Plan
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

              {/* What to Track */}
              <Text style={styles.sectionLabel}>WHAT YOU CAN LOG</Text>
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>🤕</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Symptom Type</Text>
                    <Text style={styles.featureDescription}>
                      Pain, nausea, fatigue, dizziness, etc.
                    </Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>📍</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Location</Text>
                    <Text style={styles.featureDescription}>
                      Where on the body it occurs
                    </Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>📊</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Severity</Text>
                    <Text style={styles.featureDescription}>
                      Mild to severe on a 1-10 scale
                    </Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>⏱️</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Duration</Text>
                    <Text style={styles.featureDescription}>
                      How long it lasted
                    </Text>
                  </View>
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoEmoji}>💡</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Log as they happen</Text>
                  <Text style={styles.infoText}>
                    Symptoms are best captured when they occur. Over time,
                    patterns emerge that can help identify triggers or correlations
                    with medications, meals, or activities.
                  </Text>
                </View>
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Symptom Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get periodic prompts to log any symptoms
                  </Text>
                </View>
                <Switch
                  value={symptomsConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('symptoms', { notificationsEnabled: value })}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
                  thumbColor={(symptomsConfig?.notificationsEnabled ?? false) ? '#FFFFFF' : '#F4F3F4'}
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

  // Features
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
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
