import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface WellnessSnapItem {
  emoji: string;
  label: string;
  value: string;
  color?: string;
}

interface WellnessSnapStripProps {
  items: WellnessSnapItem[];
}

export function WellnessSnapStrip({ items }: WellnessSnapStripProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.value, item.color ? { color: item.color } : null]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  item: {
    alignItems: 'center',
    gap: 3,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
