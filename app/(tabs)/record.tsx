// ============================================================================
// RECORD PAGE - Fast, Personalized Care Logging
// Entry points to log screens. Optimized for speed and muscle memory.
// Prioritizes quick actions and frequently-used categories.
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { MICROCOPY } from '../../constants/microcopy';
import { useDataListener } from '../../lib/events';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useCareTasks } from '../../hooks/useCareTasks';
import { BucketType, BUCKET_META } from '../../types/carePlanConfig';
import { CarePlanTask } from '../../types/carePlanTask';
import { getTodayVitalsLog, getTodayMealsLog, getTodayWaterLog } from '../../utils/centralStorage';

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

interface CategoryStatus {
  logged: number;
  total: number;
  lastLogged?: string; // "5 hours ago"
  percentage?: number; // for water/goals
  detail?: string; // "Breakfast logged"
}

// Storage key for usage frequency tracking
const USAGE_FREQUENCY_KEY = '@embermate_category_usage';

// ============================================================================
// LOG ITEMS - Base definitions
// ============================================================================

const ALL_LOG_ITEMS: LogItemData[] = [
  { id: 'medications', bucket: 'meds', emoji: '💊', label: 'Medications', hint: 'Log doses', route: '/medications', priority: 1 },
  { id: 'vitals', bucket: 'vitals', emoji: '📊', label: 'Vitals', hint: 'Record readings', route: '/log-vitals', priority: 2 },
  { id: 'appointments', bucket: 'appointments', emoji: '📅', label: 'Appointments', hint: 'View & manage', route: '/appointments', priority: 3 },
  { id: 'meals', bucket: 'meals', emoji: '🍽️', label: 'Meals', hint: 'Log food & nutrition', route: '/log-meal', priority: 4 },
  { id: 'water', bucket: 'water', emoji: '💧', label: 'Water', hint: 'Log intake', route: '/log-water', priority: 5 },
  { id: 'mood', bucket: 'mood', emoji: '😊', label: 'Mood', hint: 'Log how they feel', route: '/log-mood', priority: 6 },
  { id: 'sleep', bucket: 'sleep', emoji: '😴', label: 'Sleep', hint: 'Log hours & quality', route: '/log-sleep', priority: 7 },
  { id: 'symptoms', bucket: 'symptoms', emoji: '🩺', label: 'Symptoms', hint: 'Log concerns', route: '/log-symptom', priority: 8 },
  { id: 'activity', bucket: 'activity', emoji: '🚶', label: 'Activity', hint: 'Log movement', route: '/log-activity', priority: 9 },
  { id: 'notes', bucket: null, emoji: '📝', label: 'Notes', hint: 'Add observations', route: '/log-note', priority: 100 },
];

// Default buckets when no Care Plan is configured
const DEFAULT_BUCKETS: BucketType[] = ['meds', 'vitals', 'appointments', 'meals', 'water'];

// ============================================================================
// USAGE FREQUENCY TRACKING
// ============================================================================

