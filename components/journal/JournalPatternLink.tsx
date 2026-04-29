// ============================================================================
// JOURNAL PATTERN LINK
// Demoted Patterns surface — Journal acknowledges in passing, Insights
// analyzes in depth. Single tappable card that takes only the headline
// sentence from the existing pattern engine and routes to the Insights tab.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';

export interface PatternHeadline {
  id: string;
  title: string;
  /** Full context paragraph from the pattern engine. We only use sentence 1. */
  context?: string;
}

export interface JournalPatternLinkProps {
  topPattern: PatternHeadline | null;
}

function firstSentence(input: string | undefined): string {
  if (!input) return '';
  // Match the first run of non-terminal characters plus its terminator.
  const m = input.match(/^[^.!?]+[.!?]?/);
  return (m ? m[0] : input).trim();
}

export function JournalPatternLink({ topPattern }: JournalPatternLinkProps) {
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(183, 148, 244, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(183, 148, 244, 0.18)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
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

export default JournalPatternLink;
