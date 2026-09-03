// ============================================================================
// INSIGHTS EMPTY-STATE PREVIEW
//
// Shown on the Insights tab when the patient has fewer than 14 days of
// tracked data. Three JournalSection cards per Phase 33b extension Lock 4:
//
//   1. "Patterns coming"           — sage tint. Countdown to 14 days
//                                    (progress bar + remaining days
//                                    label).
//   2. "What we'll be watching for" — neutral tint. Four pattern previews
//                                    + reassuring italic footer.
//   3. "Tip"                       — neutral tint, conditionally rendered
//                                    via showTipCard. Redirect to start
//                                    logging from Now.
//
// Returns null when daysOfData >= 14 so the screen falls through to the
// real Insights content.
//
// Phase 33b extension Lock 4 changes (Phase 28 Batch B → 33b extension):
//   • Pre-fix: single watchingCard wrapped both halves with a hairline
//     divider — read as one container, no demarcation. Patterns Coming
//     and What We'll Be Watching For collapsed into a shared chrome.
//   • Post-fix: each section is its own JournalSection card with its
//     own tint. Matches the populated-state card model
//     (InsightsReadCard sage + InsightsDataCard neutral).
//   • Hardcoded spacings (13/14/11/10/4) → Spacing.s* canon tokens.
//   • Sub-canon font sizes (9.5/8.5/10.5) → canon scale (11/10/12).
//   • tipCard's bespoke border-only chrome → JournalSection tint="neutral"
//     primitive (same chrome as the watching card; all three cards
//     consistent).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Fonts, Spacing } from '../../theme/theme-tokens';
import { JournalSection } from '../journal/JournalSection';
import { possessive } from '../../utils/text/possessive';

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

// Phase 6.3 — caregiver-voice rewrite. Same four observation themes,
// neutral pronouns, plain-spoken phrasing.
const PATTERN_PREVIEWS: PatternPreview[] = [
  {
    icon: '📊',
    description: "If rough nights show up in the morning's BP.",
    when: '~2 wks',
  },
  {
    icon: '💊',
    description: 'Whether missed doses fall on the same days or follow rough nights.',
    when: '~2 wks',
  },
  {
    icon: '💧',
    description: 'If drinking more water shows up in energy or pain.',
    when: '~3 wks',
  },
  {
    icon: '🌅',
    description: 'Whether calm days and rough days fall on a pattern.',
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
    ? `Once ${possessive(patientName)} data is steady.`
    : 'Once data is steady.';

  return (
    <View testID="insights-empty-state-preview">
      {/* ─── Card 1: Patterns coming (sage) ─── */}
      <JournalSection eyebrow="Patterns coming" tint="sage">
        <View testID="insights-progress-track" style={styles.progressBar}>
          <View
            testID="insights-progress-fill"
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (daysOfData / 14) * 100)}%` },
            ]}
          />
        </View>
        <Text testID="insights-progress-label" style={styles.progressLabel}>
          {`${daysOfData} of 14 days`}
        </Text>
        <Text style={styles.patternsHeadline}>
          {`${remainingLabel}, then trends appear.`}
        </Text>
        <Text style={styles.patternsSubtitle}>
          {'~2 weeks of tracking before patterns emerge.'}
        </Text>
      </JournalSection>

      {/* ─── Card 2: What we'll be watching for (neutral) ─── */}
      <JournalSection eyebrow="What we'll be watching for" tint="neutral">
        <Text style={styles.watchingHeaderSubtitle}>{watchingSubtitle}</Text>

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
      </JournalSection>

      {/* ─── Card 3: Tip (neutral) — redirect to start logging ─── */}
      {showTipCard && (
        <JournalSection eyebrow="Tip" tint="neutral">
          <View testID="insights-tip-card" style={styles.tipRow}>
            <Text style={styles.tipIcon}>{'💡'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipHeadline}>Start logging from Now</Text>
              <Text style={styles.tipSubtitle}>
                Meds, vitals, or mood — all anchor patterns.
              </Text>
            </View>
          </View>
        </JournalSection>
      )}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // ── Card 1: Patterns coming ──
  // Slim progress bar + countdown. Sage progress fill matches the
  // JournalSection's sage tint outer border — legitimate progress
  // signal, not competing chrome.
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 240, 215, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: c.textTertiary,
    marginTop: Spacing.s1,
    marginBottom: Spacing.s2,
  },
  patternsHeadline: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: Spacing.s1,
    lineHeight: 18,
  },
  patternsSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // ── Card 2: What we'll be watching for ──
  watchingHeaderSubtitle: {
    fontFamily: Fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
    marginBottom: Spacing.s2,
  },
  watchingBody: {
    paddingVertical: Spacing.s2,
  },
  watchingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.s4, // Lock 4 key breathing-room fix (was 11)
    gap: Spacing.s3,
  },
  watchingRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  watchingIcon: {
    fontSize: 14,
    opacity: 0.7,
    paddingTop: 1,
    width: 20,
  },
  watchingDescription: {
    flex: 1,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
  // Phase 6.4 — neutral colour, not sage. Future-time estimates are
  // informational, not progress; sage stays reserved for the
  // JournalSection card-1 tint + progress fill.
  watchingWhen: {
    fontSize: 10,
    fontWeight: '500',
    color: c.textSecondary,
    flexShrink: 0,
    paddingTop: 2,
  },
  watchingFooter: {
    paddingTop: Spacing.s3,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
  },
  watchingFooterText: {
    fontSize: 11,
    color: c.textTertiary,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // ── Card 3: Tip (redirect) ──
  // Chrome now lives in JournalSection tint="neutral"; this style block
  // only carries the inner row layout + typography.
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s3,
  },
  tipIcon: {
    fontSize: 18,
    paddingTop: 1,
  },
  tipHeadline: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  tipSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
});

export default InsightsEmptyStatePreview;
