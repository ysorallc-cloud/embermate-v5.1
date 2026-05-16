// ============================================================================
// INSIGHTS READ CARD — Phase 28 Section 1 (THE READ).
//
// Sage-encoded section card consolidating the pre-28 "This week's pulse"
// prose summary and the PatternStack "EmberMate noticed" surface into a
// single observation card.
//
// Layout:
//   • Eyebrow "THE READ · {N} DAYS" (inside JournalSection chrome)
//   • Gestalt prose opener — Georgia italic; from generateOneLineGestalt.
//     Omitted when the helper returns ''.
//   • Metric grid (2×2): Adherence / Sleep / Hydration / Meals. Tiles
//     always render in fixed order so the rhythm is stable; missing
//     values surface as '—' rather than dropping the tile.
//   • Pattern callout: "{N} patterns worth discussing with a provider:"
//     followed by up to 3 inline pattern lines. Tapping a line toggles
//     the expanded body containing the evidence framing + suggestion
//     (Phase 28 D2 Option A — substantive suggestion text preserved).
//   • Footnote: "For informational purposes only · Not a diagnosis"
//     inside the card at the bottom.
//
// Returns null when the card has no signal to surface — empty gestalt,
// all four metric tiles unavailable, AND no patterns. The parent
// (understand.tsx) does not gate; the card decides for itself.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JournalSection } from '../journal/JournalSection';
import {
  generateOneLineGestalt,
  type CorrelationCard,
  type UnderstandPageData,
  type TimeRange,
} from '../../utils/understandInsights';

export interface InsightsReadCardProps {
  timeRange: TimeRange;
  pageData: UnderstandPageData;
  patterns: CorrelationCard[];
}

interface Metric {
  label: string;
  value: string;
  unit: string;
  available: boolean;
}

function buildMetrics(data: UnderstandPageData): Metric[] {
  const adherenceAvailable = data.dosesScheduled > 0;
  const sleepAvailable = data.avgSleepHours > 0;
  const hydrationAvailable = data.avgHydrationPerDay > 0;
  const mealsAvailable = data.avgMealsPerDay > 0;
  return [
    {
      label: 'Adherence',
      value: adherenceAvailable ? `${Math.round(data.adherenceRate)}` : '—',
      unit: adherenceAvailable ? '%' : '',
      available: adherenceAvailable,
    },
    {
      label: 'Sleep',
      value: sleepAvailable ? data.avgSleepHours.toFixed(1) : '—',
      unit: sleepAvailable ? 'h' : '',
      available: sleepAvailable,
    },
    {
      label: 'Hydration',
      value: hydrationAvailable ? data.avgHydrationPerDay.toFixed(1) : '—',
      unit: hydrationAvailable ? 'glasses' : '',
      available: hydrationAvailable,
    },
    {
      label: 'Meals',
      value: mealsAvailable ? data.avgMealsPerDay.toFixed(1) : '—',
      unit: mealsAvailable ? '/day' : '',
      available: mealsAvailable,
    },
  ];
}

export function InsightsReadCard({ timeRange, pageData, patterns }: InsightsReadCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const gestalt = useMemo(
    () => generateOneLineGestalt(pageData, timeRange),
    [pageData, timeRange],
  );

  const metrics = useMemo(() => buildMetrics(pageData), [pageData]);

  // Cap patterns at 3 — beyond that the callout reads as a long list
  // rather than a scan-first highlight.
  const visiblePatterns = useMemo(() => patterns.slice(0, 3), [patterns]);

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const hasSignal =
    gestalt.length > 0 ||
    metrics.some((m) => m.available) ||
    visiblePatterns.length > 0;

  if (!hasSignal) return null;

  const eyebrow = `THE READ · ${timeRange} DAYS`;

  return (
    <JournalSection eyebrow={eyebrow} tint="sage">
      {gestalt.length > 0 && (
        <Text style={styles.gestalt}>{gestalt}</Text>
      )}

      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View
            key={m.label}
            testID={`read-metric-${i}`}
            style={styles.metricTile}
          >
            <Text style={styles.metricLabel}>{m.label}</Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, !m.available && styles.metricValueMuted]}>
                {m.value}
              </Text>
              {m.unit ? <Text style={styles.metricUnit}>{m.unit}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {visiblePatterns.length > 0 && (
        <View style={styles.patternsBlock}>
          <Text style={styles.patternsCallout}>
            <Text style={styles.patternsCount}>
              {`${visiblePatterns.length} pattern${visiblePatterns.length === 1 ? '' : 's'}`}
            </Text>
            {' worth discussing with a provider:'}
          </Text>

          {visiblePatterns.map((p, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <View key={p.id}>
                <TouchableOpacity
                  testID={`read-pattern-${i}`}
                  style={styles.patternRow}
                  onPress={() => setExpandedIdx(isExpanded ? null : i)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.title}. Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.patternHeader}>
                    <Text style={styles.patternTitle}>{p.title}</Text>
                    <Text style={styles.patternChevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                  <Text style={styles.patternInsight}>{p.insight}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View
                    testID={`read-pattern-expanded-${i}`}
                    style={styles.patternExpanded}
                  >
                    <Text style={styles.evidenceLine}>
                      {`Based on ${p.dataPoints} days of tracking. `}
                      {p.confidence === 'strong'
                        ? 'Strong statistical correlation detected.'
                        : 'Emerging pattern — more data will clarify.'}
                    </Text>
                    {p.suggestion && (
                      <Text style={styles.suggestionLine}>
                        {`💡 ${p.suggestion}`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.footnote}>
        {'For informational purposes only · Not a diagnosis'}
      </Text>
    </JournalSection>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    gestalt: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 12,
      lineHeight: 18,
      color: c.textSecondary,
      marginBottom: 10,
    },
    metricsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    metricTile: {
      width: '48.5%' as const,
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: 5,
      paddingVertical: 5,
      paddingHorizontal: 7,
    },
    metricLabel: {
      fontSize: 9,
      color: c.textTertiary,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
    },
    metricValueRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      gap: 3,
      marginTop: 2,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    metricValueMuted: {
      color: c.textTertiary,
    },
    metricUnit: {
      fontSize: 10,
      color: c.textSecondary,
    },
    patternsBlock: {
      marginTop: 12,
    },
    patternsCallout: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 6,
    },
    patternsCount: {
      color: c.accent,
      fontWeight: '600' as const,
    },
    patternRow: {
      paddingVertical: 6,
    },
    patternHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    patternTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.textPrimary,
      flex: 1,
    },
    patternChevron: {
      fontSize: 9,
      color: c.textTertiary,
      marginLeft: 8,
    },
    patternInsight: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
      marginTop: 2,
    },
    patternExpanded: {
      paddingTop: 4,
      paddingBottom: 8,
      paddingLeft: 4,
    },
    evidenceLine: {
      fontSize: 10.5,
      color: c.textTertiary,
      lineHeight: 15,
      marginBottom: 4,
    },
    suggestionLine: {
      fontSize: 11,
      color: c.accent,
      lineHeight: 16,
      fontWeight: '500' as const,
    },
    footnote: {
      fontSize: 8,
      fontStyle: 'italic' as const,
      color: c.textTertiary,
      marginTop: 10,
      textAlign: 'center' as const,
    },
  });

export default InsightsReadCard;
