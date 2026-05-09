// ============================================================================
// AFFIRMATION HEADER
// Ambient daily affirmation rendered at the top of the You tab. Serif italic,
// narrow column, low-key but readable. Not interactive — VoiceOver announces
// it as "Today's reflection: [line]" so it reads as context, not a control.
//
// Phase 11.2 — accepts an optional `witness` prop. When non-null, the
// witness line replaces the generic affirmation. Same styling, same
// voice — the user shouldn't be able to tell which they're getting.
// Fetching lifts to support.tsx (Phase 11.3) so the screen owns a
// single fetch + multi-pipeline refresh; this component is display-only.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getDailyAffirmation } from '../../utils/dailyAffirmation';
import type { WitnessSignal } from '../../utils/caregiverWitnessBuilder';

export interface AffirmationHeaderProps {
  /** Override for tests / storybook. Defaults to today's affirmation. */
  date?: Date;
  /** Caregiver-witness signal from the screen-level fetch. When non-null,
   *  the witness line replaces the generic daily affirmation. */
  witness?: WitnessSignal | null;
}

export function AffirmationHeader({ date, witness }: AffirmationHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const line = useMemo(
    () => (witness ? witness.line : getDailyAffirmation(date)),
    [witness, date],
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Today's reflection: ${line}`}
    >
      <Text style={styles.text}>{line}</Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    // Phase 2 (You tab content warmth) — generous padding gives the
    // affirmation breathing room, since it carries the emotional thesis.
    paddingTop: 10,
    paddingBottom: 22, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    // Phase 7.1 — bump to 18pt / 30 line-height so the affirmation has
    // presence proportional to its emotional weight on the You tab.
    // Stays the warmest line on the page; same voice (serif italic),
    // larger volume.
    fontSize: 18,
    lineHeight: 30, // 1.65 × 18, rounded
    letterSpacing: 0.1,
    color: (c as any).youAffirmationText || c.textPrimary,
    textAlign: 'center',
    maxWidth: 320,
  },
});
