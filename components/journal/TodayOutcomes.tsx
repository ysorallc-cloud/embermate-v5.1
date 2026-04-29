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
      iconBg: (colors as any).errorTint || 'rgba(248, 113, 113, 0.15)',
      iconFg: colors.error,
      countColor: colors.error,
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
      iconBg: (colors as any).warningLight || 'rgba(251, 191, 36, 0.10)',
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
      iconBg: (colors as any).accentTint || 'rgba(52, 211, 153, 0.15)',
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
      <View style={styles.body}>
        {rows.map((r, i) => {
          const isLast = i === rows.length - 1;
          const RowWrapper: any = onRowPress ? Text : View;
          return (
            <View
              key={r.variant}
              style={[styles.row, !isLast && styles.rowDivider]}
              accessibilityLabel={`${r.count} ${r.displayLabel}: ${r.detail}`}
              accessibilityRole={onRowPress ? 'button' : 'text'}
              onTouchEnd={onRowPress ? () => onRowPress(r.variant) : undefined}
            >
              <View style={[styles.iconCircle, { backgroundColor: r.iconBg }]}>
                <Text style={[styles.iconGlyph, { color: r.iconFg }]}>{r.glyph}</Text>
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
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    iconGlyph: {
      fontSize: 10,
      fontWeight: '600',
    },
    count: {
      fontSize: 16,
      fontWeight: '500',
      minWidth: 18,
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
