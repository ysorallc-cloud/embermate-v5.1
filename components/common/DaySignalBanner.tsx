import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Spacing } from '../../theme/theme-tokens';
interface DaySignalBannerProps {
  emoji: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function DaySignalBanner({ emoji, label, subtitle, color, bgColor, borderColor }: DaySignalBannerProps) {
  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 18, // allow: tap-target padding (Apple HIG ≥44pt)
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 24,
    marginRight: 14, // allow: off-scale gap (intentional)
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
});
