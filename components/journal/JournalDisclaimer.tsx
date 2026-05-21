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
  /** Phase 27 F4 — when true, drop the standalone wrap chrome
   *  (paddingVertical + paddingHorizontal + center alignment) so the
   *  disclaimer reads as one of several lines in a parent merged
   *  footer block rather than a self-contained centered footer
   *  region. Text styling (textTertiary italic 9.5pt) preserved.
   *  Defaults to false to keep the existing standalone-centered
   *  behavior for any non-Journal future consumer. */
  inline?: boolean;
}

export function JournalDisclaimer({ loggedCount, totalCount, inline = false }: JournalDisclaimerProps = {}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasStats =
    typeof loggedCount === 'number' &&
    typeof totalCount === 'number' &&
    totalCount > 0;
  const statsLine = hasStats
    ? `${loggedCount} of ${totalCount} logged today`
    : null;

  const textStyle = inline ? styles.textInline : styles.text;

  return (
    <View style={inline ? styles.wrapInline : styles.wrap}>
      {statsLine && <Text style={textStyle}>{statsLine}</Text>}
      <Text style={textStyle}>
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
    wrapInline: {
      // Phase 27 F4 — inline mode strips the standalone wrap chrome
      // so the disclaimer text lines flow naturally with the rest of
      // the merged footer block. Outer footer container in journal.tsx
      // owns the horizontal/vertical padding for the merged unit.
    },
    text: {
      fontSize: 9.5,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      lineHeight: 15,
    },
    textInline: {
      // Phase 27 F4 — same type + color as `text` but left-aligned to
      // sit in line with the eyebrow + building-toward line above.
      fontSize: 9.5,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
      lineHeight: 15,
    },
  });

export default JournalDisclaimer;
