// ============================================================================
// STREAK BADGE
// Display current streak with visual indicator
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../app/_theme/theme-tokens';

interface Props {
  type: string;
  count: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export const StreakBadge: React.FC<Props> = ({ type, count, label, size = 'medium' }) => {
  const getEmoji = () => {
    if (count >= 30) return '🏆';
    if (count >= 14) return '🔥';
    if (count >= 7) return '⭐';
    if (count >= 3) return '✨';
    return '○';
  };

  const getBadgeColor = () => {
    if (count >= 30) return '#FFD700'; // Gold
    if (count >= 14) return '#FF6B6B'; // Fire red
    if (count >= 7) return '#FFD93D'; // Yellow
    if (count >= 3) return '#6BCF7F'; // Green
    return Colors.border;
  };

  const sizeStyles = {
    small: {
      container: { paddingVertical: 6, paddingHorizontal: 10 },
      emoji: { fontSize: 16 },
      count: { fontSize: 18 },
      label: { fontSize: 10 },
    },
    medium: {
      container: { paddingVertical: 8, paddingHorizontal: 12 },
      emoji: { fontSize: 20 },
      count: { fontSize: 22 },
      label: { fontSize: 11 },
    },
    large: {
      container: { paddingVertical: 12, paddingHorizontal: 16 },
      emoji: { fontSize: 24 },
      count: { fontSize: 28 },
      label: { fontSize: 12 },
    },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        sizeStyles.container,
        { borderColor: getBadgeColor(), backgroundColor: `${getBadgeColor()}15` },
      ]}
    >
      <Text style={[styles.emoji, sizeStyles.emoji]}>{getEmoji()}</Text>
      <Text style={[styles.count, sizeStyles.count, { color: getBadgeColor() }]}>{count}</Text>
      <Text style={[styles.label, sizeStyles.label]}>
        {label || 'day streak'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    gap: 2,
  },
  emoji: {
    fontWeight: '600',
  },
  count: {
    fontWeight: '700',
  },
  label: {
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
