// ============================================================================
// CARE PLAN PANEL
// Main panel component for Care Plan on Record page
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
import { DayState, DayStateRoutine, DayStateItem } from '../../utils/carePlanTypes';

// ============================================================================
// TYPES
// ============================================================================

interface CarePlanPanelProps {
  dayState: DayState;
  onItemOverride: (routineId: string, itemId: string, done: boolean) => Promise<void>;
  onClearOverride: (routineId: string, itemId: string) => Promise<void>;
  onSetupPress?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CarePlanPanel({
  dayState,
  onItemOverride,
  onClearOverride,
  onSetupPress,
}: CarePlanPanelProps) {
  const router = useRouter();
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    new Set(dayState.routines.filter(r => r.status === 'available').map(r => r.routineId))
  );

  const toggleRoutine = (routineId: string) => {
    setExpandedRoutines(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const handleItemPress = (item: DayStateItem) => {
    router.push(item.link as any);
  };

  const handleItemLongPress = (routineId: string, item: DayStateItem) => {
    const options = item.status === 'done'
      ? ['Mark as not done', 'Cancel']
      : ['Mark as done', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 1,
          title: item.label,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const newDone = item.status !== 'done';
            await onItemOverride(routineId, item.itemId, newDone);
          }
        }
      );
    } else {
      Alert.alert(
        item.label,
        undefined,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: item.status === 'done' ? 'Mark as not done' : 'Mark as done',
            onPress: async () => {
              const newDone = item.status !== 'done';
              await onItemOverride(routineId, item.itemId, newDone);
            },
          },
        ]
      );
    }
  };

  // Empty state
  if (dayState.routines.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>No Care Plan set up</Text>
        <Text style={styles.emptySubtitle}>
          Set up a Care Plan to track daily routines
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
          <Text style={styles.subtitle}>Items for today</Text>
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
      {dayState.nextAction && (
        <TouchableOpacity
          style={styles.nextUpRow}
          onPress={() => {
            if (dayState.nextAction?.link) {
              router.push(dayState.nextAction.link as any);
            }
          }}
        >
          <Text style={styles.nextUpLabel}>Next:</Text>
          <Text style={styles.nextUpText}>
            {dayState.nextAction.emoji} {dayState.nextAction.label}
          </Text>
          <Text style={styles.nextUpChevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Routines */}
      {dayState.routines.map(routine => (
        <RoutineSection
          key={routine.routineId}
          routine={routine}
          expanded={expandedRoutines.has(routine.routineId)}
          onToggle={() => toggleRoutine(routine.routineId)}
          onItemPress={handleItemPress}
          onItemLongPress={(item) => handleItemLongPress(routine.routineId, item)}
        />
      ))}

      {/* All Complete Message */}
      {dayState.allComplete && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeText}>All done for today!</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// ROUTINE SECTION
// ============================================================================

interface RoutineSectionProps {
  routine: DayStateRoutine;
  expanded: boolean;
  onToggle: () => void;
  onItemPress: (item: DayStateItem) => void;
  onItemLongPress: (item: DayStateItem) => void;
}

function RoutineSection({
  routine,
  expanded,
  onToggle,
  onItemPress,
  onItemLongPress,
}: RoutineSectionProps) {
  const statusColor = getStatusColor(routine.status);

  // Get upcoming (not done) items for preview when collapsed
  const upcomingItems = routine.items.filter(item => item.status !== 'done');
  const previewItems = upcomingItems.slice(0, 2);
  const remainingCount = upcomingItems.length - previewItems.length;

  return (
    <View style={styles.routineSection}>
      {/* Routine Header */}
      <TouchableOpacity
        style={styles.routineHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.routineHeaderLeft}>
          <Text style={styles.routineEmoji}>{routine.emoji}</Text>
          <View>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={[styles.routineProgress, { color: statusColor }]}>
              {routine.completedCount}/{routine.totalCount} items
            </Text>
          </View>
        </View>
        <View style={styles.routineHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {routine.status === 'completed' ? '✓ Done' :
               routine.status === 'available' ? 'Now' : 'Later'}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
        </View>
      </TouchableOpacity>

      {/* Preview when collapsed - shows next 1-2 items */}
      {!expanded && previewItems.length > 0 && (
        <View style={styles.previewSection}>
          {previewItems.map(item => (
            <TouchableOpacity
              key={item.itemId}
              style={styles.previewItem}
              onPress={() => onItemPress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.previewEmoji}>{item.emoji || '•'}</Text>
              <Text style={styles.previewLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.previewStatus}>{item.statusText}</Text>
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

      {/* Routine Items (expanded) */}
      {expanded && (
        <View style={styles.routineItems}>
          {routine.items.map(item => (
            <RoutineItem
              key={item.itemId}
              item={item}
              onPress={() => onItemPress(item)}
              onLongPress={() => onItemLongPress(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// ROUTINE ITEM
// ============================================================================

interface RoutineItemProps {
  item: DayStateItem;
  onPress: () => void;
  onLongPress: () => void;
}

function RoutineItem({ item, onPress, onLongPress }: RoutineItemProps) {
  const isDone = item.status === 'done';

  return (
    <TouchableOpacity
      style={[styles.routineItem, isDone && styles.routineItemDone]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={styles.routineItemLeft}>
        <Text style={styles.routineItemEmoji}>{item.emoji || '•'}</Text>
        <Text style={[styles.routineItemLabel, isDone && styles.routineItemLabelDone]}>
          {item.label}
        </Text>
      </View>
      <View style={styles.routineItemRight}>
        <Text style={[
          styles.routineItemStatus,
          isDone && styles.routineItemStatusDone,
          item.isOverridden && styles.routineItemStatusOverride,
        ]}>
          {item.statusText}
          {item.isOverridden && ' *'}
        </Text>
        <Text style={styles.routineItemChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: DayStateRoutine['status']): string {
  switch (status) {
    case 'completed': return '#10B981'; // Green
    case 'available': return '#F59E0B'; // Amber
    case 'upcoming': return 'rgba(255, 255, 255, 0.5)'; // Gray
    default: return 'rgba(255, 255, 255, 0.5)';
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

  // Routine Section
  routineSection: {
    marginBottom: 8,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  routineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineEmoji: {
    fontSize: 20,
  },
  routineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routineProgress: {
    fontSize: 11,
    marginTop: 2,
  },
  routineHeaderRight: {
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

  // Routine Items (expanded)
  routineItems: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
  },
  routineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  routineItemDone: {
    opacity: 0.6,
  },
  routineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routineItemEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  routineItemLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  routineItemLabelDone: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  routineItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineItemStatus: {
    fontSize: 11,
    color: 'rgba(94, 234, 212, 0.8)',
  },
  routineItemStatusDone: {
    color: '#10B981',
  },
  routineItemStatusOverride: {
    fontStyle: 'italic',
  },
  routineItemChevron: {
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

export default CarePlanPanel;
