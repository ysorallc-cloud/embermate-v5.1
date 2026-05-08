// ============================================================================
// useNearbyDaysWithRecords — Phase 5.12.h.
//
// Continuity-support hook for the empty-day state. Walks backward up to 7
// days from the target date and returns up to `max` distinct days that
// carry events. Intentionally narrow scope — this is "remind the
// caregiver they have a record nearby", not timeline exploration.
//
// V1 reads only events. A nearby day with reflection notes but no
// events would not surface here; that's an acceptable v1 limitation.
// ============================================================================

import { useEffect, useState } from 'react';
import { getEventsByDateRange } from '../storage/eventRepo';
import { getActivePatientId } from '../storage/patientRegistry';
import { logError } from '../utils/devLog';
import type { CareEvent } from '../types/event';

export interface NearbyDayWithRecords {
  dateKey: string;
  /** One-line readable summary of what was logged that day. */
  summary: string;
}

const LOOKBACK_DAYS = 7;

function dateOnly(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function summariseDay(events: CareEvent[]): string {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  const parts: string[] = [];
  const meds = (counts['medication_taken'] || 0) + (counts['medication_skipped'] || 0);
  if (meds) parts.push(`${meds} medication${meds === 1 ? '' : 's'}`);
  if (counts['vitals_recorded']) parts.push('Vitals');
  if (counts['meal_logged']) {
    parts.push(`${counts['meal_logged']} meal${counts['meal_logged'] === 1 ? '' : 's'}`);
  }
  if (counts['wellness_check']) parts.push('Wellness check');
  if (counts['note_added']) parts.push('Notes');
  if (parts.length === 0) parts.push('Logged events');
  return parts.slice(0, 3).join(' · ');
}

export function useNearbyDaysWithRecords(
  dateKey: string,
  max = 2,
): NearbyDayWithRecords[] {
  const [days, setDays] = useState<NearbyDayWithRecords[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = await getActivePatientId();
        const start = addDays(dateKey, -LOOKBACK_DAYS);
        const end = addDays(dateKey, -1);
        const events = await getEventsByDateRange(start, end, patientId);
        if (cancelled) return;

        const grouped = new Map<string, CareEvent[]>();
        for (const e of events) {
          const day = dateOnly(e.timestamp);
          if (!grouped.has(day)) grouped.set(day, []);
          grouped.get(day)!.push(e);
        }
        // Walk backward from yesterday so the nearest days come first.
        const result: NearbyDayWithRecords[] = [];
        for (let i = 1; i <= LOOKBACK_DAYS && result.length < max; i++) {
          const candidate = addDays(dateKey, -i);
          const dayEvents = grouped.get(candidate);
          if (dayEvents && dayEvents.length > 0) {
            result.push({
              dateKey: candidate,
              summary: summariseDay(dayEvents),
            });
          }
        }
        setDays(result);
      } catch (err) {
        logError('useNearbyDaysWithRecords', err);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey, max]);

  return days;
}
