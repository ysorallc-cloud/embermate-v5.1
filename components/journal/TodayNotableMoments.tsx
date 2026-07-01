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
// Phase 27 F1 — Section 3 (Assessment) wrapInSection path migrated to
// SoapSectionFrame (left-rule chrome, no card outline, no bg tint). The
// standalone non-wrapInSection path (Phase 22.2 "Worth mentioning" surface
// below the recap) still renders the original SectionEyebrow + hairline
// shape — it's outside the SOAP-section scope and unchanged in Phase 27.
// The pre-F1 JournalSection import retired with that migration (F7
// cleanup) — no other code path in this component consumes it.
import { SoapSectionFrame } from './SoapSectionFrame';
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
   * Phase 27 F5 — render inside the Section 3 (Assessment) chrome.
   * Phase 27 F1 (2026-05-21) migrated the chrome from JournalSection
   * (3px border + radius + bg tint card) to SoapSectionFrame (2px left
   * rule + flat, no card outline) per the banked Journal-cleanup
   * design. When wrapInSection is true the SoapSectionFrame amber
   * chrome wraps the rows with eyebrow "Worth flagging"; the
   * component's internal "Worth mentioning" eyebrow + hairline divider
   * are dropped (the SoapSectionFrame owns the chrome). Empty-gate
   * still applies: when buildNotableMoments returns zero moments, the
   * entire component (Section 3 chrome and all) returns null, so no
   * empty assessment surface appears on the page.
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
      <View style={styles.dot} />
      <Text style={styles.text}>{m.text}</Text>
    </View>
  ));

  // Phase 27 F5 — Section 3 (Assessment) chrome wraps the rows when
  // mounted inside Journal's SOAP layout. Phase 27 F1 (2026-05-21)
  // migrated the chrome from JournalSection (3px border + radius + bg
  // tint card) to SoapSectionFrame (2px left rule + flat, no card
  // outline) per the banked Journal-cleanup design. Amber tint role +
  // eyebrow text preserved; the internal "Worth mentioning" eyebrow +
  // hairline divider in the non-wrapInSection branch below stays as
  // legacy chrome for that standalone surface.
  if (wrapInSection) {
    return (
      <SoapSectionFrame eyebrow="Worth flagging" tint="coral" icon="flag">
        <View testID="today-notable-moments">{rows}</View>
      </SoapSectionFrame>
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
    backgroundColor: c.hairlineInset,
    marginVertical: Spacing.md,
    marginHorizontal: -16,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 4,
    gap: 11,
  },
  // Journal rebuild — un-boxed coral flag dot (journal-aligned `.fdot`):
  // 6px coral circle, nudged down to sit on the first text line. Replaces
  // the neutral '·' text glyph.
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.coral,
    marginTop: 6,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13.5,
    color: c.textPrimary,
    lineHeight: 22,
  },
});

export default TodayNotableMoments;
