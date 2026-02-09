// ============================================================================
// BUCKET CARE PLAN PANEL
// Unified panel showing items from ALL enabled buckets grouped by time-of-day
// Replaces meds-only panels when multiple buckets are enabled
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import {
  BucketType,
  BUCKET_META,
  TimeOfDay,
  TIME_OF_DAY_DEFAULTS,
  WaterBucketConfig,
  VitalsBucketConfig,
  MealsBucketConfig,
  MedsBucketConfig,
  generateWaterReminderTimes,
  formatTimeForDisplay,
} from '../../types/carePlanConfig';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleItem {
  id: string;
  bucket: BucketType;
  label: string;
  emoji: string;
  time: string; // HH:mm
  timeDisplay: string;
  timeOfDay: TimeOfDay;
  route: string;
  routeParams?: Record<string, string>;
  status: 'pending' | 'done' | 'partial';
  statusText: string;
  // For medications: link to instance
  instanceId?: string;
  medicationId?: string;
}

interface TimeGroup {
  timeOfDay: TimeOfDay;
  displayName: string;
  emoji: string;
  items: ScheduleItem[];
  completedCount: number;
  totalCount: number;
}

interface BucketCarePlanPanelProps {
  // Props can be extended as needed
}

// ============================================================================
// HELPERS
// ============================================================================

const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { displayName: string; emoji: string; order: number }> = {
  morning: { displayName: 'Morning', emoji: '🌅', order: 0 },
  midday: { displayName: 'Midday', emoji: '☀️', order: 1 },
  evening: { displayName: 'Evening', emoji: '🌆', order: 2 },
  night: { displayName: 'Night', emoji: '🌙', order: 3 },
  custom: { displayName: 'Other', emoji: '📋', order: 4 },
};

