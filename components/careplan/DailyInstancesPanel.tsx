// ============================================================================
// DAILY INSTANCES PANEL
// Renders generated DailyCareInstance records grouped by time window
// Replaces the old static routine-based CarePlanPanel
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import {
  DailyCareInstance,
  TimeWindowLabel,
  LogEntry,
} from '../../types/carePlan';
import { InstanceGroup } from '../../hooks/useDailyCareInstances';

// ============================================================================
// TYPES
// ============================================================================

interface DailyInstancesPanelProps {
  groups: InstanceGroup[];
  nextPending: DailyCareInstance | null;
  allComplete: boolean;
  stats: {
    total: number;
    pending: number;
    completed: number;
    skipped: number;
    missed: number;
  };
  onCompleteInstance: (
    instanceId: string,
    outcome?: 'taken' | 'completed' | 'skipped',
    data?: any,
    notes?: string
  ) => Promise<{ instance: DailyCareInstance; log: LogEntry } | null>;
  onSkipInstance: (instanceId: string, notes?: string) => Promise<void>;
  onSetupPress?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DailyInstancesPanel({
  groups,
  nextPending,
  allComplete,
  stats,
  onCompleteInstance,
  onSkipInstance,
  onSetupPress,
}: DailyInstancesPanelProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeWindowLabel>>(() => {
    // Auto-expand groups that are 'available'
    return new Set(groups.filter(g => g.status === 'available').map(g => g.windowLabel));
  });

  const toggleGroup = (windowLabel: TimeWindowLabel) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(windowLabel)) {
        next.delete(windowLabel);
      } else {
        next.add(windowLabel);
      }
      return next;
    });
  };

  const handleInstancePress = (instance: DailyCareInstance) => {
    // For medications, route to the contextual logging screen with pre-filled data
    if (instance.itemType === 'medication') {
      router.push({
        pathname: '/log-medication-plan-item',
        params: {
          medicationId: instance.carePlanItemId,
          instanceId: instance.id,
          scheduledTime: instance.scheduledTime,
          itemName: instance.itemName,
          itemDosage: instance.itemDosage || '',
          itemInstructions: instance.instructions || '',
        },
      } as any);
      return;
    }

    // For other item types, use the standard route
    const route = getRouteForItemType(instance.itemType);
    router.push(route as any);
  };

  const handleInstanceLongPress = (instance: DailyCareInstance) => {
    const isPending = instance.status === 'pending';
    const options = isPending
      ? ['Mark as done', 'Skip', 'Cancel']
      : ['Mark as not done', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: isPending ? 2 : 1,
          destructiveButtonIndex: isPending ? 1 : undefined,
          title: instance.itemName,
          message: instance.instructions || undefined,
        },
        async (buttonIndex) => {
          if (isPending) {
            if (buttonIndex === 0) {
              // Mark as done
              await onCompleteInstance(instance.id);
            } else if (buttonIndex === 1) {
              // Skip
              await onSkipInstance(instance.id);
            }
          } else {
            // Already completed - no undo supported for immutable logs
            if (buttonIndex === 0) {
              Alert.alert(
                'Cannot Undo',
                'Logged entries cannot be undone. You can add a correction note instead.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      );
    } else {
      Alert.alert(
        instance.itemName,
        instance.instructions || undefined,
        isPending
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Skip', style: 'destructive', onPress: () => onSkipInstance(instance.id) },
              { text: 'Mark as done', onPress: () => onCompleteInstance(instance.id) },
            ]
          : [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Mark as not done',
                onPress: () => {
                  Alert.alert(
                    'Cannot Undo',
                    'Logged entries cannot be undone. You can add a correction note instead.'
                  );
                },
              },
            ]
      );
    }
  };

  // Empty state - no care plan items
  if (groups.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>No Care Plan set up</Text>
        <Text style={styles.emptySubtitle}>
          Create a Care Plan to track daily routines and medications
        </Text>
        {onSetupPress && (
          <TouchableOpacity style={styles.setupButton} onPress={onSetupPress}>
            <Text style={styles.setupButtonText}>Set up Care Plan</Text>
          </TouchableOpacity>
        )}
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
            {stats.completed}/{stats.total} completed
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.adjustTodayButton}
            onPress={() => router.push('/today-scope' as any)}
          >
            <Text style={styles.adjustTodayText}>Adjust Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/care-plan' as any)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next Up Row */}
      {nextPending && (
        <TouchableOpacity
          style={styles.nextUpRow}
          onPress={() => handleInstancePress(nextPending)}
          activeOpacity={0.7}
        >
          <Text style={styles.nextUpLabel}>Next:</Text>
          <Text style={styles.nextUpText}>
            {nextPending.itemEmoji || '•'} {nextPending.itemName}
          </Text>
          <Text style={styles.nextUpChevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Instance Groups by Time Window */}
      {groups.map(group => (
        <WindowGroupSection
          key={group.windowLabel}
          group={group}
          expanded={expandedGroups.has(group.windowLabel)}
          onToggle={() => toggleGroup(group.windowLabel)}
          onInstancePress={handleInstancePress}
          onInstanceLongPress={handleInstanceLongPress}
        />
      ))}

      {/* All Complete Message */}
      {allComplete && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeText}>All done for today!</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// WINDOW GROUP SECTION
// ============================================================================

interface WindowGroupSectionProps {
  group: InstanceGroup;
  expanded: boolean;
  onToggle: () => void;
  onInstancePress: (instance: DailyCareInstance) => void;
  onInstanceLongPress: (instance: DailyCareInstance) => void;
}

function WindowGroupSection({
  group,
  expanded,
  onToggle,
  onInstancePress,
  onInstanceLongPress,
}: WindowGroupSectionProps) {
  const statusColor = getStatusColor(group.status);

  // Get pending items for preview when collapsed
  const pendingInstances = group.instances.filter(i => i.status === 'pending');
  const previewInstances = pendingInstances.slice(0, 2);
  const remainingCount = pendingInstances.length - previewInstances.length;

  return (
    <View style={styles.groupSection}>
      {/* Group Header */}
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeaderLeft}>
          <Text style={styles.groupEmoji}>{group.emoji}</Text>
          <View>
            <Text style={styles.groupName}>{group.displayName}</Text>
            <Text style={[styles.groupProgress, { color: statusColor }]}>
              {group.completedCount}/{group.totalCount} items
            </Text>
          </View>
        </View>
        <View style={styles.groupHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {group.status === 'completed' ? '✓ Done' :
               group.status === 'available' ? 'Now' : 'Later'}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
        </View>
      </TouchableOpacity>

      {/* Preview when collapsed - shows next 1-2 pending items */}
      {!expanded && previewInstances.length > 0 && (
        <View style={styles.previewSection}>
          {previewInstances.map(instance => (
            <TouchableOpacity
              key={instance.id}
              style={styles.previewItem}
              onPress={() => onInstancePress(instance)}
              activeOpacity={0.7}
            >
              <Text style={styles.previewEmoji}>{instance.itemEmoji || '•'}</Text>
              <Text style={styles.previewLabel} numberOfLines={1}>
                {instance.itemName}
              </Text>
              <Text style={styles.previewStatus}>
                {getStatusText(instance)}
              </Text>
            </TouchableOpacity>
          ))}
          {remainingCount > 0 && (
            <TouchableOpacity style={styles.previewMore} onPress={onToggle}>
              <Text style={styles.previewMoreText}>
                +{remainingCount} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Full instance list (expanded) */}
      {expanded && (
        <View style={styles.instancesList}>
          {group.instances.map(instance => (
            <InstanceRow
              key={instance.id}
              instance={instance}
              onPress={() => onInstancePress(instance)}
              onLongPress={() => onInstanceLongPress(instance)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// INSTANCE ROW
// ============================================================================

interface InstanceRowProps {
  instance: DailyCareInstance;
  onPress: () => void;
  onLongPress: () => void;
}

function InstanceRow({ instance, onPress, onLongPress }: InstanceRowProps) {
  const isDone = instance.status === 'completed' || instance.status === 'skipped';
  const isMissed = instance.status === 'missed';

  return (
    <TouchableOpacity
      style={[
        styles.instanceRow,
        isDone && styles.instanceRowDone,
        isMissed && styles.instanceRowMissed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={styles.instanceRowLeft}>
        <Text style={styles.instanceEmoji}>{instance.itemEmoji || '•'}</Text>
        <View style={styles.instanceContent}>
          <Text style={[
            styles.instanceName,
            isDone && styles.instanceNameDone,
            isMissed && styles.instanceNameMissed,
          ]}>
            {instance.itemName}
          </Text>
          {instance.instructions && (
            <Text style={styles.instanceInstructions} numberOfLines={1}>
              {instance.instructions}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.instanceRowRight}>
        <Text style={[
          styles.instanceStatus,
          isDone && styles.instanceStatusDone,
          isMissed && styles.instanceStatusMissed,
        ]}>
          {getStatusText(instance)}
        </Text>
        <Text style={styles.instanceChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: InstanceGroup['status']): string {
  switch (status) {
    case 'completed': return '#10B981'; // Green
    case 'available': return '#F59E0B'; // Amber
    case 'upcoming': return 'rgba(255, 255, 255, 0.5)'; // Gray
    default: return 'rgba(255, 255, 255, 0.5)';
  }
}

function getStatusText(instance: DailyCareInstance): string {
  switch (instance.status) {
    case 'completed': return '✓ Done';
    case 'skipped': return 'Skipped';
    case 'missed': return 'Missed';
    case 'partial': return 'Partial';
    case 'pending':
    default:
      // Show priority for pending items
      if (instance.priority === 'required') {
        return 'Required';
      }
      return 'Tap to log';
  }
}

function getRouteForItemType(itemType: DailyCareInstance['itemType']): string {
  switch (itemType) {
    case 'medication': return '/medication-confirm';
    case 'vitals': return '/log-vitals';
    case 'nutrition': return '/log-meal';
    case 'mood': return '/log-mood';
    case 'sleep': return '/log-sleep';
    case 'hydration': return '/log-water';
    case 'activity': return '/log-activity';
    case 'appointment': return '/appointments';
    case 'custom':
    default:
      return '/log-note';
  }
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

  // Next Up Row
  nextUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  nextUpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginRight: 8,
  },
  nextUpText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nextUpChevron: {
    fontSize: 14,
    color: '#F59E0B',
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
    marginTop: 2,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Preview Section (collapsed state)
  previewSection: {
    marginLeft: 30,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 4,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  previewEmoji: {
    fontSize: 12,
    width: 18,
    textAlign: 'center',
    opacity: 0.7,
  },
  previewLabel: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  previewStatus: {
    fontSize: 10,
    color: 'rgba(94, 234, 212, 0.6)',
  },
  previewMore: {
    paddingVertical: 4,
    paddingLeft: 26,
  },
  previewMoreText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Instances List (expanded)
  instancesList: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
  },
  instanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  instanceRowDone: {
    opacity: 0.6,
  },
  instanceRowMissed: {
    opacity: 0.5,
  },
  instanceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  instanceEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  instanceContent: {
    flex: 1,
  },
  instanceName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  instanceNameDone: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  instanceNameMissed: {
    color: 'rgba(239, 68, 68, 0.7)',
    textDecorationLine: 'line-through',
  },
  instanceInstructions: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  instanceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instanceStatus: {
    fontSize: 11,
    color: 'rgba(94, 234, 212, 0.8)',
  },
  instanceStatusDone: {
    color: '#10B981',
  },
  instanceStatusMissed: {
    color: '#EF4444',
  },
  instanceChevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
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

export default DailyInstancesPanel;
