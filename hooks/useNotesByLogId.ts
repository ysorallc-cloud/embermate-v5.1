// Slice 3-A — small hook used by the Now-tab done rows to know which
// completed instances have a non-empty caregiver note attached to the
// underlying LogEntry. Returns a logId→note map. The map only contains
// entries whose note has trim().length > 0 (matches the Q-3A.2 filter
// predicate, same as ObservationsFromLogging and the integration
// round-trip).
//
// Subscribes to EVENT.LOGS so a fresh save during the day refreshes
// the map without requiring a screen remount. Idempotent + safe to
// call from multiple consumers (the hook returns a stable reference
// to the React state map).

import { useCallback, useEffect, useState } from 'react';
import { listLogsByDate, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { useDataListener } from '../lib/events';
import { EVENT } from '../lib/eventNames';

export function useNotesByLogId(
  date: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const logs = await listLogsByDate(patientId, date);
      const next: Record<string, string> = {};
      for (const log of logs) {
        const cleaned = (log.notes ?? '').trim();
        if (cleaned.length > 0) next[log.id] = cleaned;
      }
      setMap(next);
    } catch {
      setMap({});
    }
  }, [date, patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useDataListener(
    useCallback(
      (category) => {
        if (category === EVENT.LOGS) refresh();
      },
      [refresh],
    ),
  );

  return map;
}
