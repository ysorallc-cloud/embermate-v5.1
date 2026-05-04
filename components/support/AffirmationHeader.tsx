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
    paddingBottom: 22,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 13.5,
    lineHeight: 23, // 1.7 × 13.5
    letterSpacing: 0.1,
    color: (c as any).youAffirmationText || c.textPrimary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