function getTimeOfDayFromHHmm(time: string): TimeOfDay {
  const [hours] = time.split(':').map(Number);
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'midday';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Bucket config routes
const BUCKET_CONFIG_ROUTES: Record<BucketType, string> = {
  meds: '/medication-form',
  vitals: '/care-plan/vitals',
  meals: '/care-plan/meals',
  water: '/care-plan/water',
  sleep: '/care-plan/sleep',
  activity: '/care-plan/activity',
  wellness: '/log-morning-wellness',
  appointments: '/appointments',
};

// Placeholder config for unconfigured buckets
interface BucketPlaceholder {
  bucket: BucketType;
  title: string;
  subtitle: string;
  emoji: string;
  route: string;
}

export function BucketCarePlanPanel(_props: BucketCarePlanPanelProps) {
  const router = useRouter();
  const { config, enabledBuckets, loading: configLoading } = useCarePlanConfig();
  const { state: instancesState, loading: instancesLoading } = useDailyCareInstances();

  const [expandedGroups, setExpandedGroups] = useState<Set<TimeOfDay>>(new Set(['morning', 'midday', 'evening']));

  // DEBUG: Log enabled buckets on render
  if (__DEV__) {
    console.log('[BucketCarePlanPanel] enabledBuckets:', enabledBuckets);
    console.log('[BucketCarePlanPanel] config:', config ? Object.keys(config) : 'null');
  }

  // Generate schedule items from all enabled buckets
  const { scheduleItems, timeGroups, stats, bucketsWithItems, placeholders } = useMemo(() => {
    if (!config || configLoading) {
      return { scheduleItems: [], timeGroups: [], stats: { total: 0, done: 0 }, bucketsWithItems: new Set<BucketType>(), placeholders: [] };
    }

    const items: ScheduleItem[] = [];
    const today = new Date().toISOString().split('T')[0];
    const bucketsWithItemsSet = new Set<BucketType>();

    // 1. MEDICATIONS - Use regimen instances if available, otherwise from config
    if (enabledBuckets.includes('meds')) {
      const medsConfig = config.meds as MedsBucketConfig;
      let addedMedItems = false;

      if (instancesState && instancesState.instances.length > 0) {
        // Use regimen-based instances
        const medInstances = instancesState.instances.filter(i => i.itemType === 'medication');
        for (const instance of medInstances) {
          const timeOfDay = getTimeOfDayFromHHmm(instance.scheduledTime.split('T')[1]?.substring(0, 5) || '08:00');
          items.push({
            id: `med-${instance.id}`,
            bucket: 'meds',
            label: instance.itemName,
            emoji: instance.itemEmoji || '💊',
            time: instance.scheduledTime,
            timeDisplay: formatTimeForDisplay(instance.scheduledTime),
            timeOfDay,
            route: '/log-medication-plan-item',
            routeParams: {
              medicationId: instance.carePlanItemId,
              instanceId: instance.id,
              scheduledTime: instance.scheduledTime,
              itemName: instance.itemName,
              itemDosage: instance.itemDosage || '',
            },
            status: instance.status === 'completed' ? 'done' : 'pending',
            statusText: instance.status === 'completed' ? '✓ Taken' : 'Tap to log',
            instanceId: instance.id,
            medicationId: instance.carePlanItemId,
          });
          addedMedItems = true;
        }
      } else if (medsConfig?.medications && medsConfig.medications.length > 0) {
        // Fallback to config-based meds (no regimen instances)
        for (const med of medsConfig.medications.filter(m => m.active)) {
          for (const tod of med.timesOfDay || ['morning']) {
            const time = med.scheduledTimeHHmm || TIME_OF_DAY_DEFAULTS[tod] || '08:00';
            items.push({
              id: `med-${med.id}-${tod}`,
              bucket: 'meds',
              label: `${med.name} ${med.dosage}`,
              emoji: '💊',
              time,
              timeDisplay: formatTimeForDisplay(time),
              timeOfDay: tod,
              route: '/medication-confirm',
              routeParams: { medicationId: med.id },
              status: 'pending', // Would need log lookup for actual status
              statusText: 'Tap to log',
              medicationId: med.id,
            });
            addedMedItems = true;
          }
        }
      }
      if (addedMedItems) bucketsWithItemsSet.add('meds');
    }

    // 2. VITALS - Generate prompts based on timesOfDay
    if (enabledBuckets.includes('vitals')) {
      const vitalsConfig = config.vitals as VitalsBucketConfig;
      const times = vitalsConfig?.timesOfDay;
      const vitalTypes = vitalsConfig?.vitalTypes;

      // Only add items if vitals is configured (has times or types set)
      if (times && times.length > 0 && vitalTypes && vitalTypes.length > 0) {
        for (const tod of times) {
          const time = TIME_OF_DAY_DEFAULTS[tod] || '08:00';
          items.push({
            id: `vitals-${tod}`,
            bucket: 'vitals',
            label: `Check vitals (${vitalTypes.map(v => v.toUpperCase()).join(', ')})`,
            emoji: '📊',
            time,
            timeDisplay: formatTimeForDisplay(time),
            timeOfDay: tod,
            route: '/log-vitals',
            routeParams: { preselectedTypes: vitalTypes.join(',') },
            status: 'pending',
            statusText: 'Tap to log',
          });
        }
        bucketsWithItemsSet.add('vitals');
      }
    }

    // 3. MEALS - Generate prompts for each meal time
    if (enabledBuckets.includes('meals')) {
      const mealsConfig = config.meals as MealsBucketConfig;
      const mealTimes = mealsConfig?.timesOfDay;

      const mealNames: Record<TimeOfDay, string> = {
        morning: 'Breakfast',
        midday: 'Lunch',
        evening: 'Dinner',
        night: 'Snack',
        custom: 'Meal',
      };

      // Only add items if meals is configured (has times set)
      if (mealTimes && mealTimes.length > 0) {
        for (const tod of mealTimes) {
          const time = TIME_OF_DAY_DEFAULTS[tod] || '12:00';
          items.push({
            id: `meal-${tod}`,
            bucket: 'meals',
            label: mealNames[tod] || 'Meal',
            emoji: '🍽️',
            time,
            timeDisplay: formatTimeForDisplay(time),
            timeOfDay: tod,
            route: '/log-meal',
            routeParams: { mealType: tod },
            status: 'pending',
            statusText: 'Tap to log',
          });
        }
        bucketsWithItemsSet.add('meals');
      }
    }

    // 4. WATER - Generate prompts based on reminder frequency
    if (enabledBuckets.includes('water')) {
      const waterConfig = config.water as WaterBucketConfig;
      const frequency = waterConfig?.reminderFrequency || 'none';
      const dailyGoal = waterConfig?.dailyGoalGlasses;
      const reminderTimes = generateWaterReminderTimes(frequency, waterConfig?.reminderTimes);

      // Only show items if water has a daily goal set (considered "configured")
      if (dailyGoal && dailyGoal > 0) {
        if (reminderTimes.length > 0) {
          for (const time of reminderTimes) {
            const tod = getTimeOfDayFromHHmm(time);
            items.push({
              id: `water-${time}`,
              bucket: 'water',
              label: 'Drink water',
              emoji: '💧',
              time,
              timeDisplay: formatTimeForDisplay(time),
              timeOfDay: tod,
              route: '/log-water',
              routeParams: { quickLog: 'true' },
              status: 'pending',
              statusText: `Goal: ${dailyGoal} ${waterConfig?.units || 'glasses'}`,
            });
          }
        } else {
          // Show single water entry if no reminders but goal is set
          items.push({
            id: 'water-daily',
            bucket: 'water',
            label: 'Water intake',
            emoji: '💧',
            time: '12:00',
            timeDisplay: 'Anytime',
            timeOfDay: 'midday',
            route: '/log-water',
            status: 'pending',
            statusText: `Goal: ${dailyGoal} ${waterConfig?.units || 'glasses'}`,
          });
        }
        bucketsWithItemsSet.add('water');
      }
    }

    // 5. Generate placeholders for enabled buckets that have no items
    const placeholdersList: BucketPlaceholder[] = [];
    for (const bucket of enabledBuckets) {
      if (!bucketsWithItemsSet.has(bucket)) {
        const meta = BUCKET_META[bucket];
        placeholdersList.push({
          bucket,
          title: `Set up ${meta.name}`,
          subtitle: 'Not configured yet',
          emoji: meta.emoji,
          route: BUCKET_CONFIG_ROUTES[bucket],
        });
      }
    }

    // Sort items by time
    items.sort((a, b) => a.time.localeCompare(b.time));

    // Group by time of day
    const groupsMap = new Map<TimeOfDay, ScheduleItem[]>();
    for (const item of items) {
      const existing = groupsMap.get(item.timeOfDay) || [];
      existing.push(item);
      groupsMap.set(item.timeOfDay, existing);
    }

    // Convert to array and sort by time of day order
    const groups: TimeGroup[] = Array.from(groupsMap.entries())
      .map(([tod, groupItems]) => ({
        timeOfDay: tod,
        displayName: TIME_OF_DAY_CONFIG[tod].displayName,
        emoji: TIME_OF_DAY_CONFIG[tod].emoji,
        items: groupItems,
        completedCount: groupItems.filter(i => i.status === 'done').length,
        totalCount: groupItems.length,
      }))
      .sort((a, b) => TIME_OF_DAY_CONFIG[a.timeOfDay].order - TIME_OF_DAY_CONFIG[b.timeOfDay].order);

    const totalDone = items.filter(i => i.status === 'done').length;

    return {
      scheduleItems: items,
      timeGroups: groups,
      stats: { total: items.length, done: totalDone },
      bucketsWithItems: bucketsWithItemsSet,
      placeholders: placeholdersList,
    };
  }, [config, configLoading, enabledBuckets, instancesState]);

  const toggleGroup = (tod: TimeOfDay) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tod)) {
        next.delete(tod);
      } else {
        next.add(tod);
      }
      return next;
    });
  };

  const handleItemPress = (item: ScheduleItem) => {
    if (item.routeParams) {
      router.push({ pathname: item.route as any, params: item.routeParams });
    } else {
      router.push(item.route as any);
    }
  };

  // Empty state - only if no buckets enabled at all
  if (!configLoading && enabledBuckets.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>No Care Plan set up</Text>
        <Text style={styles.emptySubtitle}>
          Enable tracking categories to see your daily schedule
        </Text>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => router.push('/care-plan' as any)}
        >
          <Text style={styles.setupButtonText}>Set up Care Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Care Plan</Text>
          <Text style={styles.subtitle}>
            {stats.total > 0 ? `${stats.done}/${stats.total} completed` : 'Configure your buckets below'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/care-plan' as any)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enabled Buckets Strip */}
      <View style={styles.bucketChipsContainer}>
        {enabledBuckets.map(bucket => {
          const meta = BUCKET_META[bucket];
          const hasItems = bucketsWithItems.has(bucket);
          return (
            <TouchableOpacity
              key={bucket}
              style={[styles.bucketChip, hasItems && styles.bucketChipConfigured]}
              onPress={() => router.push(BUCKET_CONFIG_ROUTES[bucket] as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.bucketChipEmoji}>{meta.emoji}</Text>
              {!hasItems && <Text style={styles.bucketChipBadge}>!</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Groups */}
      {timeGroups.map(group => (
        <View key={group.timeOfDay} style={styles.groupSection}>
          {/* Group Header */}
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggleGroup(group.timeOfDay)}
            activeOpacity={0.7}
          >
            <View style={styles.groupHeaderLeft}>
              <Text style={styles.groupEmoji}>{group.emoji}</Text>
              <View>
                <Text style={styles.groupName}>{group.displayName}</Text>
                <Text style={styles.groupProgress}>
                  {group.completedCount}/{group.totalCount} items
                </Text>
              </View>
            </View>
            <Text style={styles.expandIcon}>
              {expandedGroups.has(group.timeOfDay) ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Items */}
          {expandedGroups.has(group.timeOfDay) && (
            <View style={styles.itemsList}>
              {group.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, item.status === 'done' && styles.itemRowDone]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, item.status === 'done' && styles.itemLabelDone]}>
                        {item.label}
                      </Text>
                      <Text style={styles.itemTime}>{item.timeDisplay}</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemStatus, item.status === 'done' && styles.itemStatusDone]}>
                      {item.statusText}
                    </Text>
                    <Text style={styles.itemChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Placeholders for unconfigured buckets */}
      {placeholders.length > 0 && (
        <View style={styles.placeholdersSection}>
          <Text style={styles.placeholdersHeader}>NEEDS SETUP</Text>
          {placeholders.map(placeholder => (
            <TouchableOpacity
              key={placeholder.bucket}
              style={styles.placeholderRow}
              onPress={() => router.push(placeholder.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.placeholderLeft}>
                <Text style={styles.placeholderEmoji}>{placeholder.emoji}</Text>
                <View style={styles.placeholderContent}>
                  <Text style={styles.placeholderTitle}>{placeholder.title}</Text>
                  <Text style={styles.placeholderSubtitle}>{placeholder.subtitle}</Text>
                </View>
              </View>
              <View style={styles.placeholderRight}>
                <Text style={styles.placeholderTime}>Anytime</Text>
                <Text style={styles.placeholderCta}>Configure ›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* All Complete */}
      {stats.done === stats.total && stats.total > 0 && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeText}>All done for today!</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(94, 234, 212, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  // Empty State
  emptyPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  setupButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  configureButton: {
    paddingVertical: 8,
  },
  configureButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustTodayButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  adjustTodayText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 18,
    opacity: 0.6,
  },

  // Group Section
  groupSection: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupEmoji: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupProgress: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Items List
  itemsList: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemRowDone: {
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  itemLabelDone: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  itemTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemStatus: {
    fontSize: 11,
    color: 'rgba(94, 234, 212, 0.8)',
  },
  itemStatusDone: {
    color: '#10B981',
  },
  itemChevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Bucket Chips Strip
  bucketChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  bucketChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bucketChipConfigured: {
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    borderColor: 'rgba(94, 234, 212, 0.3)',
  },
  bucketChipEmoji: {
    fontSize: 16,
  },
  bucketChipBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
    overflow: 'hidden',
  },

  // Placeholders Section
  placeholdersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  placeholdersHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  placeholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 10,
    marginBottom: 8,
  },
  placeholderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  placeholderEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  placeholderContent: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  placeholderSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  placeholderRight: {
    alignItems: 'flex-end',
  },
  placeholderTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  placeholderCta: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },

  // Complete Message
  completeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  completeEmoji: {
    fontSize: 20,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
});

export default BucketCarePlanPanel;
