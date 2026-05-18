// ============================================================================
// NOW GREETING — compressed header (Phase 3.6.2, subtitle revised in 15.2).
//
// Pre-3.6.2: row 1 carried a 32pt title; row 2 carried a metadata strip
// with the time-of-day emoji, the current device-clock time, a separator
// dot, and the next-meds subtitle. ~110pt total header zone.
//
// 3.6.2 collapsed to ~60pt:
//   Row 1: title (22pt, weight 500, letterSpacing -0.3)
//   Row 2: subtitle (12pt, textSecondary)
//
// Phase 15.2 — subtitle is the formatted date ("Sunday, May 10").
// Pre-15.2 the subtitle was state-derived ("Next meds: 8:00 AM",
// "All done. Nice work.", etc.), which duplicated information the
// StatRings + the timeline below already convey. The date carries
// grounding alone, so the time-of-day emoji prefix is dropped — emoji
// + date together reads busy. buildGreeting is left untouched (its
// `title` is still state-derived and other consumers may use the
// full output); this component just overrides the subtitle slot at
// the render site.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { buildGreeting } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

export interface NowGreetingProps {
  stats: TodayStats;
  patientName: string;
  /**
   * Phase 15.2 — no longer consumed for subtitle composition. Kept in
   * the prop signature because call paths upstream (NowHeader, screen-
   * level orchestration) thread it through alongside stats; removing it
   * is its own scoped cleanup.
   */
  nextScheduledTime: string | null;
}

export function NowGreeting({
  stats,
  patientName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nextScheduledTime,
}: NowGreetingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const hour = new Date().getHours();
  // buildGreeting still drives the title (state-derived greeting copy).
  // Its subtitle output is intentionally discarded here — see file
  // header for the 15.2 rationale.
  const greeting = buildGreeting(hour, stats, nextScheduledTime, patientName);
  const dateSubtitle = format(new Date(), 'EEEE, MMMM d');

  return (
    <View style={s.container}>
      <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit>
        {greeting.title}
      </Text>
      <Text
        style={s.subtitle}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {dateSubtitle}
      </Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  // Phase 33b Scope 1 — greeting canonical block per
  // project_brand_alignment_canon.md `.phone-greeting`. Regular-weight
  // serif at headline scale (no italic — italic stays reserved for the
  // subhead's witness-voice register per Path 2 lock that superseded
  // Q-33.5's italic-greeting interpretation).
  //
  // Symmetric with the You-tab greeting at `app/(tabs)/support.tsx` —
  // both tabs now render the same canonical greeting block. Subhead
  // component lands below this title block IN v1.1 via rewritten
  // caregiverWitnessBuilder per Path A (subhead ships empty/null in
  // 33b; v1.1 fills + retires AffirmationHeader in the same phase).
  title: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '400',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
