// ============================================================================
// RECORD PAGE - Care Plan Driven Capture Tool
// Entry points to log screens, driven by Care Plan configuration.
// Prioritizes enabled plan items and provides contextual guidance.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { MICROCOPY } from '../../constants/microcopy';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { useDataListener } from '../../lib/events';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { BucketType, BUCKET_META } from '../../types/carePlanConfig';

// ============================================================================
// TYPES
// ============================================================================

interface LogItemData {
  id: string;
  bucket: BucketType | null; // null means always show
  emoji: string;
  label: string;
  hint: string;
  route: string;
  priority: number; // lower = higher priority
}

// ============================================================================
// LOG ITEMS - Ordered by Care Plan priority
// ============================================================================

const ALL_LOG_ITEMS: LogItemData[] = [
  // Priority 1: Medications
  { id: 'medications', bucket: 'meds', emoji: '💊', label: 'Medications', hint: 'Log doses', route: '/medications', priority: 1 },
  // Priority 2: Vitals
  { id: 'vitals', bucket: 'vitals', emoji: '📊', label: 'Vitals', hint: 'Record readings', route: '/log-vitals', priority: 2 },
  // Priority 3: Appointments
  { id: 'appointments', bucket: 'appointments', emoji: '📅', label: 'Appointments', hint: 'View & manage', route: '/appointments', priority: 3 },
  // Priority 4: Meals
  { id: 'meals', bucket: 'meals', emoji: '🍽️', label: 'Meals', hint: 'Log food & nutrition', route: '/log-meal', priority: 4 },
  // Priority 5: Water
  { id: 'water', bucket: 'water', emoji: '💧', label: 'Water', hint: 'Log intake', route: '/log-water', priority: 5 },
  // Priority 6+: Other enabled items
  { id: 'mood', bucket: 'mood', emoji: '😊', label: 'Mood', hint: 'Log how they feel', route: '/log-mood', priority: 6 },
  { id: 'sleep', bucket: 'sleep', emoji: '😴', label: 'Sleep', hint: 'Log hours & quality', route: '/log-sleep', priority: 7 },
  { id: 'symptoms', bucket: 'symptoms', emoji: '🩺', label: 'Symptoms', hint: 'Log concerns', route: '/log-symptom', priority: 8 },
  { id: 'activity', bucket: 'activity', emoji: '🚶', label: 'Activity', hint: 'Log movement', route: '/log-activity', priority: 9 },
];

// Items that always appear (not bucket-filtered)
const OPTIONAL_ITEMS: LogItemData[] = [
  { id: 'notes', bucket: null, emoji: '📝', label: 'Notes', hint: 'Add observations', route: '/log-note', priority: 100 },
];

// Default buckets when no Care Plan is configured
const DEFAULT_BUCKETS: BucketType[] = ['meds', 'vitals', 'appointments', 'meals', 'water'];

// ============================================================================
// AI INSIGHT GENERATOR
// ============================================================================

interface InsightData {
  message: string;
  icon: string;
  type: 'action' | 'info' | 'success';
}

