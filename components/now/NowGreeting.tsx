// ============================================================================
// NOW GREETING — Contextual title + time chip + subtitle
// Replaces the static "Good morning" + date + purpose header block
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { buildGreeting } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

// ============================================================================
// PROPS
// ============================================================================

export interface NowGreetingProps {
  stats: TodayStats;
  patientName: string;
  nextScheduledTime: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export function NowGreeting({ stats, patientName, nextScheduledTime }: NowGreetingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const greeting = buildGreeting(hour, stats, nextScheduledTime, patientName);
  const timeStr = formatCurrentTime();

  // Time chip color follows time-of-day: morning=amber, midday=purple, evening=mint
  const chipBackground = {
    morning: colors.amberLight,
    midday: colors.purpleLight,
    evening: colors.accentLight,
    night: colors.accentLight,
  }[tod];

  const chipText = {
    morning: colors.amberBright,
    midday: colors.purple,
    evening: colors.accent,
    night: colors.accent,
  }[tod];

  return (
    <View style={s.container}>
      {/* Title row: greeting + time chip */}
      <View style={s.titleRow}>
        <Text style={s.title}>{greeting.title}</Text>
        <View style={[s.timeChip, { backgroundColor: chipBackground }]}>
          <Text style={[s.timeChipText, { color: chipText }]}>
            {TIME_EMOJI[tod]} {timeStr}
          </Text>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={s.subtitle}>{greeting.subtitle}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: c.textPrimary,
    flex: 1,
  },
  timeChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12.5,
    color: c.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
});
