// ============================================================================
// PATTERNS COMING — the pre-data state shown IN PLACE of the adherence ring.
//
// The empty-ring decision (Design-Lock §8 honesty): a 0%/grey ring reads as
// failure on a fresh install, so until there's enough logged history we show
// an honest "needs time" surface — an eyebrow, a progress bar toward the
// threshold, "N of M days logged", and a plain sentence about what unlocks.
//
// Copy + the progress fraction come from patternsComingCopy(); this is
// presentational only.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export interface PatternsComingCopy {
  headline: string;
  progressLabel: string;
  sub: string;
  fraction: number;
}

export function PatternsComing({ copy, testID }: { copy: PatternsComingCopy; testID?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pct = Math.max(0, Math.min(100, Math.round(copy.fraction * 100)));

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.eyebrow}>{copy.headline}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} testID={testID ? `${testID}-bar` : undefined} />
      </View>
      <Text style={styles.progressLabel}>{copy.progressLabel}</Text>
      <Text style={styles.sub}>{copy.sub}</Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    eyebrow: {
      fontFamily: Fonts.eyebrow,
      fontSize: 10,
      letterSpacing: 2,
      color: c.textSecondary,
      marginBottom: 14,
    },
    barTrack: {
      width: 148,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.hairlineInset,
      overflow: 'hidden',
    },
    barFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.accent,
    },
    progressLabel: {
      fontFamily: Fonts.value,
      fontSize: 13,
      color: c.textPrimary,
      marginTop: 10,
    },
    sub: {
      fontFamily: Fonts.body,
      fontSize: 12.5,
      lineHeight: 18,
      textAlign: 'center',
      color: c.textSecondary,
      marginTop: 6,
    },
  });

export default PatternsComing;
