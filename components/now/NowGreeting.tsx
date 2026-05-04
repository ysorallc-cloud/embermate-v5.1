// ============================================================================
// NOW GREETING — compressed header (Phase 3.6.2).
//
// Pre-3.6.2: row 1 carried a 32pt title; row 2 carried a metadata strip
// with the time-of-day emoji, the current device-clock time ("5:58 PM"),
// a separator dot, and the next-meds subtitle. ~110pt total header zone
// once the patient chip + page top padding stacked above.
//
// The current-time display was redundant — the iOS status bar device
// clock already shows it — and the metadata strip occupied ~30pt for an
// emoji + time + subtitle that read better inlined under a smaller
// title. 3.6.2 collapses to a tighter ~60pt header zone:
//
//   Row 1: title (22pt, weight 500, letterSpacing -0.3)
//   Row 2: subtitle ("{tod-emoji} {greeting.subtitle}", 12pt, textSecondary)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { buildGreeting } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

export interface NowGreetingProps {
  stats: TodayStats;
  patientName: string;
  nextScheduledTime: string | null;
}

function getTimeOfDay(hour: number): 'morning' | 'midday' | 'evening' | 'night' {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'midday';
  return 'evening';
}

const TIME_EMOJI: Record<string, string> = {
  morning: '☀',
  midday: '⛅',
  evening: '☾',
  night: '☾',
};

export function NowGreeting({ stats, patientName, nextScheduledTime }: NowGreetingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const greeting = buildGreeting(hour, stats, nextScheduledTime, patientName);

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
        {`${TIME_EMOJI[tod]} ${greeting.subtitle}`}
      </Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
