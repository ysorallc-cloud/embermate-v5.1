// ============================================================================
// PATTERN STACK — Phase 15.9
//
// Wraps the "EmberMate noticed" pattern section in a single outer
// collapse so it doesn't dominate vertical real estate when the
// user isn't engaged with it.
//
// Pre-15.9 understand.tsx rendered three inline cards stacked
// vertically with per-card expand/collapse driven by an
// expandedCorrelation useState. 15.9 moves that machinery here:
//   • Outer collapse default = closed; tap header to expand.
//   • Expanded body keeps the per-card expand behavior unchanged
//     (expandedCorrelation = 0 on first expand → first card pre-
//     open, matching pre-15.9 initial state).
//   • State is session-scoped: a fresh mount returns to collapsed.
//
// Eyebrow ownership: PatternStack owns the "EmberMate noticed"
// eyebrow and the sublabel. Bundling them with the cards keeps
// the surface conceptually whole; understand.tsx renders only
// <PatternStack patterns={correlationCards} />.
//
// Dimension chip derivation: from each pattern's title via the
// same keyword set the inner pill labels use (Sleep / Mood /
// Meals / BP / Meds / Water). Single source of truth — outer
// chips and inner pills cannot drift.
//
// Witness voice: "{N} patterns worth mentioning" mirrors the
// existing sublabel copy. No urgency framing.
// ============================================================================

import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { SectionEyebrow } from '../SectionEyebrow';
import type { CorrelationCard } from '../../utils/understandInsights';

const SEVERITY = {
  high: { bg: 'rgba(239,68,68,0.06)', border: Colors.coralBright, badge: 'rgba(239,68,68,0.15)', badgeText: '#FCA5A5' },
  medium: { bg: 'rgba(245,158,11,0.06)', border: Colors.amberBright, badge: 'rgba(245,158,11,0.15)', badgeText: '#FCD34D' },
  low: { bg: 'rgba(96,165,250,0.06)', border: '#60A5FA', badge: 'rgba(96,165,250,0.15)', badgeText: '#93C5FD' },
};

function patternSeverity(card: CorrelationCard): 'high' | 'medium' | 'low' {
  if (card.confidence === 'strong' && card.coefficient > 0.7) return 'high';
  if (card.confidence === 'strong') return 'medium';
  return 'low';
}

// Single derivation rule for dimension labels — shared between the
// collapsed header chips and the per-card pills inside the cards.
function dimensionsFromTitle(title: string): string[] {
  const t = title.toLowerCase();
  const out: string[] = [];
  if (t.includes('sleep')) out.push('Sleep');
  if (t.includes('mood') || t.includes('energy')) out.push('Mood');
  if (t.includes('meal') || t.includes('lunch') || t.includes('appetite')) out.push('Meals');
  if (t.includes('bp') || t.includes('blood pressure')) out.push('BP');
  if (t.includes('medication') || t.includes('med')) out.push('Meds');
  if (t.includes('hydration') || t.includes('water')) out.push('Water');
  return out;
}

function uniqueDimensionsFor(patterns: CorrelationCard[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of patterns) {
    for (const d of dimensionsFromTitle(p.title)) {
      if (!seen.has(d)) {
        seen.add(d);
        out.push(d);
      }
    }
  }
  return out;
}

export interface PatternStackProps {
  patterns: CorrelationCard[];
}

