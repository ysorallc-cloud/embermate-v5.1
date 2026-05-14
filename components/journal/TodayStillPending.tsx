// ============================================================================
// TODAY STILL PENDING — Phase 11.8.3
//
// Tier 3 of the four-tier Journal Today layout. A small "STILL
// PENDING" card listing remaining tasks for today, sorted by
// scheduled time. Renders nothing when nothing is pending.
//
// Reads the same instance pipeline Now-tab uses, so the data is
// instantly consistent with what Now shows. Refreshes on the same
// multi-pipeline event filter as the rest of the Today integration.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import { SectionEyebrow } from '../SectionEyebrow';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import {
  formatStillPendingTonight,
  PendingTonightItem,
} from '../../utils/stillPendingFormat';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';

interface TodayStillPendingProps {
  dateKey: string;
  /**
   * Phase 27 F6 — strip own chrome + internal eyebrow + hairline
   * divider. Used inside Section 4 (Plan), which renders the inner
   * "STILL PENDING" sub-eyebrow at its own level. Empty-gate still
   * applies (renders null when no items).
   */
  bare?: boolean;
  /**
   * Phase 27 F6 — fires whenever the items count finishes loading or
   * changes. Lets the parent (journal.tsx Section 4) gate the inner
   * "STILL PENDING" sub-eyebrow on items.length > 0 — the sub-eyebrow
   * is rendered by the parent, not by this component, but it must
   * not orphan when the day has nothing pending.
   */
  onLoaded?: (count: number) => void;
}

export function TodayStillPending({ dateKey, bare = false, onLoaded }: TodayStillPendingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<PendingTonightItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, dateKey);
      const next = formatStillPendingTonight(instances);
      setItems(next);
      onLoaded?.(next.length);
    } catch (err) {
      logError('TodayStillPending.load', err);
    } finally {
      setLoaded(true);
    }
  }, [dateKey, onLoaded]);

  useEffect(() => { refresh(); }, [refresh]);

  useDataListener((category) => {
    if (
      category === EVENT.DAILY_INSTANCES
      || category === EVENT.LOGS
      || category === EVENT.MEDICATION
      || category === EVENT.WELLNESS
      || category === EVENT.SAMPLE_DATA_CLEARED
    ) {
      refresh();
    }
  });

  if (!loaded) return null;
  if (items.length === 0) return null;

  const rows = items.map((p) => (
    <View
      key={p.id}
      style={styles.row}
      testID={`today-pending-${p.itemType}`}
    >
      <Text style={styles.bullet}>{'·'}</Text>
      <Text style={styles.name}>{p.name}</Text>
      <Text style={styles.time}>{p.time}</Text>
    </View>
  ));

  // Phase 27 F6 — bare mode for Section 4 nesting. No chrome, no
  // internal eyebrow, no hairline divider — just the rows. Section 4
  // owns the surrounding "STILL PENDING" sub-eyebrow.
  if (bare) {
    return <View testID="today-still-pending">{rows}</View>;
  }

  return (
    <View testID="today-still-pending">
      {/* Phase 22.2 — uniform SectionEyebrow + section-color encoding.
          Coral tint signals "handoff action required" (reframed for
          22.2 — Phase 7's 3-accent budget was decorative restraint;
          22.2 uses coral semantically). Hairline divider sits above
          the card; auto-gates with the null-return paths. */}
      <View style={styles.sectionDivider} />
      <SectionEyebrow text="Still pending" tint="coral" />
      <View style={styles.section}>{rows}</View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  section: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    backgroundColor: c.glassFaint,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
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
    alignItems: 'center' as const,
    paddingVertical: 4,
    gap: 10,
  },
  bullet: {
    fontSize: 14,
    color: c.textTertiary,
    width: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  time: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
});

export default TodayStillPending;
