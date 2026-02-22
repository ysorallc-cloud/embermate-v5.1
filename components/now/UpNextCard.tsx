// ============================================================================
// UP NEXT STRIP - Compact highest-priority item at top of Now page
// Left-border accent strip with item name, time badge, and Log action
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { parseTimeForDisplay, isOverdue } from '../../utils/nowHelpers';

// ============================================================================
// HELPERS
// ============================================================================

function getTimeDelta(scheduledTime: string): { text: string; tone: 'late' | 'soon' | 'later' } | null {
  if (!scheduledTime) return null;

  const now = new Date();
  let scheduled = new Date(scheduledTime);
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  if (isNaN(scheduled.getTime())) return null;

  const diffMs = now.getTime() - scheduled.getTime();

  if (diffMs > 30 * 60 * 1000) {
    return { text: 'overdue', tone: 'late' };
  }

  if (diffMs > 0) {
    return { text: 'due now', tone: 'soon' };
  }

  // Future within 15min
  const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
  if (diffMin <= 15) {
    return { text: 'coming up', tone: 'soon' };
  }

  return null;
}

// ============================================================================
// PROPS
// ============================================================================

interface UpNextCardProps {
  instance: any;
  onLogNow: (instance: any) => void;
  onSkip: (instanceId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UpNextCard({ instance, onLogNow, onSkip }: UpNextCardProps) {
  if (!instance) return null;

  const itemIsOverdue = isOverdue(instance.scheduledTime);
  const delta = getTimeDelta(instance.scheduledTime);
  const time = parseTimeForDisplay(instance.scheduledTime);

  return (
    <TouchableOpacity
      style={[styles.strip, itemIsOverdue && styles.stripOverdue]}
      onPress={() => onLogNow(instance)}
      activeOpacity={0.7}
      accessibilityLabel={`${itemIsOverdue ? 'Overdue' : 'Up next'}: ${instance.itemName}. Tap to log.`}
      accessibilityRole="button"
    >
      {/* Left: label + name */}
      <View style={styles.left}>
        <Text style={[styles.label, itemIsOverdue && styles.labelOverdue]}>
          {itemIsOverdue ? 'OVERDUE' : 'UP NEXT'}
        </Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {instance.itemName}
        </Text>
      </View>

      {/* Right: time badge + log */}
      <View style={styles.right}>
        {delta && (
          <Text style={[
            styles.deltaText,
            delta.tone === 'late' && styles.deltaTextLate,
            delta.tone === 'soon' && styles.deltaTextSoon,
          ]}>
            {delta.text}
          </Text>
        )}
        {!delta && time && (
          <Text style={styles.timeText}>{time}</Text>
        )}
        <View style={[styles.logPill, itemIsOverdue && styles.logPillOverdue]}>
          <Text style={[styles.logPillText, itemIsOverdue && styles.logPillTextOverdue]}>{'\u2713'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.22)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  stripOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    borderColor: 'rgba(239, 68, 68, 0.22)',
    borderLeftColor: '#EF4444',
  },

  left: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.accent,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  labelOverdue: {
    color: '#F87171',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  deltaTextLate: {
    color: '#F87171',
  },
  deltaTextSoon: {
    color: Colors.amber,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  logPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logPillOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  logPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  logPillTextOverdue: {
    color: '#F87171',
  },
});
