// ============================================================================
// PATTERNS ZONE — F7 Insights C4 (2026-06-12).
//
// One coral-bordered card per CorrelationCard, capped at 3 (matches the
// prior InsightsReadCard cap rationale: beyond that the surface reads as
// a long list rather than a focused callout). Renders inside the Insights
// page's z1 Patterns zone with the "📈 PATTERNS · understand" eyebrow.
//
// Returns null when patterns is empty so the zone collapses cleanly on
// quiet days. The parent doesn't need to gate.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts } from '../../theme/theme-tokens';
import {
  CARD_PADDING_H,
  CARD_PADDING_V,
  CardBorder,
  TITLE_CLEARANCE,
  TypeScale,
  ZoneTint,
} from '../../theme/spacing';
import type { CorrelationCard } from '../../utils/understandInsights';

export interface PatternsZoneProps {
  patterns: CorrelationCard[];
}

const PATTERN_CAP = 3;
const CARD_GAP = 10;

export function PatternsZone({ patterns }: PatternsZoneProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const visible = patterns.slice(0, PATTERN_CAP);
  if (visible.length === 0) return null;

  return (
    <View style={styles.zone} testID="insights-patterns-zone">
      <Text style={styles.eyebrow}>
        {'📈 '}
        <Text style={styles.eyebrowLabel}>PATTERNS</Text>
        <Text style={styles.eyebrowVerb}>{' · understand'}</Text>
      </Text>
      <View style={styles.cards}>
        {visible.map((p, idx) => (
          <View
            key={p.id}
            style={[styles.card, idx > 0 && { marginTop: CARD_GAP }]}
            testID={`pattern-card-${p.id}`}
          >
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardInsight}>{p.insight}</Text>
            {p.suggestion && !p.suggestionDismissed && (
              <Text style={styles.cardSuggestion}>{p.suggestion}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    zone: {
      backgroundColor: ZoneTint.z1,
      paddingTop: CARD_PADDING_V,
      paddingBottom: CARD_PADDING_V,
      paddingHorizontal: CARD_PADDING_H,
      borderRadius: 12,
    },
    eyebrow: {
      ...TypeScale.micro,
      color: c.textTertiary,
      marginBottom: TITLE_CLEARANCE - CARD_PADDING_V,
    },
    eyebrowLabel: {
      color: c.textPrimary,
    },
    eyebrowVerb: {
      color: c.textTertiary,
      fontWeight: '400',
      letterSpacing: 0.3,
      textTransform: 'lowercase',
    },
    cards: {
      // Body owns vertical rhythm via the per-card marginTop above.
    },
    card: {
      borderWidth: 1,
      borderColor: CardBorder.coral,
      borderRadius: 12,
      paddingVertical: CARD_PADDING_V,
      paddingHorizontal: CARD_PADDING_H,
    },
    cardTitle: {
      ...TypeScale.body,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 4,
    },
    cardInsight: {
      ...TypeScale.body,
      fontFamily: Fonts.serif,
      lineHeight: 20,
      color: c.textSecondary,
    },
    cardSuggestion: {
      ...TypeScale.secondary,
      fontFamily: Fonts.serifItalic,
      color: c.textMuted,
      marginTop: 6,
    },
  });

export default PatternsZone;
