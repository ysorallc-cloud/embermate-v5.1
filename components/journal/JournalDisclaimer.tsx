// ============================================================================
// JOURNAL DISCLAIMER — Phase 5.12.i, compressed in Phase 22.1.
//
// Layer 1 legal hygiene: a persistent, never-dismissable two-line
// footer at the very bottom of the Journal page. Visible on every
// state — populated today, empty today, past day. Calm type,
// textTertiary, italic. Must not compete with the care narrative.
//
// Phase 22.1 compression:
//   • Line 1: "{loggedCount} of {totalCount} logged today"
//     (absorbs the previous page-level completion footer; the
//     standalone "N of M logged" line in journal.tsx was retired
//     when this prop landed)
//   • Line 2: "A record of care, not a medical record"
//
// Stats props are optional — when both loggedCount and totalCount
// are omitted (or totalCount is 0), the disclaimer falls back to
// rendering only Line 2 (e.g. past-day mode with no live outcomes
// to count).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface JournalDisclaimerProps {
  /** Phase 22.1 — number of items logged today (drives the stats
   *  line). Pass undefined to omit the stats line entirely. */
  loggedCount?: number;
  /** Phase 22.1 — total items expected today. Pass undefined or 0
   *  to omit the stats line entirely. */
  totalCount?: number;
}

export function JournalDisclaimer({ loggedCount, totalCount }: JournalDisclaimerProps = {}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasStats =
    typeof loggedCount === 'number' &&
    typeof totalCount === 'number' &&
    totalCount > 0;
  const statsLine = hasStats
    ? `${loggedCount} of ${totalCount} logged today`
    : null;

  return (
    <View style={styles.wrap}>
      {statsLine && <Text style={styles.text}>{statsLine}</Text>}
      <Text style={styles.text}>
        {'A record of care, not a medical record'}
      </Text>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    wrap: {
      paddingVertical: 16, // allow: legal-footer breathing room
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
      alignItems: 'center',
    },
    text: {
      fontSize: 9.5,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      lineHeight: 15,
    },
  });

export default JournalDisclaimer;
