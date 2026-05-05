// ============================================================================
// RECENT WINDOW CARD — Phase 5.11
//
// Renamed and relocated from components/journal/JournalPatternLink.tsx.
// Now-and-Journal are today-focused; longitudinal stats belong on
// Insights, which dedicates itself to patterns over time.
//
// The card itself is unchanged in behavior and styling — single tappable
// row showing the first sentence of the top-ranked pattern's `context`.
// Tap routes to /(tabs)/understand?scrollTo={id} for the deep-link scroll;
// since the card now LIVES on Insights, the tap is mostly a scroll
// affordance to a more detailed pattern card lower on the page.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { Sizing } from '../../theme/theme-tokens';

export interface PatternHeadline {
  id: string;
  title: string;
  /** Full context paragraph from the pattern engine. We only use sentence 1. */
  context?: string;
}

export interface RecentWindowCardProps {
  topPattern: PatternHeadline | null;
}

function firstSentence(input: string | undefined): string {
  if (!input) return '';
  // Match the first run of non-terminal characters plus its terminator.
  const m = input.match(/^[^.!?]+[.!?]?/);
  return (m ? m[0] : input).trim();
}

export function RecentWindowCard({ topPattern }: RecentWindowCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!topPattern) return null;

  const headline = firstSentence(topPattern.context) || topPattern.title;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate(`/(tabs)/understand?scrollTo=${topPattern.id}`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Pattern: ${topPattern.title}. Open in Insights.`}
    >
      <Text style={styles.glyph}>{'📊'}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{'This week'}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{headline}</Text>
      </View>
      <Text style={styles.chevron}>{'›'}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // Phase 5d cleanup carries over:
  //   • Symmetric padding via Sizing.cardInternalPadding (12pt) — Phase 2
  //     contract; the prior 10/12 axis split was a pre-spec asymmetry.
  //   • Lavender bg + border routed through caregiverAccent token family
  //     (matches EndOfShiftCard / aiInsightCard). The hardcoded
  //     `rgb(183, 148, 244)` electric-purple was outside the Phase 7
  //     3-accent budget; canonical lavender is `rgb(170, 138, 220)`.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentBorder,
    borderRadius: 8,
    padding: Sizing.cardInternalPadding,
    gap: 10,
  },
  glyph: {
    fontSize: 11,
    color: c.caregiverAccent,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 10,
    color: c.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  chevron: {
    fontSize: 14,
    color: c.caregiverAccent,
  },
});

export default RecentWindowCard;
