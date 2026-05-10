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
}

export function TodayStillPending({ dateKey }: TodayStillPendingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<PendingTonightItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, dateKey);
      setItems(formatStillPendingTonight(instances));
    } catch (err) {
      logError('TodayStillPending.load', err);
    } finally {
      setLoaded(true);
    }
  }, [dateKey]);

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

  return (
    <View style={styles.section} testID="today-still-pending">
      <Text style={styles.eyebrow}>{'STILL PENDING'}</Text>
      {items.map((p) => (
        <View
          key={p.id}
          style={styles.row}
          testID={`today-pending-${p.itemType}`}
        >
          <Text style={styles.bullet}>{'·'}</Text>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.time}>{p.time}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  section: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: c.glassFaint,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
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
