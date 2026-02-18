// ============================================================================
// STATUS NARRATIVE
// Renders the generated prose narrative string in a styled card
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';

interface StatusNarrativeProps {
  narrative: string;
}

export function StatusNarrative({ narrative }: StatusNarrativeProps) {
  if (!narrative) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.narrative}>{narrative}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    backgroundColor: Colors.glassFaint,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
