// ============================================================================
// STAT RINGS — Four SVG progress rings for the core care buckets
// Replaces the flat tile grid on the Now tab
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const RING_SIZE = 52;
const RING_RADIUS = 22;
const RING_STROKE = 3;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CATEGORIES = [
  { key: 'meds' as keyof TodayStats, emoji: '💊', label: 'MEDS' },
  { key: 'vitals' as keyof TodayStats, emoji: '📊', label: 'VITALS' },
  { key: 'wellness' as keyof TodayStats, emoji: '🌅', label: 'WELLNESS' },
  { key: 'meals' as keyof TodayStats, emoji: '🍽️', label: 'MEALS' },
] as const;

// ============================================================================
// PROPS
// ============================================================================

export interface StatRingsProps {
  stats: TodayStats;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StatRings({ stats }: StatRingsProps) {
  const { colors, resolvedTheme } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const trackColor = resolvedTheme === 'light'
    ? 'rgba(0, 0, 0, 0.08)'
    : 'rgba(255, 255, 255, 0.08)';

  return (
    <View style={s.container}>
      {CATEGORIES.map(cat => {
        const stat: StatData = stats[cat.key] ?? { completed: 0, total: 0 };
        const ratio = stat.total > 0 ? stat.completed / stat.total : 0;
        const offset = CIRCUMFERENCE - ratio * CIRCUMFERENCE;
        const isEmpty = stat.total === 0;

        return (
          <View
            key={cat.key}
            style={s.column}
            accessibilityLabel={
              stat.total > 0
                ? `${cat.label}, ${stat.completed} of ${stat.total} completed`
                : `${cat.label}, none scheduled`
            }
          >
            {/* SVG ring */}
            <View style={s.ringWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                {/* Background track */}
                <SvgCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={trackColor}
                  strokeWidth={RING_STROKE}
                />
                {/* Progress arc — only rendered when total > 0 */}
                {!isEmpty && (
                  <SvgCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={offset}
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                )}
              </Svg>
              {/* Centered emoji */}
              <View style={s.emojiWrap}>
                <Text style={s.emoji}>{cat.emoji}</Text>
              </View>
            </View>

            {/* Label */}
            <Text style={s.label}>{cat.label}</Text>

            {/* Value */}
            <Text style={s.value}>
              {stat.total > 0 ? `${stat.completed} of ${stat.total}` : '\u2014'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: c.glass,
    borderRadius: 14,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.textMuted,
    marginTop: 10,
  },
  value: {
    fontSize: 11,
    fontWeight: '400',
    color: c.textPrimary,
    marginTop: -6,
  },
});