function generateInsight(
  enabledBuckets: BucketType[],
  pendingMeds: number,
  pendingVitals: number,
  hasMedications: boolean,
  todayStats: { pending: number; completed: number; total: number } | null
): InsightData {
  // If meds enabled but none configured
  if (enabledBuckets.includes('meds') && !hasMedications) {
    return {
      message: 'Add medications to your Care Plan to start tracking doses.',
      icon: '💊',
      type: 'action',
    };
  }

  // If meds enabled and have pending
  if (enabledBuckets.includes('meds') && pendingMeds > 0) {
    return {
      message: `${pendingMeds} medication ${pendingMeds === 1 ? 'dose' : 'doses'} due today. Logging now helps prevent missed doses.`,
      icon: '💊',
      type: 'action',
    };
  }

  // If vitals enabled and likely not logged today (simple heuristic)
  if (enabledBuckets.includes('vitals') && pendingVitals > 0) {
    return {
      message: 'Care Plan includes vitals today. Recording now helps catch changes early.',
      icon: '📊',
      type: 'action',
    };
  }

  // If we have stats and there are pending items
  if (todayStats && todayStats.pending > 0) {
    return {
      message: `${todayStats.pending} Care Plan ${todayStats.pending === 1 ? 'item' : 'items'} remaining today. You're making progress.`,
      icon: '📋',
      type: 'info',
    };
  }

  // If we have stats and all complete
  if (todayStats && todayStats.total > 0 && todayStats.pending === 0) {
    return {
      message: 'Care Plan is complete for today. Great job staying on track!',
      icon: '✅',
      type: 'success',
    };
  }

  // Default - on track
  return {
    message: 'Care Plan is on track. Meds and vitals are usually most important to log first.',
    icon: '💡',
    type: 'info',
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecordTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [showMoreItems, setShowMoreItems] = useState(false);

  // Care Plan Config
  const { enabledBuckets, loading: configLoading } = useCarePlanConfig();

  // Daily Care Instances for stats
  const { state: dailyState, loading: instancesLoading } = useDailyCareInstances();

  // Medications for setup warning and insight
  const [medications, setMedications] = useState<Medication[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useDataListener(() => {
    loadData();
  });

  // Handle navigation params to auto-expand sections
  useEffect(() => {
    if (params.expandSection) {
      setShowMoreItems(true);
    }
  }, [params.expandSection]);

  const loadData = async () => {
    try {
      setLoading(true);
      const allMeds = await getMedications();
      setMedications(allMeds.filter(m => m.active !== false));
    } catch (error) {
      console.error('Error loading Record data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which buckets to use (enabled or default)
  const activeBuckets = useMemo(() => {
    return enabledBuckets.length > 0 ? enabledBuckets : DEFAULT_BUCKETS;
  }, [enabledBuckets]);

  // ============================================================================
  // REDUCE CHOICE FRICTION: Dynamic reordering based on status
  // Overdue/expected items float to top, completed items sink
  // ============================================================================

  // Map bucket type to instance itemType for status lookup
  const bucketToItemType: Record<string, string> = {
    meds: 'medication',
    vitals: 'vitals',
    meals: 'nutrition',
    mood: 'mood',
    sleep: 'sleep',
    water: 'hydration',
    symptoms: 'symptoms',
    activity: 'activity',
    appointments: 'appointment',
  };

  // Get status for a bucket based on daily instances
  const getBucketStatus = useCallback((bucket: BucketType): 'overdue' | 'pending' | 'complete' | 'none' => {
    if (!dailyState?.instances) return 'none';

    const itemType = bucketToItemType[bucket];
    const bucketInstances = dailyState.instances.filter(i => i.itemType === itemType);

    if (bucketInstances.length === 0) return 'none';

    const now = new Date();
    const hasOverdue = bucketInstances.some(i => {
      if (i.status !== 'pending') return false;
      const scheduled = new Date(i.scheduledTime);
      const graceCutoff = new Date(scheduled.getTime() + 30 * 60 * 1000); // 30 min grace
      return now > graceCutoff;
    });

    if (hasOverdue) return 'overdue';

    const hasPending = bucketInstances.some(i => i.status === 'pending');
    if (hasPending) return 'pending';

    const allComplete = bucketInstances.every(i => i.status === 'completed' || i.status === 'skipped');
    if (allComplete) return 'complete';

    return 'none';
  }, [dailyState?.instances]);

  // Split items into priorities and more, with dynamic reordering
  const { priorityItems, moreItems, allPrioritiesComplete } = useMemo(() => {
    const priority: LogItemData[] = [];
    const more: LogItemData[] = [];

    for (const item of ALL_LOG_ITEMS) {
      if (item.bucket && activeBuckets.includes(item.bucket)) {
        priority.push(item);
      } else if (item.bucket) {
        more.push(item);
      }
    }

    // Dynamic sort: overdue first, then pending, then complete, then by priority
    const statusOrder = { overdue: 0, pending: 1, none: 2, complete: 3 };
    priority.sort((a, b) => {
      const statusA = a.bucket ? getBucketStatus(a.bucket) : 'none';
      const statusB = b.bucket ? getBucketStatus(b.bucket) : 'none';

      // First sort by status
      const statusDiff = statusOrder[statusA] - statusOrder[statusB];
      if (statusDiff !== 0) return statusDiff;

      // Then by priority number
      return a.priority - b.priority;
    });

    more.sort((a, b) => a.priority - b.priority);

    // Check if all priority items are complete
    const allComplete = priority.length > 0 && priority.every(item => {
      if (!item.bucket) return true;
      return getBucketStatus(item.bucket) === 'complete';
    });

    return { priorityItems: priority, moreItems: more, allPrioritiesComplete: allComplete };
  }, [activeBuckets, getBucketStatus]);

  // Calculate pending counts for insight
  const pendingMedCount = useMemo(() => {
    if (!dailyState) return 0;
    return dailyState.instances.filter(
      i => i.itemType === 'medication' && i.status === 'pending'
    ).length;
  }, [dailyState]);

  const pendingVitalsCount = useMemo(() => {
    if (!dailyState) return 0;
    return dailyState.instances.filter(
      i => i.itemType === 'vitals' && i.status === 'pending'
    ).length;
  }, [dailyState]);

  // Generate AI insight
  const insight = useMemo(() => {
    return generateInsight(
      activeBuckets,
      pendingMedCount,
      pendingVitalsCount,
      medications.length > 0,
      dailyState?.stats || null
    );
  }, [activeBuckets, pendingMedCount, pendingVitalsCount, medications.length, dailyState?.stats]);

  const renderLogItem = (item: LogItemData) => {
    const status = item.bucket ? getBucketStatus(item.bucket) : 'none';
    const isComplete = status === 'complete';
    const isOverdue = status === 'overdue';

    // Dynamic hint based on status
    let displayHint = item.hint;
    if (isOverdue) {
      displayHint = 'Needs attention';
    } else if (isComplete) {
      displayHint = 'Done for today';
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.logItem,
          isComplete && styles.logItemComplete,
          isOverdue && styles.logItemOverdue,
        ]}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}. ${displayHint}`}
      >
        <View style={[
          styles.itemIcon,
          isComplete && styles.itemIconComplete,
          isOverdue && styles.itemIconOverdue,
        ]}>
          <Text style={styles.iconEmoji}>{isComplete ? '✓' : item.emoji}</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={[
            styles.itemLabel,
            isComplete && styles.itemLabelComplete,
          ]}>
            {item.label}
          </Text>
          <Text style={[
            styles.itemHint,
            isComplete && styles.itemHintComplete,
            isOverdue && styles.itemHintOverdue,
          ]}>
            {displayHint}
          </Text>
        </View>
        <Text style={[
          styles.itemChevron,
          isComplete && styles.itemChevronComplete,
        ]}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading || configLoading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Record"
          subtitle={MICROCOPY.RECORD_SUBTITLE}
        />

        {/* ============================================================ */}
        {/* CARE PLAN TODAY - Source of truth for what appears below */}
        {/* ============================================================ */}
        <Text style={styles.groupHeader}>CARE PLAN TODAY</Text>
        <TouchableOpacity
          style={styles.carePlanCard}
          onPress={() => router.push('/care-plan' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.carePlanCardLeft}>
            {enabledBuckets.length > 0 ? (
              <View style={styles.carePlanStatus}>
                <View style={styles.bucketIcons}>
                  {enabledBuckets.slice(0, 6).map(bucket => (
                    <Text key={bucket} style={styles.bucketIcon}>
                      {BUCKET_META[bucket].emoji}
                    </Text>
                  ))}
                  {enabledBuckets.length > 6 && (
                    <Text style={styles.bucketIconMore}>+{enabledBuckets.length - 6}</Text>
                  )}
                </View>
                <Text style={styles.carePlanStatusText}>
                  {enabledBuckets.length} {enabledBuckets.length === 1 ? 'category' : 'categories'} enabled
                </Text>
              </View>
            ) : (
              <View style={styles.carePlanStatus}>
                <Text style={styles.carePlanStatusText}>Using default categories</Text>
                <Text style={styles.carePlanHint}>Tap to customize your Care Plan</Text>
              </View>
            )}
          </View>
          <Text style={styles.carePlanGear}>⚙️</Text>
        </TouchableOpacity>

        {/* ============================================================ */}
        {/* AI INSIGHT - Contextual guidance */}
        {/* ============================================================ */}
        <View style={[
          styles.insightCard,
          insight.type === 'success' && styles.insightCardSuccess,
          insight.type === 'action' && styles.insightCardAction,
        ]}>
          <Text style={styles.insightIcon}>{insight.icon}</Text>
          <Text style={[
            styles.insightText,
            insight.type === 'success' && styles.insightTextSuccess,
            insight.type === 'action' && styles.insightTextAction,
          ]}>
            {insight.message}
          </Text>
        </View>

        {/* Setup Warning - meds enabled but none configured */}
        {enabledBuckets.includes('meds') && medications.length === 0 && (
          <TouchableOpacity
            style={styles.setupWarning}
            onPress={() => router.push('/medication-form' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.setupWarningIcon}>💊</Text>
            <View style={styles.setupWarningContent}>
              <Text style={styles.setupWarningText}>Add medications to log doses</Text>
              <Text style={styles.setupWarningHint}>Tap to configure</Text>
            </View>
            <Text style={styles.setupWarningChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* ============================================================ */}
        {/* TODAY'S PRIORITIES - Enabled Care Plan items */}
        {/* ============================================================ */}
        <Text style={styles.groupHeader}>TODAY'S PRIORITIES</Text>

        {/* Show completion message when all priorities are done */}
        {allPrioritiesComplete && (dailyState?.stats?.total ?? 0) > 0 && (
          <View style={styles.allCompleteMessage}>
            <Text style={styles.allCompleteText}>
              Nothing required right now. Optional logs below.
            </Text>
          </View>
        )}

        {priorityItems.map(renderLogItem)}

        {/* ============================================================ */}
        {/* OPTIONAL - Always available */}
        {/* ============================================================ */}
        <Text style={styles.groupHeader}>OPTIONAL</Text>
        {OPTIONAL_ITEMS.map(renderLogItem)}

        {/* ============================================================ */}
        {/* MORE - Non-enabled categories */}
        {/* Show specific names instead of vague count */}
        {/* ============================================================ */}
        {moreItems.length > 0 && (
          <>
            {!showMoreItems ? (
              <TouchableOpacity
                style={styles.moreItemsToggle}
                onPress={() => setShowMoreItems(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.moreItemsLink}>
                  + {(() => {
                    // Show first 2-3 names, then +N for the rest
                    const names = moreItems.map(i => i.label);
                    if (names.length <= 3) {
                      return names.join(', ');
                    }
                    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
                  })()}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.groupHeader}>MORE</Text>
                <Text style={styles.groupSubheader}>
                  Not in your Care Plan, but available for manual logging
                </Text>
                {moreItems.map(renderLogItem)}
                <TouchableOpacity
                  style={styles.moreItemsToggle}
                  onPress={() => setShowMoreItems(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreItemsLink}>− Less</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Encouragement */}
        <View style={styles.encouragement}>
          <Text style={styles.encouragementTitle}>{MICROCOPY.ONE_STEP}</Text>
          <Text style={styles.encouragementSubtitle}>{MICROCOPY.YOU_GOT_THIS}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },

  // Group Headers
  groupHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  groupSubheader: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
    marginTop: -6,
  },

  // Care Plan Card
  carePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  carePlanCardLeft: {
    flex: 1,
  },
  carePlanStatus: {
    gap: 4,
  },
  bucketIcons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  bucketIcon: {
    fontSize: 16,
  },
  bucketIconMore: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 2,
  },
  carePlanStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
  carePlanHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  carePlanGear: {
    fontSize: 20,
    opacity: 0.6,
  },

  // AI Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  insightCardSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  insightCardAction: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  insightIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
  },
  insightTextSuccess: {
    color: 'rgba(34, 197, 94, 0.9)',
  },
  insightTextAction: {
    color: 'rgba(251, 191, 36, 0.9)',
  },

  // Setup Warning
  setupWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  setupWarningIcon: {
    fontSize: 18,
  },
  setupWarningContent: {
    flex: 1,
  },
  setupWarningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FBBF24',
  },
  setupWarningHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  setupWarningChevron: {
    fontSize: 16,
    color: 'rgba(251, 191, 36, 0.6)',
  },

  // Log Items
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
  },
  itemIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  itemChevron: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Status-based item styles
  logItemComplete: {
    opacity: 0.6,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  logItemOverdue: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  itemIconComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  itemIconOverdue: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  itemLabelComplete: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  itemHintComplete: {
    color: 'rgba(16, 185, 129, 0.8)',
  },
  itemHintOverdue: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  itemChevronComplete: {
    color: 'rgba(255, 255, 255, 0.2)',
  },

  // All complete message
  allCompleteMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  allCompleteText: {
    fontSize: 13,
    color: 'rgba(16, 185, 129, 0.9)',
    textAlign: 'center',
  },

  // More Items Toggle
  moreItemsToggle: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  moreItemsLink: {
    color: 'rgba(94, 234, 212, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 20,
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  encouragementSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  },
});
