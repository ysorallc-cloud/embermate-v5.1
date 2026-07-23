// ============================================================================
// useDayEvents — Phase 5.12.e.
//
// Fetches the day's CareEvent[] for the timeline. Wrapper over
// getEventsByDate with the same loading + cleanup contract as
// useDayLevelChanges. Two consumers in 5.12 (timeline + future
// for-next-caregiver) keep their I/O cheap because each owns its
// own dateKey effect.
// ============================================================================

import { useEffect, useState } from 'react';
import { getEventsByDate } from '../storage/eventRepo';
import { getSymptomEventsInRange } from '../utils/symptomEvents';
import { getActivePatientId } from '../storage/patientRegistry';
import { logError } from '../utils/devLog';
import type { CareEvent } from '../types/event';

export interface UseDayEventsValue {
  events: CareEvent[];
  loading: boolean;
}

export function useDayEvents(dateKey: string): UseDayEventsValue {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const patientId = await getActivePatientId();
        // symptom_reported is never written to eventRepo (symptoms live in
        // symptomStorage) — merge the live symptom store in so the timeline shows
        // logged symptoms alongside the event-backed rows.
        const [list, symptomEvents] = await Promise.all([
          getEventsByDate(dateKey, patientId),
          getSymptomEventsInRange(patientId, dateKey, dateKey),
        ]);
        if (cancelled) return;
        setEvents([...list, ...symptomEvents]);
      } catch (err) {
        logError('useDayEvents', err);
        if (cancelled) return;
        setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  return { events, loading };
}
