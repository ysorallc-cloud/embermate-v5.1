// ============================================================================
// TODAY NOTABLE MOMENTS — Phase 11.8.2
//
// Renders 1-3 inline call-outs beneath the Today recap. Each moment
// is one observational sentence (BP delta / refused meal / sleep
// outlier). Hidden when no moments fire — the surface is for when
// today actually deviates from the recent pattern.
//
// Tone matches buildNotableMoments: observation only, no clinical
// judgment. Caregiver-context, not medical-advice.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import {
  buildNotableMoments,
  NotableMoment,
} from '../../utils/notableMomentsBuilder';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';

interface TodayNotableMomentsProps {
  dateKey: string;
}

export function TodayNotableMoments({ dateKey }: TodayNotableMomentsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [moments, setMoments] = useState<NotableMoment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useMemo(
    () => async () => {
      try {
        const out = await buildNotableMoments(dateKey);
        setMoments(out.moments);
      } catch (err) {
        logError('TodayNotableMoments.load', err);
      } finally {
        setLoaded(true);
      }
    },
    [dateKey],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await buildNotableMoments(dateKey);
        if (!cancelled) setMoments(out.moments);
      } catch (err) {
        logError('TodayNotableMoments.load', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  // Re-run on the same instance/log/vitals pipelines the builder reads.
  useDataListener((category) => {
    if (
      category === EVENT.DAILY_INSTANCES
      || category === EVENT.LOGS
      || category === EVENT.MEDICATION
      || category === EVENT.WELLNESS
      || category === EVENT.VITALS
      || category === EVENT.SAMPLE_DATA_CLEARED
    ) {
      refresh();
    }
  });

  if (!loaded) return null;
  if (moments.length === 0) return null;

  return (
    <View style={styles.section} testID="today-notable-moments">
      <Text style={styles.eyebrow}>{'NOTABLE TODAY'}</Text>
      {moments.map((m, i) => (
        <View
          key={`${m.category}-${i}`}
          style={styles.row}
          testID={`today-notable-${m.category}`}
        >
          <Text style={styles.dot}>{'·'}</Text>
          <Text style={styles.text}>{m.text}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  section: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: c.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 4,
    gap: 8,
  },
  dot: {
    fontSize: 14,
    color: c.textTertiary,
    lineHeight: 22,
  },
  text: {
    flex: 1,
    fontSize: 13.5,
    color: c.textPrimary,
    lineHeight: 22,
  },
});

export default TodayNotableMoments;
