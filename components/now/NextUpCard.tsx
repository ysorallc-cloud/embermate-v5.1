// ============================================================================
// CURRENT BLOCK CARD - Time-block status overview
// Shows current time window progress and next pending item
// Always calm blue — no red/amber urgency colors on this card
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { parseTimeForDisplay, getTimeWindowDisplayRange, TIME_WINDOW_HOURS, type TimeWindow } from '../../utils/nowHelpers';

import { Colors } from '../../theme/theme-tokens';
interface CurrentBlockCardProps {
  currentWindow: TimeWindow;
  windowItems: any[];          // all pending + completed items in this block
  nextPendingItem: any | null; // next pending item in this block
  hasRegimenInstances: boolean;
  completedCount: number;      // total completed today (for empty state)
  onViewTasks: (window: TimeWindow) => void;
}

export function NextUpCard({
  currentWindow,
  windowItems,
  nextPendingItem,
  hasRegimenInstances,
  completedCount,
  onViewTasks,
}: CurrentBlockCardProps) {
  // Empty state: All caught up
  if (hasRegimenInstances && windowItems.length === 0 && completedCount > 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>✓</Text>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>No scheduled items remain today.</Text>
      </View>
    );
  }

  if (!hasRegimenInstances || windowItems.length === 0) return null;

  const label = TIME_WINDOW_HOURS[currentWindow].label;
  const timeRange = getTimeWindowDisplayRange(currentWindow);
  const completedInBlock = windowItems.filter(i => i.status === 'completed' || i.status === 'skipped').length;
  const totalInBlock = windowItems.length;
  const pendingInBlock = totalInBlock - completedInBlock;

  const progressText = pendingInBlock === 0
    ? 'All complete'
    : `In progress \u2022 ${completedInBlock} of ${totalInBlock} complete`;

  const nextItemTime = nextPendingItem ? parseTimeForDisplay(nextPendingItem.scheduledTime) : null;
  const nextItemText = nextPendingItem
    ? `Next: ${nextPendingItem.itemName}${nextItemTime ? ` at ${nextItemTime}` : ''}`
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>CURRENT BLOCK</Text>
      <Text style={styles.title}>{label} ({timeRange})</Text>
      <Text style={styles.progress}>{progressText}</Text>
      {nextItemText && (
        <Text style={styles.nextItem} numberOfLines={1}>{nextItemText}</Text>
      )}
      <TouchableOpacity
        style={styles.button}
        onPress={() => onViewTasks(currentWindow)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`View ${label} tasks`}
      >
        <Text style={styles.buttonText}>View {label} Tasks</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.blueLight,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  progress: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  nextItem: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: Colors.greenTint,
    borderWidth: 1,
    borderColor: Colors.greenStrong,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.green,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textHalf,
  },
});
