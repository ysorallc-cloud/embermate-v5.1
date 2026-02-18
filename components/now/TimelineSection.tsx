// ============================================================================
// TIMELINE SECTION - Two modes:
// A) Category expanded: inline items with Log buttons (when ring tapped)
// B) Flat "Coming Up" chronological list (default, no ring selected)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import {
  parseTimeForDisplay,
  isOverdue,
  groupByTimeWindow,
  getCurrentTimeWindow,
  type TodayStats,
  type StatData,
  type TimeWindow,
} from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel, getTimeDeltaString } from '../../utils/urgency';
import { Colors } from '../../theme/theme-tokens';
import type { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET → ITEM TYPE MAPPING
// ============================================================================

const BUCKET_TO_ITEM_TYPE: Record<string, string> = {
  meds: 'medication',
  vitals: 'vitals',
  meals: 'nutrition',
  water: 'hydration',
  sleep: 'sleep',
  activity: 'activity',
  wellness: 'wellness',
};

const ITEM_TYPE_TO_LABEL: Record<string, string> = {
  medication: 'Meds',
  vitals: 'Vitals',
  nutrition: 'Meals',
  hydration: 'Water',
  sleep: 'Sleep',
  activity: 'Activity',
  wellness: 'Wellness',
};

const BUCKET_TO_ICON: Record<string, string> = {
  meds: '\uD83D\uDC8A',
  vitals: '\uD83D\uDCCA',
  meals: '\uD83C\uDF7D\uFE0F',
  water: '\uD83D\uDCA7',
  sleep: '\uD83D\uDE34',
  activity: '\uD83D\uDEB6',
  wellness: '\uD83C\uDF05',
};

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const TIME_WINDOW_ICONS: Record<TimeWindow, string> = {
  morning: '\u2600\uFE0F',
  afternoon: '\u26C5',
  evening: '\uD83C\uDF05',
  night: '\uD83C\uDF19',
};

// ============================================================================
// PROPS
// ============================================================================

interface TimelineSectionProps {
  allPending: any[];
  completed: any[];
  hasRegimenInstances: boolean;
  selectedCategory: BucketType | null;
  onClearCategory: () => void;
  onItemPress: (instance: any) => void;
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TimelineSection({
  allPending,
  completed,
  hasRegimenInstances,
  selectedCategory,
  onClearCategory,
  onItemPress,
  todayStats,
  enabledBuckets,
}: TimelineSectionProps) {
  const router = useRouter();

  if (!hasRegimenInstances) return null;
  if (allPending.length === 0 && completed.length === 0) return null;

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================

  if (selectedCategory !== null) {
    const itemType = BUCKET_TO_ITEM_TYPE[selectedCategory] || selectedCategory;
    const icon = BUCKET_TO_ICON[selectedCategory] || '\uD83D\uDD14';
    const label = ITEM_TYPE_TO_LABEL[itemType] || selectedCategory;

    // Get stat key for this bucket
    const statKey = selectedCategory as keyof TodayStats;
    const stat: StatData = todayStats[statKey] ?? { completed: 0, total: 0 };

    // Filter pending items for this category
    const categoryPending = allPending.filter(i => i.itemType === itemType);
    const categoryCompleted = completed.filter(i => i.itemType === itemType);
    const hasOverdueItems = categoryPending.some(i => isOverdue(i.scheduledTime));

    return (
      <>
        {/* Category expanded container */}
        <View style={[
          styles.categoryContainer,
          hasOverdueItems ? styles.categoryContainerOverdue : styles.categoryContainerDefault,
        ]}>
          {/* Header row */}
          <View style={styles.categoryHeader}>
            <View style={styles.categoryHeaderLeft}>
              <Text style={styles.categoryIcon}>{icon}</Text>
              <Text style={styles.categoryLabel}>{label}</Text>
              <Text style={styles.categoryCount}>{stat.completed}/{stat.total}</Text>
            </View>
            <TouchableOpacity
              onPress={onClearCategory}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={`Close ${label} details`}
              accessibilityRole="button"
            >
              <Text style={styles.categoryClose}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Pending items with Log buttons */}
          {categoryPending.length === 0 && categoryCompleted.length === 0 && (
            <Text style={styles.categoryEmptyText}>No items for {label} today</Text>
          )}

          {categoryPending.map((instance) => {
            const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
            const itemIsOverdue = isOverdue(instance.scheduledTime);
            const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

            const statusLabel = urgencyInfo.itemUrgency
              ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
              : urgencyInfo.label;

            const timeDelta = urgencyInfo.itemUrgency
              ? getTimeDeltaString(urgencyInfo.itemUrgency)
              : null;

            return (
              <View key={instance.id} style={styles.categoryItemRow}>
                <View style={[
                  styles.statusCircle,
                  itemIsOverdue ? styles.statusCircleOverdue : styles.statusCirclePending,
                ]}>
                  <Text style={styles.statusCircleText}>
                    {itemIsOverdue ? '!' : '\u25CB'}
                  </Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemName}>{instance.itemName}</Text>
                  <Text style={[
                    styles.categoryItemTime,
                    itemIsOverdue && styles.categoryItemTimeOverdue,
                  ]}>
                    {timeDisplay ? `${timeDisplay} \u00B7 ${statusLabel}` : statusLabel}
                    {timeDelta ? ` \u00B7 ${timeDelta}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.logButton,
                    itemIsOverdue && styles.logButtonOverdue,
                  ]}
                  onPress={() => onItemPress(instance)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Log ${instance.itemName}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.logButtonText}>Log</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Completed items for this category */}
          {categoryCompleted.map((instance) => {
            const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
            const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';

            return (
              <View key={instance.id} style={styles.categoryItemRow}>
                <View style={[styles.statusCircle, styles.statusCircleDone]}>
                  <Text style={styles.statusCircleDoneText}>{'\u2713'}</Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemNameDone}>{instance.itemName}</Text>
                  <Text style={styles.categoryItemTimeDone}>
                    {timeDisplay ? `${timeDisplay} \u00B7 ${statusText}` : statusText}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Completed section at bottom (other categories) */}
        {renderCompletedSection(completed.filter(i => i.itemType !== itemType))}
      </>
    );
  }

  // ============================================================================
  // MODE B — Time-Grouped "Coming Up" List
  // ============================================================================

  const grouped = groupByTimeWindow(allPending);
  const currentWindow = getCurrentTimeWindow();
  const windowOrder: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <>
      {/* Timeline header */}
      <View style={styles.timelineSectionHeader}>
        <Text style={styles.sectionTitle}>COMING UP</Text>
        <TouchableOpacity
          onPress={() => navigate('/today-scope')}
          activeOpacity={0.7}
          accessibilityLabel="Adjust today's plan"
          accessibilityRole="link"
        >
          <Text style={styles.adjustTodayLink}>Adjust Today</Text>
        </TouchableOpacity>
      </View>

      {/* Time-grouped list */}
      {windowOrder.map((window) => {
        const items = grouped[window];
        if (items.length === 0) return null;

        const isCurrent = window === currentWindow;

        return (
          <View key={window} style={styles.timeGroup}>
            {/* Time window header */}
            <View style={[
              styles.timeGroupHeader,
              isCurrent && styles.timeGroupHeaderCurrent,
            ]}>
              <Text style={styles.timeGroupIcon}>{TIME_WINDOW_ICONS[window]}</Text>
              <Text style={[
                styles.timeGroupTitle,
                isCurrent && styles.timeGroupTitleCurrent,
              ]}>
                {TIME_WINDOW_LABELS[window]}
              </Text>
              <Text style={styles.timeGroupCount}>{items.length}</Text>
            </View>

            {/* Items in this time window */}
            {items.map((instance, index) => {
              const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
              const itemIsOverdue = isOverdue(instance.scheduledTime);
              const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

              const timeColor = itemIsOverdue && urgencyInfo.tone === 'danger'
                ? Colors.red
                : itemIsOverdue
                ? Colors.amber
                : Colors.textMuted;

              return (
                <TouchableOpacity
                  key={instance.id}
                  style={[
                    styles.flatItem,
                    index < items.length - 1 && styles.flatItemBorder,
                  ]}
                  onPress={() => onItemPress(instance)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${instance.itemName}, ${timeDisplay || urgencyInfo.label}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.flatItemEmoji}>{instance.itemEmoji || '\uD83D\uDD14'}</Text>
                  <Text style={styles.flatItemName} numberOfLines={1}>{instance.itemName}</Text>
                  <Text style={[styles.flatItemTime, { color: timeColor }]}>
                    {timeDisplay || urgencyInfo.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      {/* Completed section at bottom */}
      {renderCompletedSection(completed)}
    </>
  );
}

// ============================================================================
// SHARED: Completed items section
// ============================================================================

function renderCompletedSection(completedItems: any[]) {
  if (completedItems.length === 0) return null;

  return (
    <View style={styles.completedSection}>
      <Text style={styles.completedHeader}>
        {'\u2713'} Completed ({completedItems.length})
      </Text>
      {completedItems.slice(0, 3).map((instance) => {
        const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
        const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
        const displayText = timeDisplay ? `${timeDisplay} \u00B7 ${statusText}` : statusText;

        return (
          <View
            key={instance.id}
            style={styles.completedItem}
          >
            <View style={styles.completedIcon}>
              <Text style={styles.completedIconText}>{'\u2713'}</Text>
            </View>
            <View style={styles.completedDetails}>
              <Text style={styles.completedTimeText}>{displayText}</Text>
              <Text style={styles.completedNameText}>{instance.itemName}</Text>
            </View>
          </View>
        );
      })}
      {completedItems.length > 3 && (
        <Text style={styles.completedMoreText}>
          +{completedItems.length - 3} more completed
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textHalf,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  adjustTodayLink: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================
  categoryContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  categoryContainerDefault: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(96, 165, 250, 0.06)',
  },
  categoryContainerOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: Colors.redFaint,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  categoryClose: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  categoryEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Category item rows
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusCirclePending: {
    borderColor: Colors.textMuted,
    backgroundColor: 'transparent',
  },
  statusCircleOverdue: {
    borderColor: Colors.red,
    backgroundColor: Colors.redFaint,
  },
  statusCircleDone: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  statusCircleText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusCircleDoneText: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '600',
  },
  categoryItemDetails: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryItemNameDone: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  categoryItemTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  categoryItemTimeOverdue: {
    color: Colors.red,
  },
  categoryItemTimeDone: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logButton: {
    backgroundColor: Colors.glassActive,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  logButtonOverdue: {
    backgroundColor: Colors.redMuted,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // ============================================================================
  // MODE B — Time-Grouped "Coming Up" List
  // ============================================================================
  timeGroup: {
    marginBottom: 4,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  timeGroupHeaderCurrent: {
    backgroundColor: 'rgba(96, 165, 250, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  timeGroupIcon: {
    fontSize: 14,
  },
  timeGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textHalf,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeGroupTitleCurrent: {
    color: Colors.accent,
  },
  timeGroupCount: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  flatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  flatItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  flatItemEmoji: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  flatItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  flatItemTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ============================================================================
  // Completed (shared)
  // ============================================================================
  completedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassHover,
  },
  completedHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
    opacity: 0.45,
  },
  completedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1.5,
    borderColor: Colors.greenStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIconText: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '600',
  },
  completedDetails: {
    flex: 1,
  },
  completedTimeText: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '600',
    marginBottom: 2,
  },
  completedNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  completedMoreText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
