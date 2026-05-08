// ============================================================================
// WHAT CHANGED TODAY — Phase 5.12.4b.
//
// Renders only when the day-level detector surfaces meaningful deltas.
// Eyebrow color: coral (criticalAlert) when any change is severity 'flag',
// lavender (caregiverAccent) when only 'note'-severity changes are
// present. Per-row text matches its own severity — flagged rows in
// coral, notes in neutral cream.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import { useDayLevelChanges } from '../../hooks/useDayLevelChanges';

interface WhatChangedTodayProps {
  dateKey: string; // YYYY-MM-DD
}

export function WhatChangedToday({ dateKey }: WhatChangedTodayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { result, loading } = useDayLevelChanges(dateKey);

  if (loading || !result || result.changes.length === 0) {
    return null;
  }

  const eyebrowColor = result.hasSignificantChange
    ? colors.criticalAlert
    : colors.caregiverAccent;

  return (
    <View style={styles.section}>
      <Text
        testID="what-changed-eyebrow"
        style={[styles.eyebrow, { color: eyebrowColor }]}
      >
        {'WHAT CHANGED TODAY'}
      </Text>

      {result.changes.map((change, i) => {
        const rowColor = change.severity === 'flag'
          ? colors.criticalAlert
          : colors.textSecondary;
        return (
          <Text
            key={`${change.category}-${i}`}
            testID={`what-changed-row-${i}`}
            style={[styles.row, { color: rowColor }]}
          >
            {`• ${change.observation}`}
          </Text>
        );
      })}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    section: {
      marginVertical: Spacing.sm,
      paddingHorizontal: 2,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    row: {
      fontSize: 12,
      lineHeight: 18,
      paddingVertical: 2,
    },
  });

export default WhatChangedToday;
