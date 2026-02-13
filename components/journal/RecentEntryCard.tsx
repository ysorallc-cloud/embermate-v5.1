// ============================================================================
// RecentEntryCard — Single entry card for the Journal feed
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RecentEntry } from '../../hooks/useRecentEntries';

import { Colors } from '../../theme/theme-tokens';
interface Props {
  entry: RecentEntry;
  onPress: (entry: RecentEntry) => void;
}

export function RecentEntryCard({ entry, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(entry)}
      activeOpacity={0.7}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}. ${entry.detail}. ${entry.relativeTime}`}
    >
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{entry.emoji}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{entry.label}</Text>
        <Text style={styles.detail} numberOfLines={1}>{entry.detail}</Text>
      </View>
      <Text style={styles.time}>{entry.relativeTime}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassHover,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiCircle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.sageBorder,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  detail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
