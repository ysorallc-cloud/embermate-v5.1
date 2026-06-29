// ============================================================================
// VISIT COVERAGE — Phase 11.7.4
//
// Pure aggregation helper for the Insights-tab Visit Prep coverage
// card (UpcomingVisitInsightsCard). Extracted out of the component
// so the union-read logic is testable without pulling expo-router /
// React Native into the test runtime.
//
// Bug context: pre-11.7.4 loadDataCoverage read ONLY from
// getEventsByDateRange (events pipeline). Sample-data writes through
// the instance pipeline (logInstanceCompletion → createLogEntry); it
// never emits the legacy event types ('medication_taken' /
// 'vitals_recorded' / 'meal_logged' / 'note_added'). The card
// always showed 0 of 15 days · 0 meds · 0 vitals · 0 meals · 0 notes
// when the actual data was populated through the instance pipeline.
//
// Same dedup pattern as narrativeSummaryBuilder.unionCount:
// (carePlanItemId, scheduledTime) → fall back to event:${id} for
// events without those keys. Notes have no instance counterpart
// (CarePlanItemType doesn't include 'note'), so notes count remains
// events-only.
// ============================================================================

import type { CareEvent } from '../types/event';
import type { DailyCareInstance } from '../types/carePlan';
import { getEventsByDateRange } from '../storage/eventRepo';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { countCanonicalVitalsInRange } from './vitalsCanonical';
import { countCanonicalMealsLoggedInRange } from './mealsCanonical';

export const COVERAGE_WINDOW_DAYS = 15;

export interface DataCoverage {
  daysLogged: number;
  windowDays: number;
  meds: number;
  vitals: number;
  meals: number;
  notes: number;
}

function eventKey(e: CareEvent): string {
  const meta = (e.metadata || {}) as Record<string, any>;
  const itemId = meta.carePlanItemId;
  const sched = meta.scheduledTime;
  return itemId && sched ? `${itemId}:${sched}` : `event:${e.id}`;
}

/**
 * Aggregate per-source counts and distinct-day count. Pure / synchronous.
 *
 * Wave-1 clinician convergence (Fix #3): VITALS and MEALS are no longer
 * counted from the events+instances union here — they come from the canonical
 * readers (countCanonicalVitalsInRange / countCanonicalMealsLoggedInRange) and
 * are passed in via `canonical`. This closes the last two non-canonical chip
 * counters (the 4th vitals counter held back from Fix #2, and the meals chip).
 * MEDS, NOTES, and daysLogged still come from the union; vitals/meals events +
 * instances still contribute to daysLogged (a logged meal/vital makes the day
 * count) but not to the per-source totals.
 *
 * Pending and missed instances do NOT contribute to daysLogged — coverage
 * measures "did the caregiver log anything that day", not what was scheduled.
 */
export function computeDataCoverage(
  events: CareEvent[],
  instances: DailyCareInstance[],
  windowDays: number,
  canonical: { vitals: number; meals: number },
): DataCoverage {
  const seenMeds = new Set<string>();
  const dayKeys = new Set<string>();
  let meds = 0;
  let notes = 0;

  for (const e of events) {
    const day = (e.timestamp || '').slice(0, 10);
    if (day) dayKeys.add(day);
    const k = eventKey(e);
    if (e.type === 'medication_taken' || e.type === 'medication_skipped') {
      if (!seenMeds.has(k)) { seenMeds.add(k); meds += 1; }
    } else if (e.type === 'note_added') {
      // Notes have no instance counterpart — events-only.
      notes += 1;
    }
    // vitals_recorded / meal_logged: contribute to daysLogged (above); their
    // COUNTS come from the canonical readers, not this union.
  }

  for (const i of instances) {
    if (i.status !== 'completed' && i.status !== 'skipped') continue;
    if (i.date) dayKeys.add(i.date);
    if (i.itemType === 'medication') {
      const k = `${i.carePlanItemId}:${i.scheduledTime}`;
      if (!seenMeds.has(k)) { seenMeds.add(k); meds += 1; }
    }
    // vitals / nutrition instances: contribute to daysLogged; counts canonical.
  }

  return {
    daysLogged: dayKeys.size,
    windowDays,
    meds,
    vitals: canonical.vitals,
    meals: canonical.meals,
    notes,
  };
}

/**
 * Async loader for the visit-prep coverage chip. Owns the canonical wiring so
 * visitCoverage is the single home for the chip's vitals + meals counts. Loads
 * events + instances (for meds/notes/days) and the canonical vitals + meals
 * counts, then folds them through computeDataCoverage.
 */
export async function loadDataCoverage(
  startStr: string,
  endStr: string,
  windowDays: number,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<DataCoverage> {
  const [events, instances, vitals, meals] = await Promise.all([
    getEventsByDateRange(startStr, endStr, patientId),
    listDailyInstancesRange(patientId, startStr, endStr),
    countCanonicalVitalsInRange(`${startStr}T00:00:00`, `${endStr}T23:59:59`, patientId),
    countCanonicalMealsLoggedInRange(startStr, endStr, patientId),
  ]);
  return computeDataCoverage(events, instances, windowDays, { vitals, meals: meals.logged });
}
