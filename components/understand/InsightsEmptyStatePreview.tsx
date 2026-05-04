// ============================================================================
// INSIGHTS EMPTY-STATE PREVIEW
//
// Shown on the Insights tab when the patient has fewer than 14 days of
// tracked data. Two cards:
//   1. "Patterns coming" — countdown to 14 days, sage-tinted card.
//   2. "What we'll be watching for" — four pattern previews + reassuring
//      footer that nothing requires waiting.
//
// Returns null when daysOfData >= 14 so the screen falls through to the
// real Insights content.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface InsightsEmptyStatePreviewProps {
  daysOfData: number;
  patientName?: string;
  /**
   * Phase 3.7.3 — gate the tip card by Insights state.
   *   • empty:    show (the user has nothing logged yet — actionable hint).
   *   • building: hide (they're already logging — the tip is redundant).
   *   • populated: caller doesn't render this component at all.
   * Defaults true for back-compat with pre-3.7.3 callers.
   */
  showTipCard?: boolean;
}

interface PatternPreview {
  icon: string;
  description: string;
  when: string;
}

const PATTERN_PREVIEWS: PatternPreview[] = [
  {
    icon: '📊',
    description: 'Whether sleep quality affects her BP readings the next morning.',
    when: '~2 wks',
  },
  {
    icon: '💊',
    description: 'If skipped doses cluster on certain days or after poor sleep.',
    when: '~2 wks',
  },
  {
    icon: '💧',
    description: 'Whether hydration affects her energy and pain levels.',
    when: '~3 wks',
  },
  {
    icon: '🌅',
    description: 'Mood patterns through the week — when calm and rough days tend to fall.',
    when: '~4 wks',
  },
];

const PATIENT_FALLBACK_NAMES = new Set(['Patient', 'patient', 'your loved one']);

export function InsightsEmptyStatePreview({
  daysOfData,
  patientName,
  showTipCard = true,
}: InsightsEmptyStatePreviewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Fall through to the real Insights content once 2 weeks have accumulated.
  if (daysOfData >= 14) return null;

  const remaining = Math.max(1, 14 - daysOfData);
  const remainingLabel = `${remaining} more day${remaining === 1 ? '' : 's'}`;

  // If the patient name didn't resolve cleanly, use the generic framing
  // rather than literally rendering "Patient".
  const usePatientName =
    typeof patientName === 'string' &&
    patientName.length > 0 &&
    !PATIENT_FALLBACK_NAMES.has(patientName);
  const watchingSubtitle = usePatientName
    ? `Once ${patientName}'s data is steady.`
    : 'Once data is steady.';

  return (
    <View>
      {/* ── Consolidated empty-state card ──
          Patterns Coming countdown + What we'll be watching for, separated
          by a hairline. Phase 4 visual-consistency: collapses what used to
          be three stacked empty-state cards (with overlapping copy) into
          one. */}
      <View
        testID="insights-consolidated-card"
        style={styles.watchingCard}
        accessibilityLabel={`${remainingLabel}, then we'll show you trends.`}
      >
        {/* Top half — patterns coming countdown */}
        <View style={styles.consolidatedTop}>
          <Text style={styles.patternsEyebrow}>{'PATTERNS COMING'}</Text>
          <Text style={styles.patternsHeadline}>
            {`${remainingLabel}, then trends appear.`}
          </Text>
          <Text style={styles.patternsSubtitle}>
            {'~2 weeks of tracking before patterns emerge.'}
          </Text>
        </View>

        {/* Hairline divider between halves */}
        <View style={styles.hairlineDivider} />

        {/* Bottom half — what we'll be watching for */}
        <View style={styles.watchingHeader}>
          <Text style={styles.watchingEyebrow}>{"WHAT WE'LL BE WATCHING FOR"}</Text>
          <Text style={styles.watchingHeaderSubtitle}>{watchingSubtitle}</Text>
        </View>

        <View style={styles.watchingBody}>
          {PATTERN_PREVIEWS.map((p, i) => {
            const isLast = i === PATTERN_PREVIEWS.length - 1;
            return (
              <View
                key={p.description}
                style={[styles.watchingRow, !isLast && styles.watchingRowDivider]}
              >
                <Text style={styles.watchingIcon}>{p.icon}</Text>
                <Text style={styles.watchingDescription}>{p.description}</Text>
                <Text testID={`insights-watching-when-${i}`} style={styles.watchingWhen}>
                  {p.when}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.watchingFooter}>
          <Text style={styles.watchingFooterText}>
            {'These appear as you go. No need to wait.'}
          </Text>
        </View>
      </View>

      {/* ── Tip card (border-only, redirect not placeholder) ── */}
      {showTipCard && (
        <View testID="insights-tip-card" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>{'💡'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipHeadline}>Start logging from Now</Text>
              <Text style={styles.tipSubtitle}>
                Meds, vitals, or mood — all anchor patterns.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // ── Patterns coming card ──
  patternsCard: {
    backgroundColor: 'rgba(95, 184, 138, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(95, 184, 138, 0.22)',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  patternsEyebrow: {
    fontSize: 8.5,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.accent,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  patternsHeadline: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  patternsSubtitle: {
    fontSize: 10.5,
    color: c.textSecondary,
    lineHeight: 15.75,
  },

  // ── Consolidated card halves ──
  // Top half — patterns coming countdown. Sage-tinted background like the
  // legacy patternsCard so the countdown still reads as a sage block,
  // even sitting inside the unified card.
  consolidatedTop: {
    backgroundColor: 'rgba(95, 184, 138, 0.05)',
    paddingHorizontal: 13,
    paddingVertical: 16, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  // Hairline divider between the halves of the consolidated card.
  hairlineDivider: {
    height: 0.5,
    backgroundColor: c.hairlineInset,
  },

  // ── What we'll be watching card ──
  // Used as the consolidated container in Phase 4. Outer border + radius
  // wraps both halves; the patterns top inherits this card surface.
  watchingCard: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 11,
    overflow: 'hidden',
    marginBottom: 14, // allow: off-scale gap (intentional)
    // Card holds rows with their own padding; symmetric per Phase 2 contract.
    padding: 0,
  },
  watchingHeader: {
    paddingTop: 11,
    paddingBottom: 10,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(255, 235, 205, 0.025)',
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  watchingEyebrow: {
    fontSize: 8.5,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  watchingHeaderSubtitle: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 11,
    lineHeight: 15.4,
    color: c.textSecondary,
  },
  watchingBody: {
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  watchingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 10,
  },
  watchingRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  watchingIcon: {
    fontSize: 12,
    opacity: 0.7,
    paddingTop: 1,
    width: 18,
  },
  watchingDescription: {
    flex: 1,
    fontSize: 10.5,
    color: c.textSecondary,
    lineHeight: 14.7,
  },
  watchingWhen: {
    fontSize: 8.5,
    fontWeight: '500',
    color: c.accent,
    flexShrink: 0,
    paddingTop: 2,
  },
  watchingFooter: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
  },
  watchingFooterText: {
    fontSize: 10,
    color: c.textTertiary,
    fontStyle: 'italic',
    lineHeight: 14,
  },

  // ── Tip card — border-only, no fill (redirect not placeholder) ──
  tipCard: {
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipIcon: {
    fontSize: 16,
    paddingTop: 1,
  },
  tipHeadline: {
    fontSize: 12.5,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  tipSubtitle: {
    fontSize: 10.5,
    color: c.textSecondary,
    lineHeight: 14.7,
  },
});

export default InsightsEmptyStatePreview;
