// ============================================================================
// NARRATIVE VIEW — UX-restructure (Commit 8)
//
// Renders a past-day recap: prose summary + summary pills, notable moments,
// and the saved past-day notes block. Today still uses the live outcomes
// + handoff layout; this view is mounted only when the caregiver scrolls
// back to a non-today date.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import {
  buildDayNarrative,
  type DayNarrative,
  type NarrativeTone,
} from '../../utils/narrativeSummaryBuilder';
import { logError } from '../../utils/devLog';

interface NarrativeViewProps {
  dateKey: string; // YYYY-MM-DD
}

const SHORT_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return `${SHORT_WEEKDAYS[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function NarrativeView({ dateKey }: NarrativeViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [narrative, setNarrative] = useState<DayNarrative | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = await buildDayNarrative(dateKey);
        if (!cancelled) setNarrative(n);
      } catch (err) {
        logError('NarrativeView.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  if (!narrative) return null;

  const toneColor = (t: NarrativeTone): string => {
    if (t === 'good') return colors.accent;
    if (t === 'concern') return colors.error;
    return colors.textSecondary;
  };

  return (
    <View style={styles.wrap}>
      {/* Prose summary card */}
      <View style={styles.narrativeCard}>
        <Text style={styles.eyebrow}>{`RECAP · ${dayLabel(dateKey)}`}</Text>
        {narrative.summaryPills.length > 0 && (
          <View style={styles.pillRow}>
            {narrative.summaryPills.map((p, i) => (
              <View
                key={`pill-${i}`}
                style={[
                  styles.summaryPill,
                  { borderColor: toneColor(p.tone), backgroundColor: 'transparent' },
                ]}
              >
                <Text style={[styles.summaryPillText, { color: toneColor(p.tone) }]}>
                  {p.label}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.summaryText}>{narrative.summary}</Text>
      </View>

      {/* Notable moments — surfaced inline. */}
      {narrative.notableMoments.length > 0 && (
        <View style={styles.notableSection}>
          <Text style={styles.sectionLabel}>{'NOTABLE'}</Text>
          {narrative.notableMoments.map((m, i) => (
            <View
              key={`moment-${i}`}
              style={[
                styles.notableMoment,
                { borderLeftColor: toneColor(m.tone) },
              ]}
            >
              <Text style={styles.notableIcon}>{m.icon}</Text>
              <View style={styles.notableBody}>
                <Text style={styles.notableTime}>{m.time}</Text>
                <Text style={styles.notableText}>{m.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Past-day notes — read-only echo of the caregiver's saved reflection. */}
      {narrative.notes && (
        <View style={styles.pastNotes}>
          <Text style={styles.sectionLabel}>{'NOTES THAT DAY'}</Text>
          <Text style={styles.pastNotesText}>{narrative.notes}</Text>
        </View>
      )}

      {!narrative.hasData && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{'Nothing was logged on this day.'}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    wrap: {
      marginTop: Spacing.sm,
    },
    narrativeCard: {
      padding: Sizing.cardInternalPadding,
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
      marginBottom: 8,
    },
    pillRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
      marginBottom: 8,
    },
    summaryPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 0.5,
    },
    summaryPillText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 20,
      color: c.textPrimary,
    },
    notableSection: {
      marginTop: Spacing.sm,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
      marginBottom: 6,
    },
    notableMoment: {
      flexDirection: 'row' as const,
      padding: Sizing.cardInternalPadding,
      backgroundColor: c.glass,
      borderRadius: Sizing.cardRadius,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderLeftWidth: 3,
      marginBottom: 6,
      alignItems: 'center' as const,
    },
    notableIcon: {
      fontSize: 16,
      marginRight: 10,
    },
    notableBody: {
      flex: 1,
    },
    notableTime: {
      fontSize: 11,
      color: c.textTertiary,
      marginBottom: 1,
    },
    notableText: {
      fontSize: 13,
      color: c.textPrimary,
    },
    pastNotes: {
      marginTop: Spacing.sm,
      padding: Sizing.cardInternalPadding,
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
    },
    pastNotesText: {
      fontSize: 13,
      lineHeight: 19,
      color: c.textPrimary,
    },
    emptyState: {
      marginTop: Spacing.sm,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
    },
    emptyStateText: {
      fontSize: 13,
      color: c.textTertiary,
    },
  });

export default NarrativeView;
