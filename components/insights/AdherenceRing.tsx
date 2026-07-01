// ============================================================================
// ADHERENCE RING — Insights signature object (Design-Lock §4, insights-hero).
//
// A full-circle progress ring: sage arc on a faint track, the adherence % +
// labels centered inside. Geometry is EXACT to the embermate-insights-hero
// SVG — 148 box, r=60, stroke 9, C = 2π·60 = 376.99, dashoffset = C·(1−pct),
// rotate(−90) so it starts at 12 o'clock and fills clockwise, round cap.
//
// Renders ONLY when there's sufficient logged history — the pre-data
// "PATTERNS COMING" state is a separate surface (a 0%/grey ring reads as
// failure on fresh install; §8 honesty). This component assumes it's given a
// real, sufficient pct.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export const RING_SIZE = 148;
export const RING_RADIUS = 60;
export const RING_STROKE = 9;
const CENTER = RING_SIZE / 2; // 74
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // 376.99…

export interface AdherenceRingProps {
  /** Adherence percentage, 0–100. */
  pct: number;
  label?: string;
  /** e.g. "PAST 14 DAYS". */
  windowLabel?: string;
  testID?: string;
}

export function AdherenceRing({ pct, label = 'ADHERENCE', windowLabel, testID }: AdherenceRingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const dashoffset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <View style={styles.ring} testID={testID}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        {/* Track — full circle, faint. */}
        <Circle
          cx={CENTER} cy={CENTER} r={RING_RADIUS}
          fill="none" stroke={colors.hairlineInset} strokeWidth={RING_STROKE}
        />
        {/* Progress — sage arc, round cap, top-start clockwise. */}
        <Circle
          cx={CENTER} cy={CENTER} r={RING_RADIUS}
          fill="none" stroke={colors.accent} strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          testID={testID ? `${testID}-progress` : undefined}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.pct} testID={testID ? `${testID}-pct` : undefined}>{clamped}%</Text>
        <Text style={styles.label}>{label}</Text>
        {windowLabel ? <Text style={styles.window}>{windowLabel}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    ring: {
      width: RING_SIZE,
      height: RING_SIZE,
      position: 'relative',
    },
    center: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pct: {
      fontFamily: Fonts.body,
      fontSize: 40,
      lineHeight: 44,
      color: c.textPrimary,
    },
    label: {
      fontFamily: Fonts.eyebrow,
      fontSize: 9,
      letterSpacing: 2,
      color: c.textSecondary,
      marginTop: 5,
    },
    window: {
      fontFamily: Fonts.eyebrow,
      fontSize: 9,
      letterSpacing: 1.5,
      color: c.textTertiary,
      marginTop: 1,
    },
  });

export default AdherenceRing;
