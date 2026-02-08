// ============================================================================
// TIMELINE SECTION - Today's Plan with time grouping
// Shows overdue, upcoming (grouped by time window), and completed items
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  parseTimeForDisplay,
  getCurrentTimeWindow,
  groupByTimeWindow,
  TIME_WINDOW_HOURS,
  type TimeWindow,
} from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel, getTimeDeltaString } from '../../utils/urgency';

interface TimelineSectionProps {
  timeline: { overdue: any[]; upcoming: any[]; completed: any[] };
  hasRegimenInstances: boolean;
  expandedTimeGroups: Record<TimeWindow, boolean>;
  onToggleTimeGroup: (window: TimeWindow) => void;
  onItemPress: (instance: any) => void;
}

export function TimelineSection({
  timeline,
  hasRegimenInstances,
  expandedTimeGroups,
  onToggleTimeGroup,
  onItemPress,
}: TimelineSectionProps) {
  const router = useRouter();

  if (!hasRegimenInstances) return null;
  if (timeline.overdue.length === 0 && timeline.upcoming.length === 0) return null;

  return (
    <>
      {/* Timeline header with Adjust Today link */}
      <View style={styles.timelineSectionHeader}>
        <Text style={styles.sectionTitle}>TODAY'S PLAN</Text>
        <TouchableOpacity
          onPress={() => router.push('/today-scope' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.adjustTodayLink}>Adjust Today</Text>
        </TouchableOpacity>
      </View>

      {/* Overdue items - highest priority, always expanded */}
      {timeline.overdue.length > 0 && (() => {
        const hasCriticalItem = timeline.overdue.some(instance => {
          const urgency = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
          return urgency.tier === 'critical';
        });
        const sectionEmoji = hasCriticalItem ? '⚠️' : '📋';
        const sectionLabel = 'Needs attention';
        const titleStyle = hasCriticalItem ? styles.timeGroupTitleOverdue : styles.timeGroupTitlePending;
        const countStyle = hasCriticalItem ? styles.timeGroupCountOverdue : styles.timeGroupCountPending;

        return (
          <View style={styles.overdueSection}>
            <View style={styles.timeGroupHeader}>
              <View style={styles.timeGroupHeaderTouchable}>
                <Text style={[styles.timeGroupTitle, titleStyle]}>
                  {sectionEmoji} {sectionLabel}
                </Text>
                <Text style={[styles.timeGroupCount, countStyle]}>
                  ({timeline.overdue.length})
                </Text>
              </View>
            </View>
            {timeline.overdue.map((instance) => {
              const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
              const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

              const statusLabel = urgencyInfo.itemUrgency
                ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                : 'Due earlier today';

              const timeDelta = urgencyInfo.itemUrgency
                ? getTimeDeltaString(urgencyInfo.itemUrgency)
                : null;

              const isRed = urgencyInfo.tone === 'danger';
              const itemStyle = isRed ? styles.timelineItemOverdue : styles.timelineItemPending;
              const iconStyle = isRed ? styles.timelineIconOverdue : styles.timelineIconPending;
              const timeStyle = isRed ? styles.timelineTimeOverdue : styles.timelineTimePending;
              const actionStyle = isRed ? styles.timelineActionOverdue : styles.timelineActionPending;

              return (
                <TouchableOpacity
                  key={instance.id}
                  style={[styles.timelineItem, itemStyle]}
                  onPress={() => onItemPress(instance)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.timelineIcon, iconStyle]}>
                    <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                  </View>
                  <View style={styles.timelineDetails}>
                    <Text style={timeStyle}>
                      {timeDisplay ? `${timeDisplay} • ${statusLabel}` : statusLabel}
                    </Text>
                    <Text style={styles.timelineTitle}>{instance.itemName}</Text>
                    {timeDelta && (
                      <Text style={styles.timelineSubtitle}>{timeDelta}</Text>
                    )}
                    {instance.instructions && !timeDelta && (
                      <Text style={styles.timelineSubtitle} numberOfLines={1}>
                        {instance.instructions}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.timelineAction, actionStyle]}>
                    <Text style={styles.timelineActionText}>Log</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })()}

      {/* Time-grouped upcoming items */}
      {(() => {
        const currentWindow = getCurrentTimeWindow();
        const groupedUpcoming = groupByTimeWindow(timeline.upcoming);
        const timeWindows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

        return timeWindows.map((window) => {
          const items = groupedUpcoming[window];
          if (items.length === 0) return null;

          const isCurrentWindow = window === currentWindow;
          const isExpanded = expandedTimeGroups[window];

          return (
            <View key={window} style={styles.timeGroupSection}>
              <TouchableOpacity
                style={styles.timeGroupHeader}
                onPress={() => onToggleTimeGroup(window)}
                activeOpacity={0.7}
              >
                <View style={styles.timeGroupHeaderTouchable}>
                  <Text style={[
                    styles.timeGroupTitle,
                    isCurrentWindow && styles.timeGroupTitleCurrent
                  ]}>
                    {TIME_WINDOW_HOURS[window].label}
                  </Text>
                  <Text style={styles.timeGroupCount}>
                    ({items.length})
                  </Text>
                </View>
                <Text style={styles.timeGroupCollapseIcon}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {isExpanded && items.map((instance) => {
                const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
                const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

                const statusLabel = urgencyInfo.itemUrgency
                  ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                  : urgencyInfo.label;

                const isDueSoon = urgencyInfo.tier === 'attention' && !urgencyInfo.itemUrgency?.isOverdue;
                const itemStyle = isDueSoon ? styles.timelineItemDueSoon : null;
                const iconStyle = isDueSoon ? styles.timelineIconDueSoon : null;
                const timeStyle = isDueSoon ? styles.timelineTimeDueSoon : styles.timelineTime;

                return (
                  <TouchableOpacity
                    key={instance.id}
                    style={[styles.timelineItem, itemStyle]}
                    onPress={() => onItemPress(instance)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.timelineIcon, iconStyle]}>
                      <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                    </View>
                    <View style={styles.timelineDetails}>
                      <Text style={timeStyle}>
                        {timeDisplay ? `${timeDisplay} • ${statusLabel}` : statusLabel}
                      </Text>
                      <Text style={styles.timelineTitle}>{instance.itemName}</Text>
                      {instance.instructions && (
                        <Text style={styles.timelineSubtitle} numberOfLines={1}>
                          {instance.instructions}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        });
      })()}

      {/* Completed items - minimized */}
      {timeline.completed.length > 0 && (
        <View style={styles.completedSection}>
          <Text style={styles.completedHeader}>
            ✓ Completed ({timeline.completed.length})
          </Text>
          {timeline.completed.slice(0, 3).map((instance) => {
            const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
            const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
            const displayText = timeDisplay ? `${timeDisplay} • ${statusText}` : statusText;

            return (
              <View
                key={instance.id}
                style={[styles.timelineItem, styles.timelineItemCompleted]}
              >
                <View style={[styles.timelineIcon, styles.timelineIconCompleted]}>
                  <Text style={styles.timelineIconEmoji}>✓</Text>
                </View>
                <View style={styles.timelineDetails}>
                  <Text style={styles.timelineTimeCompleted}>
                    {displayText}
                  </Text>
                  <Text style={styles.timelineTitleCompleted}>{instance.itemName}</Text>
                </View>
              </View>
            );
          })}
          {timeline.completed.length > 3 && (
            <Text style={styles.completedMoreText}>
              +{timeline.completed.length - 3} more completed
            </Text>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: '#14B8A6',
  },

  // Timeline items
  timelineItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 193, 7, 0.4)',
    borderRadius: 8,
    padding: 12,
    paddingLeft: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineItemOverdue: {
    borderLeftColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  timelineItemPending: {
    borderLeftColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  timelineItemDueSoon: {
    borderLeftColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  timelineItemCompleted: {
    borderLeftColor: 'rgba(16, 185, 129, 0.3)',
    opacity: 0.45,
  },
  timelineIcon: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timelineIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  timelineIconDueSoon: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  timelineIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  timelineIconEmoji: {
    fontSize: 16,
  },
  timelineDetails: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimeOverdue: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimePending: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimeDueSoon: {
    fontSize: 12,
    color: 'rgba(245, 158, 11, 0.85)',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimeCompleted: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timelineTitleCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  timelineSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timelineAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timelineActionOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  timelineActionPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  timelineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  overdueSection: {
    marginBottom: 12,
  },
  timeGroupSection: {
    marginBottom: 16,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  timeGroupHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeGroupTitleCurrent: {
    color: '#3B82F6',
  },
  timeGroupTitleOverdue: {
    color: '#EF4444',
  },
  timeGroupTitlePending: {
    color: '#F59E0B',
  },
  timeGroupCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  timeGroupCountOverdue: {
    color: '#EF4444',
  },
  timeGroupCountPending: {
    color: '#F59E0B',
  },
  timeGroupCollapseIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },

  // Completed
  completedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  completedHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  completedMoreText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