async function getUsageFrequency(): Promise<Record<string, number>> {
  try {
    const stored = await AsyncStorage.getItem(USAGE_FREQUENCY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function recordCategoryUsage(categoryId: string): Promise<void> {
  try {
    const frequency = await getUsageFrequency();
    frequency[categoryId] = (frequency[categoryId] || 0) + 1;
    await AsyncStorage.setItem(USAGE_FREQUENCY_KEY, JSON.stringify(frequency));
  } catch (error) {
    console.error('Error recording category usage:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  return 'Yesterday';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecordTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [showOptionalLogs, setShowOptionalLogs] = useState(false);

  // Care Plan Config
  const { enabledBuckets, loading: configLoading } = useCarePlanConfig();

  // useCareTasks - Single source of truth for task stats
  const { state: careTasksState } = useCareTasks();

  // Usage frequency for personalized ordering
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({});

  // Category status for context
  const [categoryStatus, setCategoryStatus] = useState<Record<string, CategoryStatus>>({});

  // Last action bar
  const [lastAction, setLastAction] = useState<{ label: string; timeAgo: string } | null>(null);
  const [lastActionDismissed, setLastActionDismissed] = useState(false);

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
      setShowOptionalLogs(true);
    }
  }, [params.expandSection]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load usage frequency
      const frequency = await getUsageFrequency();
      setUsageFrequency(frequency);

      // Load category status
      await loadCategoryStatus();
    } catch (error) {
      console.error('Error loading Record data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStatus = async () => {
    const status: Record<string, CategoryStatus> = {};

    try {
      // Vitals status
      const vitals = await getTodayVitalsLog();
      if (vitals) {
        let logged = 0;
        if (vitals.systolic) logged++;
        if (vitals.heartRate) logged++;
        if (vitals.temperature) logged++;
        if (vitals.weight) logged++;
        status['vitals'] = {
          logged,
          total: 4,
          lastLogged: vitals.timestamp ? getTimeAgo(new Date(vitals.timestamp)) : undefined,
        };
      }

      // Water status (default goal of 8 glasses)
      const water = await getTodayWaterLog();
      if (water && water.glasses !== undefined) {
        const dailyGoal = 8; // Default daily water goal
        status['water'] = {
          logged: water.glasses,
          total: dailyGoal,
          percentage: Math.round((water.glasses / dailyGoal) * 100),
        };
      }

      // Meals status
      const meals = await getTodayMealsLog();
      if (meals && meals.meals) {
        const mealTypes = meals.meals.map((m: any) => m.mealType);
        let detail = '';
        if (mealTypes.includes('breakfast')) detail = 'Breakfast';
        if (mealTypes.includes('lunch')) detail = detail ? `${detail}, lunch` : 'Lunch';
        if (mealTypes.includes('dinner')) detail = detail ? `${detail}, dinner` : 'Dinner';
        if (detail) detail += ' logged';

        status['meals'] = {
          logged: meals.meals.length,
          total: 3,
          detail: detail || undefined,
        };
      }
    } catch (error) {
      console.error('Error loading category status:', error);
    }

    setCategoryStatus(status);

    // Compute last action from most recent timestamp
    if (status['vitals']?.lastLogged) {
      setLastAction({ label: 'Logged Vitals', timeAgo: status['vitals'].lastLogged });
      setLastActionDismissed(false);
    } else {
      setLastAction(null);
    }
  };

  // Determine which buckets to use (enabled or default)
  const activeBuckets = useMemo(() => {
    return enabledBuckets.length > 0 ? enabledBuckets : DEFAULT_BUCKETS;
  }, [enabledBuckets]);

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

  // Get status for a bucket based on useCareTasks (Single Source of Truth)
  // Uses CarePlanTask model which has pre-computed isOverdue flag
  const getBucketStatus = useCallback((bucket: BucketType): 'overdue' | 'pending' | 'complete' | 'none' => {
    // Prefer useCareTasks as single source of truth
    if (!careTasksState?.tasks) return 'none';

    const itemType = bucketToItemType[bucket];
    const bucketTasks = careTasksState.tasks.filter((t: CarePlanTask) => t.type === itemType);

    if (bucketTasks.length === 0) return 'none';

    // isOverdue is pre-computed by taskTransform utility
    const hasOverdue = bucketTasks.some((t: CarePlanTask) => t.isOverdue);
    if (hasOverdue) return 'overdue';

    const hasPending = bucketTasks.some((t: CarePlanTask) => t.status === 'pending');
    if (hasPending) return 'pending';

    const allComplete = bucketTasks.every((t: CarePlanTask) =>
      t.status === 'completed' || t.status === 'skipped'
    );
    if (allComplete) return 'complete';

    return 'none';
  }, [careTasksState?.tasks]);

  // Get task counts for a bucket from useCareTasks (Single Source of Truth)
  const getBucketCounts = useCallback((bucket: BucketType): { logged: number; total: number } => {
    // Prefer useCareTasks as single source of truth
    if (!careTasksState?.tasks) return { logged: 0, total: 0 };

    const itemType = bucketToItemType[bucket];
    const bucketTasks = careTasksState.tasks.filter((t: CarePlanTask) => t.type === itemType);

    const total = bucketTasks.length;
    const logged = bucketTasks.filter((t: CarePlanTask) =>
      t.status === 'completed' || t.status === 'skipped'
    ).length;

    return { logged, total };
  }, [careTasksState?.tasks]);

  // ============================================================================
  // SORT BY USAGE FREQUENCY
  // ============================================================================

  const { mainCategories, optionalCategories, allComplete } = useMemo(() => {
    const main: LogItemData[] = [];
    const optional: LogItemData[] = [];

    for (const item of ALL_LOG_ITEMS) {
      // Notes always goes to optional
      if (item.id === 'notes') {
        optional.push(item);
        continue;
      }

      if (item.bucket && activeBuckets.includes(item.bucket)) {
        main.push(item);
      } else if (item.bucket) {
        optional.push(item);
      }
    }

    // Sort main categories by usage frequency (most used first)
    // Fall back to default priority if no usage data
    main.sort((a, b) => {
      const usageA = usageFrequency[a.id] || 0;
      const usageB = usageFrequency[b.id] || 0;

      // If both have usage data, sort by usage (higher first)
      if (usageA > 0 || usageB > 0) {
        return usageB - usageA;
      }

      // Fall back to default priority
      return a.priority - b.priority;
    });

    // Check if all main categories are complete
    const complete = main.length > 0 && main.every(item => {
      if (!item.bucket) return true;
      return getBucketStatus(item.bucket) === 'complete';
    });

    return { mainCategories: main, optionalCategories: optional, allComplete: complete };
  }, [activeBuckets, usageFrequency, getBucketStatus]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const handleCategoryPress = useCallback((item: LogItemData) => {
    recordCategoryUsage(item.id);
    router.push(item.route as any);
  }, [router]);

  const getStatusInfo = (item: LogItemData): { text: string; isRecent?: boolean } | null => {
    if (!item.bucket) return null;

    const status = getBucketStatus(item.bucket);
    const counts = getBucketCounts(item.bucket);
    const catStatus = categoryStatus[item.bucket];

    // Medication status
    if (item.bucket === 'meds' && counts.total > 0) {
      if (status === 'complete') return { text: `✓ All ${counts.total} logged today` };
      return { text: `${counts.logged} of ${counts.total} logged today` };
    }

    // Vitals status
    if (item.bucket === 'vitals') {
      if (catStatus?.lastLogged) {
        return { text: `Last logged ${catStatus.lastLogged}`, isRecent: true };
      }
      if (counts.total > 0) {
        return { text: `${counts.logged} of ${counts.total} logged today` };
      }
    }

    // Water status
    if (item.bucket === 'water' && catStatus?.percentage !== undefined) {
      return { text: `${catStatus.percentage}% of daily goal` };
    }

    // Meals status
    if (item.bucket === 'meals') {
      if (catStatus?.detail) {
        return { text: catStatus.detail };
      }
      if (counts.total > 0) {
        return { text: `${counts.logged} of ${counts.total} logged today` };
      }
    }

    // Generic status based on instances
    if (counts.total > 0) {
      if (status === 'complete') return { text: '✓ Done for today' };
      return { text: `${counts.logged} of ${counts.total} logged` };
    }

    return null;
  };

  const renderCategoryCard = (item: LogItemData, isOptional: boolean = false) => {
    const status = item.bucket ? getBucketStatus(item.bucket) : 'none';
    const isComplete = status === 'complete';
    const isOverdue = status === 'overdue';
    const isPending = status === 'pending';
    const statusInfo = getStatusInfo(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.categoryCard,
          isComplete && styles.categoryCardComplete,
          (isOverdue || isPending) && styles.categoryCardOverdue,
          isOptional && styles.categoryCardOptional,
        ]}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}. ${statusInfo?.text || item.hint}`}
      >
        <View style={[
          styles.categoryIcon,
          isComplete && styles.categoryIconComplete,
          (isOverdue || isPending) && styles.categoryIconOverdue,
        ]}>
          <Text style={styles.categoryEmoji}>{isComplete ? '✓' : item.emoji}</Text>
        </View>
        <View style={styles.categoryContent}>
          <Text style={[
            styles.categoryLabel,
            isComplete && styles.categoryLabelComplete,
          ]}>
            {item.label}
          </Text>
          {statusInfo ? (
            <Text style={[
              styles.categoryStatus,
              isComplete && styles.categoryStatusComplete,
              (isOverdue || isPending) && styles.categoryStatusOverdue,
              statusInfo.isRecent && styles.categoryStatusRecent,
            ]}>
              {statusInfo.text}
            </Text>
          ) : (
            <Text style={styles.categoryHint}>{item.hint}</Text>
          )}
        </View>
        <Text style={[
          styles.categoryChevron,
          isComplete && styles.categoryChevronComplete,
        ]}>›</Text>
      </TouchableOpacity>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
          rightAction={
            <TouchableOpacity
              onPress={() => router.push('/care-plan' as any)}
              style={styles.headerGear}
              accessibilityLabel="Manage Care Plan"
            >
              <Text style={styles.headerGearIcon}>⚙️</Text>
            </TouchableOpacity>
          }
        />

        {/* ============================================================ */}
        {/* LAST ACTION BAR */}
        {/* ============================================================ */}
        {lastAction && !lastActionDismissed && (
          <View style={styles.lastActionBar}>
            <Text style={styles.lastActionText}>
              Last action: {lastAction.label} {lastAction.timeAgo}
            </Text>
            <TouchableOpacity
              onPress={() => setLastActionDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.lastActionDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* MICRO COMPLETION FEEDBACK */}
        {/* ============================================================ */}
        {allComplete && (careTasksState?.stats?.total ?? 0) > 0 && (
          <View style={styles.completionFeedback}>
            <Text style={styles.completionEmoji}>✓</Text>
            <Text style={styles.completionText}>
              All scheduled items logged for today.
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* MAIN CATEGORIES - Sorted by usage frequency */}
        {/* ============================================================ */}
        <View style={styles.categoriesSection}>
          {mainCategories.map(item => renderCategoryCard(item))}
        </View>

        {/* ============================================================ */}
        {/* OPTIONAL LOGS - Expandable, visible cluster */}
        {/* ============================================================ */}
        <View style={styles.optionalSection}>
          <TouchableOpacity
            style={styles.optionalHeader}
            onPress={() => setShowOptionalLogs(!showOptionalLogs)}
            activeOpacity={0.7}
          >
            <View style={styles.optionalHeaderLeft}>
              <Text style={styles.optionalTitle}>Optional Logs</Text>
              <Text style={styles.optionalCount}>
                {optionalCategories.length} available
              </Text>
            </View>
            <Text style={styles.optionalChevron}>
              {showOptionalLogs ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showOptionalLogs && (
            <View style={styles.optionalContent}>
              {optionalCategories.map(item => renderCategoryCard(item, true))}
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* FOOTER - Manage Care Plan link */}
        {/* ============================================================ */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.manageLink}
            onPress={() => router.push('/care-plan' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.manageLinkText}>Manage Care Plan</Text>
          </TouchableOpacity>
        </View>

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

  // Header Gear
  headerGear: {
    padding: 8,
    marginRight: -8,
  },
  headerGearIcon: {
    fontSize: 20,
    opacity: 0.7,
  },

  // Last Action Bar
  lastActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  lastActionText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    flex: 1,
  },
  lastActionDismiss: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.35)',
    paddingLeft: 12,
  },

  // Completion Feedback
  completionFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  completionEmoji: {
    fontSize: 18,
    color: '#10B981',
  },
  completionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },

  // Categories Section
  categoriesSection: {
    marginBottom: 16,
  },

  // Category Card
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
  },
  categoryCardComplete: {
    opacity: 0.7,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  categoryCardOverdue: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  categoryCardOptional: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  categoryIconOverdue: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  categoryLabelComplete: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  categoryHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  categoryStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  categoryStatusComplete: {
    color: 'rgba(16, 185, 129, 0.9)',
  },
  categoryStatusOverdue: {
    color: '#F59E0B',
  },
  categoryStatusRecent: {
    color: '#14B8A6',
  },
  categoryChevron: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  categoryChevronComplete: {
    color: 'rgba(255, 255, 255, 0.2)',
  },

  // Optional Section
  optionalSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
  },
  optionalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionalCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  optionalChevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  optionalContent: {
    marginTop: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  manageLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
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
