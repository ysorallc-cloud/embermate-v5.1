// ============================================================================
// INSIGHTS READ-LINE — the factual line under the adherence ring.
//
// Renders buildAdherenceRead() segments: light-italic voice, the missed-dose
// count painted coral so it reads at a glance (insights-hero). Presentational
// only — the copy + tone decisions live in utils/insightsHero.
// ============================================================================

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { ReadSegment } from '../../utils/insightsHero';

export function InsightsReadLine({ segments, testID }: { segments: ReadSegment[]; testID?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!segments || segments.length === 0) return null;
  return (
    <Text style={styles.line} testID={testID}>
      {segments.map((s, i) => (
        <Text key={i} style={s.tone === 'coral' ? styles.coral : styles.neutral}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    line: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      fontSize: 13.5,
      lineHeight: 19,
      textAlign: 'center',
      color: c.textSecondary,
      paddingHorizontal: 24,
    },
    neutral: { color: c.textSecondary },
    coral: { color: c.coral },
  });

export default InsightsReadLine;
