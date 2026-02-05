// ============================================================================
// CARE PLAN HOME
// Main entry point for configuring Care Plan buckets
// "Choose what to track and how reminders work"
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  BucketType,
  BUCKET_META,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';
import { InfoModal, InfoIconButton } from '../../components/common/InfoModal';

// ============================================================================
// BUCKET CARD COMPONENT
// ============================================================================

interface BucketCardProps {
  bucket: BucketType;
  enabled: boolean;
  statusText: string | null;
  onToggle: (enabled: boolean) => void;
  onConfigure: () => void;
}

function BucketCard({ bucket, enabled, statusText, onToggle, onConfigure }: BucketCardProps) {
  const meta = BUCKET_META[bucket];

  return (
    <View style={[styles.bucketCard, enabled && styles.bucketCardEnabled]}>
      <TouchableOpacity
        style={styles.bucketCardMain}
        onPress={onConfigure}
        activeOpacity={0.7}
      >
        <View style={styles.bucketCardLeft}>
          <Text style={styles.bucketEmoji}>{meta.emoji}</Text>
          <View style={styles.bucketInfo}>
            <Text style={[styles.bucketName, enabled && styles.bucketNameEnabled]}>
              {meta.name}
            </Text>
            <Text style={styles.bucketInsight} numberOfLines={2}>
              {meta.aiInsight}
            </Text>
            {enabled && statusText && (
              <Text style={styles.bucketStatus}>{statusText}</Text>
            )}
          </View>
        </View>
        <View style={styles.bucketCardRight}>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.accent }}
            thumbColor={enabled ? '#FFFFFF' : '#F4F3F4'}
            ios_backgroundColor="rgba(255,255,255,0.2)"
          />
        </View>
      </TouchableOpacity>
      {enabled && (
        <TouchableOpacity
          style={styles.configureButton}
          onPress={onConfigure}
          activeOpacity={0.7}
        >
          <Text style={styles.configureText}>Configure</Text>
          <Text style={styles.configureChevron}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// AI INSIGHT CARD - Contextual tips
// ============================================================================

interface AIInsightCardProps {
  icon: string;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function AIInsightCard({ icon, title, message, onDismiss }: AIInsightCardProps) {
  return (
    <View style={styles.aiInsightCard}>
      <View style={styles.aiInsightHeader}>
        <Text style={styles.aiInsightIcon}>{icon}</Text>
        <Text style={styles.aiInsightTitle}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.aiInsightDismiss}>
            <Text style={styles.aiInsightDismissText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.aiInsightMessage}>{message}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanHomeScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    hasCarePlan,
    enabledBuckets,
    toggleBucket,
    getBucketStatus,
    initializeConfig,
  } = useCarePlanConfig();

  const [showMoreBuckets, setShowMoreBuckets] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Ensure config exists on first load
  React.useEffect(() => {
    if (!loading && !config) {
      initializeConfig();
    }
  }, [loading, config, initializeConfig]);

  const handleToggleBucket = useCallback(async (bucket: BucketType, enabled: boolean) => {
    await toggleBucket(bucket, enabled);
  }, [toggleBucket]);

  const handleConfigureBucket = useCallback((bucket: BucketType) => {
    // Navigate to bucket-specific configuration screen
    switch (bucket) {
      case 'meds':
        router.push('/care-plan/meds' as any);
        break;
      case 'vitals':
        router.push('/care-plan/vitals' as any);
        break;
      case 'meals':
        router.push('/care-plan/meals' as any);
        break;
      case 'water':
        router.push('/care-plan/water' as any);
        break;
      case 'mood':
        router.push('/care-plan/mood' as any);
        break;
      case 'sleep':
        router.push('/care-plan/sleep' as any);
        break;
      case 'symptoms':
        router.push('/care-plan/symptoms' as any);
        break;
      case 'activity':
        router.push('/care-plan/activity' as any);
        break;
      case 'appointments':
        router.push('/appointments' as any);
        break;
      default:
        break;
    }
  }, [router]);

  const dismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => [...prev, id]);
  }, []);

  // Determine which contextual insight to show (rule-based, non-LLM)
  const getContextualInsight = useCallback(() => {
    if (!config) return null;

    // Priority 1: No buckets enabled - suggest starting simple
    if (!hasCarePlan && !dismissedInsights.includes('start-simple')) {
      return {
        id: 'start-simple',
        icon: '💡',
        title: 'Start simple',
        message: 'Try enabling Medications and Mood first. You can add more categories anytime.',
      };
    }

    // Priority 2: Meds enabled but no medications added
    if (config.meds.enabled) {
      const medsConfig = config.meds;
      if (!medsConfig.medications?.length && !dismissedInsights.includes('add-meds')) {
        return {
          id: 'add-meds',
          icon: '💊',
          title: 'Add medications',
          message: 'Tap Configure on Medications to add your first medication and set up reminders.',
        };
      }

      // Priority 3: Medication supply tracking without threshold
      const medsWithSupply = (medsConfig.medications || []).filter(m => m.supplyEnabled && m.active);
      const medsNeedingRefill = medsWithSupply.filter(m =>
        m.daysSupply !== undefined && m.refillThresholdDays !== undefined &&
        m.daysSupply <= m.refillThresholdDays
      );
      if (medsNeedingRefill.length > 0 && !dismissedInsights.includes('refill-reminder')) {
        return {
          id: 'refill-reminder',
          icon: '🔔',
          title: 'Refill reminder',
          message: `${medsNeedingRefill[0].name} supply is running low. Consider ordering a refill soon.`,
        };
      }
    }

    // Priority 4: Many buckets enabled - suggest focus
    const enabledCount = enabledBuckets.length;
    if (enabledCount >= 6 && !dismissedInsights.includes('focus-suggestion')) {
      return {
        id: 'focus-suggestion',
        icon: '🎯',
        title: 'Focus for better habits',
        message: "You've enabled many categories. Consider starting with 2-3 that matter most, then add more once those feel natural.",
      };
    }

    // Priority 5: Vitals enabled but no types selected
    if (config.vitals.enabled) {
      const vitalsConfig = config.vitals;
      if ((!vitalsConfig.vitalTypes || vitalsConfig.vitalTypes.length === 0) && !dismissedInsights.includes('select-vitals')) {
        return {
          id: 'select-vitals',
          icon: '📊',
          title: 'Choose vitals to track',
          message: 'Tap Configure on Vitals to select which measurements to track.',
        };
      }
    }

    // Priority 6: No notifications enabled on any bucket (when buckets are enabled)
    if (hasCarePlan && config) {
      const anyNotificationsEnabled = enabledBuckets.some((bucket: BucketType) => config[bucket]?.notificationsEnabled);
      if (!anyNotificationsEnabled && !dismissedInsights.includes('enable-notifications')) {
        return {
          id: 'enable-notifications',
          icon: '🔔',
          title: 'Stay on track',
          message: 'Enable reminders on any category to get gentle notifications when things are due.',
        };
      }
    }

    return null;
  }, [config, hasCarePlan, enabledBuckets, dismissedInsights]);

  const contextualInsight = getContextualInsight();

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        </LinearGradient>
      </View>
    );
  }

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
          <Text style={styles.headerLabel}>CARE PLAN</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Care Plan</Text>
              <InfoIconButton onPress={() => setShowInfoModal(true)} />
            </View>
            <Text style={styles.subtitle}>
              Choose what to track and how reminders work.
            </Text>
          </View>

          {/* Info Modal */}
          <InfoModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="About Your Care Plan"
            content="Your Care Plan sets the routine for typical days. Changes here update future schedules permanently."
            hint="Use 'Adjust Today' from the Now screen for one-day changes that reset tomorrow."
          />

          {/* How Your Care Plan Works - Explanatory Panel */}
          <View style={styles.howItWorksCard}>
            <View style={styles.howItWorksHeader}>
              <Text style={styles.howItWorksIcon}>📋</Text>
              <Text style={styles.howItWorksTitle}>How your Care Plan works</Text>
            </View>
            <View style={styles.howItWorksList}>
              <Text style={styles.howItWorksItem}>
                • Your Care Plan defines what you track and when.
              </Text>
              <Text style={styles.howItWorksItem}>
                • <Text style={styles.howItWorksBold}>Now</Text> shows what's next. <Text style={styles.howItWorksBold}>Record</Text> saves what happened.
              </Text>
              <Text style={styles.howItWorksItem}>
                • <Text style={styles.howItWorksBold}>Understand</Text> finds patterns from what you log.
              </Text>
            </View>
            <Text style={styles.howItWorksStorage}>
              Your data is saved on your device.
            </Text>
          </View>

          {/* Contextual AI Insight */}
          {contextualInsight && (
            <AIInsightCard
              icon={contextualInsight.icon}
              title={contextualInsight.title}
              message={contextualInsight.message}
              onDismiss={() => dismissInsight(contextualInsight.id)}
            />
          )}

          {/* Primary Buckets */}
          <Text style={styles.sectionLabel}>TRACKING CATEGORIES</Text>
          {PRIMARY_BUCKETS.map(bucket => (
            <BucketCard
              key={bucket}
              bucket={bucket}
              enabled={config?.[bucket]?.enabled ?? false}
              statusText={getBucketStatus(bucket)}
              onToggle={(enabled) => handleToggleBucket(bucket, enabled)}
              onConfigure={() => handleConfigureBucket(bucket)}
            />
          ))}

          {/* More Categories Toggle */}
          {!showMoreBuckets ? (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowMoreBuckets(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.showMoreText}>+ Show more categories</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.sectionLabel}>MORE CATEGORIES</Text>
              {SECONDARY_BUCKETS.map(bucket => (
                <BucketCard
                  key={bucket}
                  bucket={bucket}
                  enabled={config?.[bucket]?.enabled ?? false}
                  statusText={getBucketStatus(bucket)}
                  onToggle={(enabled) => handleToggleBucket(bucket, enabled)}
                  onConfigure={() => handleConfigureBucket(bucket)}
                />
              ))}
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowMoreBuckets(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.showMoreText}>- Hide extra categories</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Optional - Appointments */}
          <Text style={styles.sectionLabel}>OPTIONAL</Text>
          {OPTIONAL_BUCKETS.map(bucket => (
            <BucketCard
              key={bucket}
              bucket={bucket}
              enabled={config?.[bucket]?.enabled ?? false}
              statusText={getBucketStatus(bucket)}
              onToggle={(enabled) => handleToggleBucket(bucket, enabled)}
              onConfigure={() => handleConfigureBucket(bucket)}
            />
          ))}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Title Section
  titleSection: {
    marginBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
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

  // Bucket Card
  bucketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  bucketCardEnabled: {
    borderColor: 'rgba(94, 234, 212, 0.3)',
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
  },
  bucketCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  bucketCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bucketEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bucketNameEnabled: {
    color: Colors.accent,
  },
  bucketInsight: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bucketStatus: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 6,
    fontWeight: '500',
  },
  bucketCardRight: {
    paddingTop: 4,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 234, 212, 0.15)',
    backgroundColor: 'rgba(94, 234, 212, 0.03)',
  },
  configureText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  configureChevron: {
    fontSize: 18,
    color: Colors.accent,
  },

  // Show More
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  showMoreText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },

  // AI Insight Card
  aiInsightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiInsightIcon: {
    fontSize: 20,
  },
  aiInsightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#A78BFA',
  },
  aiInsightDismiss: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightDismissText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  aiInsightMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // How It Works Card
  howItWorksCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  howItWorksIcon: {
    fontSize: 18,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60A5FA',
  },
  howItWorksList: {
    gap: 6,
  },
  howItWorksItem: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 19,
  },
  howItWorksBold: {
    fontWeight: '600',
    color: '#60A5FA',
  },
  howItWorksStorage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
