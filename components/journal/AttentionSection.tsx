import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { AttentionItem } from '../../utils/careSummaryBuilder';

interface Props {
  items: AttentionItem[];
}

export function AttentionSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.cardGreen}>
        <Text style={styles.allClearText}>{'\u2713'} Nothing requiring attention right now</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardAmber}>
      {items.map((item, i) => (
        <View key={`${item.text}-${i}`} style={[styles.itemRow, i > 0 && styles.itemRowSpaced]}>
          <Text style={styles.itemText}>{'\u26A0'} {item.text}</Text>
          {item.detail && (
            <Text style={styles.itemDetail}>{item.detail}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: Colors.greenHint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  allClearText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
  cardAmber: {
    backgroundColor: Colors.amberFaint,
    borderWidth: 1,
    borderColor: Colors.amberHint,
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  itemRow: {},
  itemRowSpaced: {
    marginTop: Spacing.sm,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.amber,
  },
  itemDetail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
