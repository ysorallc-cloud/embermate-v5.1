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
import { SectionEyebrow } from '../SectionEyebrow';
import { JournalSection } from './JournalSection';
import {
  buildNotableMoments,
  NotableMoment,
} from '../../utils/notableMomentsBuilder';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';

interface TodayNotableMomentsProps {
  dateKey: string;
  /**
   * Phase 27 F5 — render inside the Section 3 (Assessment) chrome:
   * a JournalSection amber card with eyebrow "Worth flagging". When
   * true, the component's internal "Worth mentioning" eyebrow + the
   * hairline divider are dropped — JournalSection owns the chrome.
   * Empty-gate still applies: when buildNotableMoments returns zero
   * moments, the entire component (Section 3 chrome and all) returns
   * null, so no empty assessment card appears on the page.
   */
  wrapInSection?: boolean;
}

export function TodayNotableMoments({ dateKey, wrapInSection = false }: TodayNotableMomentsProps) {
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

  const rows = moments.map((m, i) => (
    <View
      key={`${m.category}-${i}`}
      style={styles.row}
      testID={`today-notable-${m.category}`}
    >
      <Text style={styles.dot}>{'·'}</Text>
      <Text style={styles.text}>{m.text}</Text>
    </View>
  ));

  // Phase 27 F5 — Section 3 (Assessment) chrome wraps the rows when
  // mounted inside Journal's SOAP layout. JournalSection owns the
  // amber border + 0.06-alpha bg + eyebrow; the internal eyebrow +
  // hairline divider are stripped so chrome doesn't double-up.
  if (wrapInSection) {
    return (
      <JournalSection eyebrow="Worth flagging" tint="amber">
        <View testID="today-notable-moments">{rows}</View>
      </JournalSection>
    );
  }

  return (
    <View style={styles.section} testID="today-notable-moments">
      {/* Phase 22.2 — uniform SectionEyebrow + section-color encoding.
          Amber tint signals "attention without alarm" per the section-
          color encoding for this content type. Hairline divider auto-
          gates with the section's null-return path. */}
      <View style={styles.sectionDivider} />
      <SectionEyebrow text="Worth mentioning" tint="amber" />
      {rows}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  section: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  // Phase 22.2 — local eyebrow style retired; SectionEyebrow owns
  // the typography. Hairline divider matches the 15.12 Insights
  // pattern (height 1, near-transparent overlay color).
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: Spacing.md,
    marginHorizontal: -16,
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
