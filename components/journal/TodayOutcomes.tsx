// ============================================================================
// TODAY'S OUTCOMES — three-row card answering "what happened today".
// Replaces the old "Today at a glance" stats grid AND the "Heads up" alert
// section. Distinct from Now's progress rings; this is outcome-focused.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime } from '../../utils/text/primitives';
import { formatOutcomeDetail } from '../../utils/dailyOutcomes';
import type { DailyOutcomes } from '../../utils/text/types';

export interface TodayOutcomesProps {
  outcomes: DailyOutcomes;
  /** Timestamp shown in the right-side header meta. Defaults to now(). */
  asOf?: Date;
  /** Pass true to render the timestamp in 24-hour form per user setting. */
  use24Hour?: boolean;
  /** Tap handler for the missed/pending rows — opens the detail view. */
  onRowPress?: (variant: 'missed' | 'pending' | 'logged') => void;
}

type Variant = 'missed' | 'pending' | 'logged';

interface RowSpec {
  variant: Variant;
  /** Caregiver-facing label rendered in the row body. Decoupled from
   *  `variant` so we can keep the internal kind name while softening the
   *  visible copy ("not logged", "still to do"). */
  displayLabel: string;
  count: number;
  detail: string;
  glyph: string;
  iconBg: string;
  iconFg: string;
  countColor: string;
}

