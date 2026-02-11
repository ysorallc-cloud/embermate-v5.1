// ============================================================================
// TIMELINE SECTION - Today's Plan with time grouping
// All pending items (overdue + upcoming) grouped by time window
// Log buttons on ALL pending items; urgency styling for overdue/due-now
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  parseTimeForDisplay,
  getCurrentTimeWindow,
  groupByTimeWindow,
  TIME_WINDOW_HOURS,
  isOverdue,
  type TimeWindow,
} from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel, getTimeDeltaString } from '../../utils/urgency';

interface TimelineSectionProps {
  allPending: any[];        // ALL pending items (overdue + upcoming merged)
  completed: any[];         // completed items
  hasRegimenInstances: boolean;
  expandedTimeGroups: Record<TimeWindow, boolean>;
  onToggleTimeGroup: (window: TimeWindow) => void;
  onItemPress: (instance: any) => void;
  timeGroupRefs?: Record<TimeWindow, (node: any) => void>;
}

export function TimelineSection({
  allPending,
  completed,
  hasRegimenInstances,
  expandedTimeGroups,
  onToggleTimeGroup,
  onItemPress,
  timeGroupRefs,
}: TimelineSectionProps) {
  const router = useRouter();

  if (!hasRegimenInstances) return null;
  if (allPending.length === 0 && completed.length === 0) return null;

  const currentWindow = getCurrentTimeWindow();
  const groupedPending = groupByTimeWindow(allPending);
  const timeWindows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <>
      {/* Timeline header with Adjust Today link */}
      <View style={styles.timelineSectionHeader}>
        <Text style={styles.sectionTitle}>TODAY'S PLAN</Text>
        <TouchableOpacity
          onPress={() => router.push('/today-scope' as any)}
          activeOpacity={0.7}
          accessibilityLabel="Adjust today's plan"
          accessibilityRole="link"
        >
          <Text style={styles.adjustTodayLink}>Adjust Today</Text>
        </TouchableOpacity>
      </View>

      {/* Time-grouped items (overdue items appear in their scheduled time groups) */}
      {timeWindows.map((window) => {
        const items = groupedPending[window];
        if (items.length === 0) return null;

        const isCurrentWindow = window === currentWindow;
        const isExpanded = expandedTimeGroups[window];

        // Count overdue items in this group
        const overdueCount = items.filter(i => isOverdue(i.scheduledTime)).length;

        return (
          <View
            key={window}
            style={styles.timeGroupSection}
            ref={timeGroupRefs?.[window]}
          >
            <TouchableOpacity
              style={styles.timeGroupHeader}
              onPress={() => onToggleTimeGroup(window)}
              activeOpacity={0.7}
              accessibilityLabel={`${TIME_WINDOW_HOURS[window].label}, ${items.length} item${items.length !== 1 ? 's' : ''}${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
            >
              <View style={styles.timeGroupHeaderTouchable}>
                <Text style={[
                  styles.timeGroupTitle,
                  isCurrentWindow && styles.timeGroupTitleCurrent,
                  overdueCount > 0 && styles.timeGroupTitleOverdue,
                ]}>
                  {TIME_WINDOW_HOURS[window].label}
                </Text>
                <Text style={[
                  styles.timeGroupCount,
                  overdueCount > 0 && styles.timeGroupCountOverdue,
                ]}>
                  ({items.length}{overdueCount > 0 ? ` \u2022 ${overdueCount} overdue` : ''})
                </Text>
              </View>
              <Text style={styles.timeGroupCollapseIcon}>
                {isExpanded ? '\u25BC' : '\u25B6'}
              </Text>
            </TouchableOpacity>

            {isExpanded && items.map((instance) => {
              const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
              const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
              const itemIsOverdue = isOverdue(instance.scheduledTime);

              const statusLabel = urgencyInfo.itemUrgency
                ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                : urgencyInfo.label;

              const timeDelta = urgencyInfo.itemUrgency
                ? getTimeDeltaString(urgencyInfo.itemUrgency)
                : null;

              // Determine urgency-based styles
              const isRed = urgencyInfo.tone === 'danger';
              const isDueSoon = urgencyInfo.tier === 'attention' && !urgencyInfo.itemUrgency?.isOverdue;

              let itemStyle = null;
              let iconStyle = null;
              let timeStyle = styles.timelineTime;
              let actionStyle = null;

              if (itemIsOverdue && isRed) {
                itemStyle = styles.timelineItemOverdue;
                iconStyle = styles.timelineIconOverdue;
                timeStyle = styles.timelineTimeOverdue;
                actionStyle = styles.timelineActionOverdue;
              } else if (itemIsOverdue) {
                itemStyle = styles.timelineItemPending;
                iconStyle = styles.timelineIconPending;
                timeStyle = styles.timelineTimePending;
                actionStyle = styles.timelineActionPending;
              } else if (isDueSoon) {
                itemStyle = styles.timelineItemDueSoon;
                iconStyle = styles.timelineIconDueSoon;
                timeStyle = styles.timelineTimeDueSoon;
                actionStyle = null;
              }

              return (
                <TouchableOpacity
                  key={instance.id}
                  style={[styles.timelineItem, itemStyle]}
                  onPress={() => onItemPress(instance)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Log ${instance.itemName}${timeDisplay ? `, scheduled at ${timeDisplay}` : ''}${itemIsOverdue ? ', overdue' : ''}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.timelineIcon, iconStyle]}>
                    <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '\uD83D\uDD14'}</Text>
                  </View>
                  <View style={styles.timelineDetails}>
                    <Text style={timeStyle}>
                      {timeDisplay ? `${timeDisplay} \u2022 ${statusLabel}` : statusLabel}
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
      })}

      {/* Completed items - minimized */}
      {completed.length > 0 && (
        <View style={styles.completedSection}>
          <Text style={styles.completedHeader}>
            ✓ Completed ({completed.length})
          </Text>
          {completed.slice(0, 3).map((instance) => {
            const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
            const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
            const displayText = timeDisplay ? `${timeDisplay} \u2022 ${statusText}` : statusText;

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
          {completed.length > 3 && (
            <Text style={styles.completedMoreText}>
              +{completed.length - 3} more completed
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
    color: '#F59E0B',
  },
  timeGroupCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  timeGroupCountOverdue: {
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
