// ============================================================================
// TODAY SILENT VITALS — compact three-dot preview of today's logged values.
//
// Surfaced above the SilentVitalsCapture card when at least one value exists
// for the day. Each dot represents one vital sign (sleep / mood / energy):
// filled dot = logged, hollow dot = not logged yet.
//
// Tap is optional — on the dedicated silent-vitals screen the card itself is
// already editable below, so the dot row is informational. On other surfaces
// (e.g. embedded summaries elsewhere) the parent can wire onPress to navigate.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ReflectionScore } from '../../storage/dailyReflectionRepo';

export interface TodaySilentVitalsValues {
  sleepQuality?: ReflectionScore;
  mood?: ReflectionScore;
  energyLevel?: ReflectionScore;
}

export interface TodaySilentVitalsProps {
  values: TodaySilentVitalsValues | undefined;
  onPress?: () => void;
}

const ROWS: Array<{ key: 'sleep' | 'mood' | 'energy'; label: string; field: keyof TodaySilentVitalsValues }> = [
  { key: 'sleep', label: 'Sleep', field: 'sleepQuality' },
  { key: 'mood', label: 'Mood', field: 'mood' },
  { key: 'energy', label: 'Energy', field: 'energyLevel' },
];

export function TodaySilentVitals({ values, onPress }: TodaySilentVitalsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Render nothing when nothing has been captured — the SilentVitalsCapture
  // card below carries the empty-state.
  const filled = values
    ? Boolean(values.sleepQuality || values.mood || values.energyLevel)
    : false;
  if (!filled || !values) return null;

  const Wrapper: any = onPress ? TouchableOpacity : View;
  const wrapperProps: any = onPress
    ? {
        onPress,
        activeOpacity: 0.7,
        accessibilityRole: 'button',
        accessibilityLabel: "Today's silent vital signs — tap to edit",
      }
    : {
        accessibilityLabel: "Today's silent vital signs",
      };

  return (
    <Wrapper testID="silent-vitals-today" style={styles.row} {...wrapperProps}>
      <Text style={styles.label}>{'TODAY'}</Text>
      <View style={styles.dots}>
        {ROWS.map((r) => {
          const score = values[r.field];
          const isLogged = score != null;
          return (
            <View
              key={r.key}
              testID={`silent-vitals-today-dot-${r.key}`}
              style={[styles.dot, isLogged ? styles.dotFilled : styles.dotEmpty]}
              accessibilityLabel={
                isLogged
                  ? `${r.label}: ${score} of 5`
                  : `${r.label}: not logged yet`
              }
            />
          );
        })}
      </View>
    </Wrapper>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: c.textTertiary,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: c.accent,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
});

export default TodaySilentVitals;
