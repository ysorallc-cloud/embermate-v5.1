// ============================================================================
// NOW GREETING — Option A: greeting title on row 1, time as metadata below.
// Row 1: title (alone — patient pill is rendered alongside by NowHeader)
// Row 2 (metadata): emoji · time (caregiverAccent) · subtitle (textSecondary)
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

function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function NowGreeting({ stats, patientName, nextScheduledTime }: NowGreetingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const greeting = buildGreeting(hour, stats, nextScheduledTime, patientName);
  const timeStr = formatCurrentTime();

  return (
    <View style={s.container}>
      {/* Row 1 — greeting title alone (patient pill rendered by NowHeader) */}
      <View style={s.titleRow}>
        <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit>
          {greeting.title}
        </Text>
      </View>

      {/* Row 2 — metadata: emoji · time · subtitle */}
      <View style={s.metadataRow}>
        <Text style={s.metadataEmoji}>{TIME_EMOJI[tod]}</Text>
        <Text style={s.metadataTime}>{timeStr}</Text>
        <View style={s.metadataDot} />
        <Text
          style={s.metadataSubtitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {greeting.subtitle}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  titleRow: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  metadataEmoji: {
    fontSize: 12,
  },
  metadataTime: {
    fontSize: 12,
    fontWeight: '500',
    color: c.caregiverAccent,
  },
  metadataDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: c.textTertiary,
  },
  metadataSubtitle: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },
});
