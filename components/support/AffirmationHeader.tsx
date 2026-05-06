// ============================================================================
// AFFIRMATION HEADER
// Ambient daily affirmation rendered at the top of the You tab. Serif italic,
// narrow column, low-key but readable. Not interactive — VoiceOver announces
// it as "Today's reflection: [line]" so it reads as context, not a control.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getDailyAffirmation } from '../../utils/dailyAffirmation';

export interface AffirmationHeaderProps {
  /** Override for tests / storybook. Defaults to today's affirmation. */
  date?: Date;
}

export function AffirmationHeader({ date }: AffirmationHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const line = useMemo(() => getDailyAffirmation(date), [date]);

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
