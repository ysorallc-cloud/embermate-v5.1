// Slice 3-A — Journal Section 4 sub-section. Reads LogEntry rows for
// the selected date, filters to those with non-empty notes, sorts
// chronologically, and renders read-only "what was observed during
// logging" rows. Lives WITHIN the Section 4 SoapSectionFrame, ABOVE
// the JournalNotesCard, alongside the STILL PENDING sub-eyebrow.
//
// Locks:
//   Q-3A.1 itemName cascade: instance.itemName → data.medicationName
//          → generic per-type label
//   Q-3A.2 filter predicate: notes?.trim().length > 0
//   Q-3A.3 sort: ascending by timestamp
//   Q-3A.4 sub-eyebrow chrome matches STILL PENDING
//   Q-3A.5 time format: "8:12 AM" style (formatNextScheduledTime)
//   Q-3A.9 hide entirely on empty (sub-eyebrow chrome absent when
//          no qualifying rows — Section 4's other content still
//          renders)
//   Q-3A.10 renders identically on past days (read-only by nature)
//   Q-3A.11 no internal data-listener — parent's useDataListener on
//          EVENT.LOGS triggers re-render through the date prop

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  listLogsByDate,
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance, LogEntry } from '../../types/carePlan';
import { useTheme } from '../../contexts/ThemeContext';
import { formatNextScheduledTime } from '../../utils/nowHelpers';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';

type Props = {
  date: string;
  patientId?: string;
};

interface ObservationRow {
  id: string;
  itemName: string;
  notes: string;
  timeDisplay: string | null;
}

export function ObservationsFromLogging({ date, patientId = DEFAULT_PATIENT_ID }: Props) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<ObservationRow[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [logs, instances] = await Promise.all([
        listLogsByDate(patientId, date),
        listDailyInstances(patientId, date),
      ]);
      const instanceById = new Map(instances.map((i) => [i.id, i]));
      const built: ObservationRow[] = logs
        .filter((l) => (l.notes ?? '').trim().length > 0)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map((l) => ({
          id: l.id,
          itemName: resolveItemName(l, instanceById),
          notes: (l.notes ?? '').trim(),
          timeDisplay: formatNextScheduledTime(l.timestamp),
        }));
      setRows(built);
    } catch {
      setRows([]);
    }
  }, [date, patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A fresh save through completeInstance / logInstanceCompletion
  // fires EVENT.LOGS. The parent's brief reload happens too but the
  // date prop here doesn't change, so without a self-subscription this
  // surface would lag until a re-mount.
  useDataListener(
    useCallback(
      (category) => {
        if (category === EVENT.LOGS) refresh();
      },
      [refresh],
    ),
  );

  if (rows === null || rows.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.subEyebrow}>OBSERVATIONS FROM LOGGING</Text>
      {rows.map((row, idx) => (
        <View key={row.id} style={styles.row} testID={`observations-row-${idx}`}>
          <View style={styles.rowHeader}>
            <Text style={[styles.itemName, { color: colors.textPrimary }]}>{row.itemName}</Text>
            {row.timeDisplay && (
              <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>
                {row.timeDisplay}
              </Text>
            )}
          </View>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>{row.notes}</Text>
        </View>
      ))}
    </View>
  );
}

function resolveItemName(
  log: LogEntry,
  instances: Map<string, DailyCareInstance>,
): string {
  // (a) Prefer instance.itemName via dailyInstanceId lookup.
  if (log.dailyInstanceId) {
    const inst = instances.get(log.dailyInstanceId);
    if (inst?.itemName) return inst.itemName;
  }
  // (b) data.medicationName for ad-hoc med logs without an instance link.
  if (log.data && 'medicationName' in log.data && (log.data as any).medicationName) {
    return (log.data as any).medicationName as string;
  }
  // (c) Generic per-type label.
  const type = log.data?.type;
  if (type) {
    const labels: Record<string, string> = {
      medication: 'Medication',
      vitals: 'Vitals',
      mood: 'Mood',
      nutrition: 'Meal',
      hydration: 'Hydration',
      sleep: 'Sleep',
      activity: 'Activity',
      custom: 'Care item',
    };
    return labels[type] || 'Care item';
  }
  return 'Care item';
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  // Matches the STILL PENDING sub-eyebrow chrome at
  // app/(tabs)/journal.tsx L1333 — same 8pt size, 500 weight, 0.5
  // tracking. Color stays amber so the two sub-blocks read as a
  // paired pair under the Section 4 frame.
  subEyebrow: {
    fontSize: 8,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: 'rgba(229, 176, 74, 0.7)',
    marginBottom: 6,
  },
  row: {
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  timeLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