export function TodayOutcomes({ outcomes, asOf, use24Hour, onRowPress }: TodayOutcomesProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const total = outcomes.missed.count + outcomes.pending.count + outcomes.logged.count;
  if (total === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>{"TODAY'S OUTCOMES"}</Text>
          <Text style={styles.headerMeta}>
            {`as of ${formatTime(asOf ?? new Date(), { format: use24Hour ? '24h' : '12h' })}`}
          </Text>
        </View>
        <Text style={styles.emptyState} accessibilityRole="text">
          Nothing logged yet today.
        </Text>
      </View>
    );
  }

  // v6.7 visual-consistency Phase 3 — Sage-palette tint pairs (bg + border)
  // tied to the canonical accent tokens. Replaces the prior electric-red /
  // electric-amber / electric-mint rgba literals (which were the deprecated
  // #f87171 / #fbbf24 / #34d399 in rgba form).
  const TINT = {
    missed:  { bg: 'rgba(230, 119, 110, 0.14)', border: 'rgba(230, 119, 110, 0.4)' }, // criticalAlert
    pending: { bg: 'rgba(229, 176, 74, 0.14)',  border: 'rgba(229, 176, 74, 0.4)'  }, // warning
    logged:  { bg: 'rgba(95, 184, 138, 0.14)',  border: 'rgba(95, 184, 138, 0.4)'  }, // accent
  } as const;

  const rows: RowSpec[] = [];
  if (outcomes.missed.count > 0) {
    rows.push({
      variant: 'missed',
      displayLabel: 'not logged',
      count: outcomes.missed.count,
      detail: outcomes.missed.items
        ? formatOutcomeDetail(outcomes.missed.items.map((i) => ({ ...i, status: 'missed' })))
        : outcomes.missed.names.join(', '),
      glyph: '⚠',
      iconBg: TINT.missed.bg,
      iconFg: (colors as any).criticalAlert || colors.error,
      countColor: (colors as any).criticalAlert || colors.error,
    });
  }
  if (outcomes.pending.count > 0) {
    rows.push({
      variant: 'pending',
      displayLabel: 'still to do',
      count: outcomes.pending.count,
      detail: outcomes.pending.items
        ? formatOutcomeDetail(outcomes.pending.items.map((i) => ({ ...i, status: 'pending' })))
        : outcomes.pending.names.join(', '),
      glyph: '⏳',
      iconBg: TINT.pending.bg,
      iconFg: colors.warning,
      countColor: colors.textPrimary,
    });
  }
  if (outcomes.logged.count > 0) {
    rows.push({
      variant: 'logged',
      displayLabel: 'logged',
      count: outcomes.logged.count,
      detail: outcomes.logged.summary ?? '',
      glyph: '✓',
      iconBg: TINT.logged.bg,
      iconFg: colors.accent,
      countColor: colors.textPrimary,
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{"TODAY'S OUTCOMES"}</Text>
        <Text style={styles.headerMeta}>
          {`as of ${formatTime(asOf ?? new Date(), { format: use24Hour ? '24h' : '12h' })}`}
        </Text>
      </View>
      <View testID="outcomes-body" style={styles.body}>
        {rows.map((r, i) => {
          const isLast = i === rows.length - 1;
          // The "not logged" row promotes its icon to 34pt with a coloured
          // border to anchor the row as the most-important block on the
          // screen (Phase 3 hierarchy fix). Other variants stay compact.
          const isPromoted = r.variant === 'missed';
          const iconBorderColor =
            r.variant === 'missed' ? 'rgba(230, 119, 110, 0.4)'
            : r.variant === 'pending' ? 'rgba(229, 176, 74, 0.4)'
            : 'rgba(95, 184, 138, 0.4)';
          return (
            <View
              key={r.variant}
              style={[styles.row, !isLast && styles.rowDivider]}
              accessibilityLabel={`${r.count} ${r.displayLabel}: ${r.detail}`}
              accessibilityRole={onRowPress ? 'button' : 'text'}
              onTouchEnd={onRowPress ? () => onRowPress(r.variant) : undefined}
            >
              <View
                testID={`outcome-icon-${r.variant}`}
                style={[
                  isPromoted ? styles.iconCirclePromoted : styles.iconCircle,
                  { backgroundColor: r.iconBg, borderColor: iconBorderColor },
                ]}
              >
                <Text
                  style={[
                    isPromoted ? styles.iconGlyphPromoted : styles.iconGlyph,
                    { color: r.iconFg },
                  ]}
                >
                  {r.glyph}
                </Text>
              </View>
              <Text style={[styles.count, { color: r.countColor }]}>{r.count}</Text>
              <View style={styles.rowText}>
                <Text style={styles.label}>{r.displayLabel}</Text>
                {r.detail.length > 0 && (
                  <Text style={styles.detail} numberOfLines={2}>
                    {r.detail}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 10,
      overflow: 'hidden',
      // Card holds rows with their own padding; symmetric per Phase 2 contract.
      padding: 0,
    },
    // Internal eyebrow header — slight surface tint, separator below.
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingTop: 11,
      paddingBottom: 8,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(255,255,255,0.025)',
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    eyebrow: {
      fontSize: 9,
      fontWeight: '500',
      color: c.textTertiary,
      letterSpacing: 0.5,
    },
    headerMeta: {
      marginLeft: 'auto',
      fontSize: 9,
      color: c.textTertiary,
    },
    body: {
      paddingTop: 4,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
      gap: 10,
    },
    rowDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    iconCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    // v6.7 Phase 3 — promoted variant for the "not logged" row. 34pt circle
    // with a coloured border, anchoring the most-important row as the
    // largest non-title typography on the screen.
    iconCirclePromoted: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    iconGlyph: {
      fontSize: 10,
      fontWeight: '600',
    },
    iconGlyphPromoted: {
      fontSize: 16,
      fontWeight: '600',
    },
    count: {
      fontSize: 18,
      fontWeight: '500',
      minWidth: 22,
      textAlign: 'right',
      marginTop: -2,
    },
    rowText: {
      flex: 1,
    },
    label: {
      fontSize: 11,
      color: c.textPrimary,
      fontWeight: '500',
    },
    detail: {
      fontSize: 10,
      color: c.textSecondary,
      marginTop: 2,
      lineHeight: 14,
    },
    emptyState: {
      fontSize: 12,
      color: c.textTertiary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 14,
    },
  });

export default TodayOutcomes;
