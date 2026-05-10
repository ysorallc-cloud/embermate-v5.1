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
 * Aggregate per-source counts and distinct-day count over a union of
 * events and completed/skipped instances. Pure / synchronous.
 *
 * Pending and missed instances do NOT contribute — coverage measures
 * "did the caregiver log anything that day", not what was scheduled.
 */
export function computeDataCoverage(
  events: CareEvent[],
  instances: DailyCareInstance[],
  windowDays: number,
): DataCoverage {
  const seenMeds = new Set<string>();
  const seenVitals = new Set<string>();
  const seenMeals = new Set<string>();
  const dayKeys = new Set<string>();
  let meds = 0;
  let vitals = 0;
  let meals = 0;
  let notes = 0;

  for (const e of events) {
    const day = (e.timestamp || '').slice(0, 10);
    if (day) dayKeys.add(day);
    const k = eventKey(e);
    if (e.type === 'medication_taken' || e.type === 'medication_skipped') {
      if (!seenMeds.has(k)) { seenMeds.add(k); meds += 1; }
    } else if (e.type === 'vitals_recorded') {
      if (!seenVitals.has(k)) { seenVitals.add(k); vitals += 1; }
    } else if (e.type === 'meal_logged') {
      if (!seenMeals.has(k)) { seenMeals.add(k); meals += 1; }
    } else if (e.type === 'note_added') {
      // Notes have no instance counterpart — events-only.
      notes += 1;
    }
  }

  for (const i of instances) {
    if (i.status !== 'completed' && i.status !== 'skipped') continue;
    if (i.date) dayKeys.add(i.date);
    const k = `${i.carePlanItemId}:${i.scheduledTime}`;
    if (i.itemType === 'medication') {
      if (!seenMeds.has(k)) { seenMeds.add(k); meds += 1; }
    } else if (i.itemType === 'vitals') {
      if (!seenVitals.has(k)) { seenVitals.add(k); vitals += 1; }
    } else if (i.itemType === 'nutrition') {
      if (!seenMeals.has(k)) { seenMeals.add(k); meals += 1; }
    }
  }

  return {
    daysLogged: dayKeys.size,
    windowDays,
    meds, vitals, meals, notes,
  };
}