export function PatternStack({ patterns }: PatternStackProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Outer collapse — closed by default, session-scoped.
  const [isOpen, setIsOpen] = useState(false);

  // Inner per-card expand — preserved from pre-15.9 behavior. First
  // card pre-open the moment the outer section is expanded.
  const [expandedCorrelation, setExpandedCorrelation] = useState<number | null>(0);
  const chevronAnims = useRef<Animated.Value[]>([]).current;
  while (chevronAnims.length < patterns.length) {
    chevronAnims.push(new Animated.Value(chevronAnims.length === 0 ? 1 : 0));
  }

  const toggleCorrelation = (index: number) => {
    const isExpanding = expandedCorrelation !== index;
    if (expandedCorrelation !== null && expandedCorrelation < chevronAnims.length) {
      Animated.timing(chevronAnims[expandedCorrelation], {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
    }
    if (isExpanding && index < chevronAnims.length) {
      Animated.timing(chevronAnims[index], {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    }
    setExpandedCorrelation(isExpanding ? index : null);
  };

  if (patterns.length === 0) return null;

  const count = patterns.length;
  const countLabel = `${count} pattern${count === 1 ? '' : 's'} worth mentioning`;
  const dimensions = uniqueDimensionsFor(patterns);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        testID="pattern-stack-header"
        style={styles.summaryCard}
        onPress={() => setIsOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${countLabel}. Tap to ${isOpen ? 'collapse' : 'expand'}.`}
      >
        <SectionEyebrow text="EmberMate noticed" />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>{countLabel}</Text>
          <Text style={styles.summaryChevron}>{isOpen ? '▲' : '▼'}</Text>
        </View>
        {dimensions.length > 0 && (
          <View style={styles.chipRow}>
            {dimensions.map((d) => (
              <View key={d} style={styles.chip}>
                <Text style={styles.chipText}>{d}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.expandedBody}>
          <Text style={styles.sublabel}>
            {'Patterns worth mentioning at the next appointment.'}
          </Text>

          {patterns.map((card, i) => {
            const sev = SEVERITY[patternSeverity(card)];
            const isCardExpanded = expandedCorrelation === i;
            const rotate = i < chevronAnims.length
              ? chevronAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                })
              : '0deg';

            const metricsPills = dimensionsFromTitle(card.title);

            return (
              <View key={card.id} style={[styles.correlationCard, { borderColor: `${sev.border}20` }]}>
                <TouchableOpacity
                  style={styles.correlationHeader}
                  onPress={() => toggleCorrelation(i)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title}, tap to ${isCardExpanded ? 'collapse' : 'expand'}`}
                >
                  <View style={styles.correlationMeta}>
                    <View style={[styles.severityBadge, { backgroundColor: sev.badge }]}>
                      <Text style={[styles.severityBadgeText, { color: sev.badgeText }]}>
                        {patternSeverity(card)}
                      </Text>
                    </View>
                    {metricsPills.map((m, j) => (
                      <View key={j} style={styles.metricPill}>
                        <Text style={styles.metricPillText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.correlationTitleRow}>
                    <Text style={styles.correlationTitle}>{card.title}</Text>
                    <Animated.Text style={[styles.correlationChevron, { transform: [{ rotate }] }]}>
                      {'▼'}
                    </Animated.Text>
                  </View>
                  <Text style={styles.correlationSummary}>{card.insight}</Text>
                </TouchableOpacity>

                {isCardExpanded && (
                  <View style={styles.correlationExpanded}>
                    <Text style={styles.evidenceLabel}>{'Evidence'}</Text>
                    <View style={styles.evidenceList}>
                      <View style={styles.evidenceItem}>
                        <Text style={styles.evidenceBullet}>{'●'}</Text>
                        <Text style={styles.evidenceText}>
                          {`Based on ${card.dataPoints} days of tracking data`}
                        </Text>
                      </View>
                      <View style={styles.evidenceItem}>
                        <Text style={styles.evidenceBullet}>{'●'}</Text>
                        <Text style={styles.evidenceText}>
                          {card.confidence === 'strong'
                            ? 'Strong statistical correlation detected'
                            : 'Emerging pattern — more data will clarify'}
                        </Text>
                      </View>
                    </View>

                    {card.suggestion && (
                      <View style={styles.recommendationBox}>
                        <Text style={styles.recommendationIcon}>{'💡'}</Text>
                        <Text style={styles.recommendationText}>{card.suggestion}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },

  summaryCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    padding: 14,
  },
  // Phase 15.12 — local eyebrow style retired; SectionEyebrow
  // owns the typography. A small marginBottom on summaryRow keeps
  // the visual breathing space the old eyebrow's marginBottom 6
  // used to provide.
  summaryRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  summaryChevron: {
    fontSize: 10,
    color: c.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 11,
    color: c.textMuted,
  },

  expandedBody: {
    marginTop: 10,
  },
  sublabel: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 12,
    lineHeight: 19,
  },

  correlationCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  correlationHeader: {
    padding: 14,
  },
  correlationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  metricPillText: {
    fontSize: 11,
    color: c.textMuted,
  },
  correlationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  correlationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  correlationChevron: {
    fontSize: 10,
    color: c.textTertiary,
    marginTop: 6,
  },
  correlationSummary: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
  correlationExpanded: {
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingBottom: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderTopWidth: 1,
    borderTopColor: c.hairlineInset,
  },
  evidenceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  evidenceList: {
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  evidenceBullet: {
    fontSize: 6,
    color: c.textTertiary,
    marginTop: 5,
  },
  evidenceText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 8,
    padding: 10,
  },
  recommendationIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  recommendationText: {
    fontSize: 13,
    color: c.accent,
    lineHeight: 19,
    fontWeight: '500',
    flex: 1,
  },
});

export default PatternStack;
