// ============================================================================
// MOOD STRIP — F7 You tab C5 (2026-06-12).
//
// 7-dot mood timeline for the past week. Each day surfaces as either a
// colored circle + emoji (logged mood) or a quiet empty circle (no
// check-in). Below the dots: day labels (Mon/Tue/etc), then a single
// italic-serif line composed by composeWeekRecap — the canonical recap voice
// for the caregiver's week of check-ins.
//
// Empty state: no logged check-ins at all → the 7-dot row is replaced
// by an italic-serif onboarding line so the surface still earns its
// place on the You tab on day 1.
//
// Section header above the strip: "THIS WEEK" micro label. Display-only —
// the "Your wellness →" link (and the /caregiver-wellness sub-page) were
// retired in the You-tab restructure; this strip is the caregiver's own
// read-only week-at-a-glance.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { TypeScale } from '../../theme/spacing';
import {
  composeWeekRecap,
  type WeekRecapDay,
} from '../../utils/text/composers/weekRecap';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOOD_EMOJI: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

function moodColor(mood: 1 | 2 | 3 | 4 | 5): string {
  if (mood <= 2) return '#c06b5a'; // coral — tough day
  if (mood === 3) return '#c98a4a'; // ember — getting by
  return '#7fb88a'; // sage — okay / good
}

export interface MoodStripProps {
  /** 7 days of mood data, oldest-to-newest. The You tab builds this from the
   *  mood_logged event store (the same store the ReflectionCard check-in now
   *  writes to). composeWeekRecap is the canonical recap voice.
   *  Display-only — no tap target (the /caregiver-wellness sub-page was
   *  retired; this strip is the caregiver's own read-only week-at-a-glance). */
  days: WeekRecapDay[];
}

export function MoodStrip({ days }: MoodStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recap = useMemo(() => composeWeekRecap(days), [days]);
  const hasAnyCheckIn = days.some((d) => d.mood != null);

  return (
    <View style={styles.zone} testID="mood-strip">
      {/* Section header — "THIS WEEK" micro label (display-only strip). */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>THIS WEEK</Text>
      </View>

      {hasAnyCheckIn ? (
        <>
          {/* 7-dot row */}
          <View style={styles.dotRow}>
            {days.map((d, i) => (
              <View key={`${d.date}-${i}`} style={styles.dotCol}>
                {d.mood != null ? (
                  <View
                    style={[styles.dotFilled, { backgroundColor: moodColor(d.mood) }]}
                    testID={`mood-dot-${d.date}`}
                  >
                    <Text style={styles.dotEmoji}>{MOOD_EMOJI[d.mood]}</Text>
                  </View>
                ) : (
                  <View style={styles.dotEmpty} testID={`mood-dot-${d.date}-empty`} />
                )}
                <Text style={styles.dayLabel}>{DAY_LABEL[d.weekday]}</Text>
              </View>
            ))}
          </View>
          {recap.length > 0 && (
            <Text style={styles.recap} testID="mood-strip-recap">
              {recap}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.emptyLine} testID="mood-strip-empty">
          Check in each day and your mood will appear here — a quiet record of how you've been holding up.
        </Text>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    zone: {
      // Open fabric — no card chrome. The strip is structural rhythm,
      // not a container.
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 14, // allow: header-to-dots rhythm
    },
    headerLabel: {
      ...TypeScale.micro,
      // You rebuild (S4) — THIS WEEK is the self-care/wellness eyebrow → SAGE
      // (the mockup colors it, in blue; §5 blue-never-on-You → sage).
      color: c.accent,
    },
    headerLink: {
      ...TypeScale.body,
      // "Your wellness →" → SAGE (was DUSTY blue #6b8cae, the You-blue error).
      color: c.accent,
      fontWeight: '500',
    },
    dotRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12, // allow: dots-to-recap rhythm
    },
    dotCol: {
      flex: 1,
      alignItems: 'center',
    },
    dotFilled: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotEmpty: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(244, 221, 184, 0.06)',
      // B2 — unchecked day = awaiting. Circle, so per the spike verdict this is
      // the reduced-opacity SOLID fallback (dashed renders poorly on iOS rings),
      // a NEUTRAL ring (not a register tint — You stays tint-free per B1).
      borderWidth: 1,
      borderColor: c.borderNeutral,
    },
    dotEmoji: {
      fontSize: 16,
    },
    dayLabel: {
      fontSize: 8,
      color: c.textMuted,
      marginTop: 6,
    },
    recap: {
      fontFamily: Fonts.serifItalic,
      ...TypeScale.body,
      lineHeight: 20,
      color: c.textSecondary,
      fontStyle: 'italic' as const,
    },
    emptyLine: {
      fontFamily: Fonts.serifItalic,
      ...TypeScale.body,
      lineHeight: 20,
      color: c.textMuted,
      fontStyle: 'italic' as const,
    },
  });

export default MoodStrip;
