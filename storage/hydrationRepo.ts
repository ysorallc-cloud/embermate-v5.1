// ============================================================================
// HYDRATION REPO
//
// Thin convenience layer over the unified `hydration_logged` events stored
// in storage/eventRepo. Powers one-tap cup logging on the Now timeline and
// the daily/weekly intake reads downstream.
//
// Design notes:
// • One event per cup add — multi-cup `addCup(patientId, 3)` writes a single
//   event with value=3 rather than 3 separate events. Keeps the event log
//   thin and matches how caregivers actually log ("Mom drank a full bottle
//   = 3 cups").
// • `getDayTotal` sums the cups field across the day's events, falling back
//   to event.value for legacy entries written before metadata.cups landed.
// • Errors are swallowed and return safe defaults (0 cups, empty history)
//   so the UI never crashes on a storage read.
// ============================================================================

import {
  saveEvent,
  getEventsByDate,
  getEventsByDateRange,
} from './eventRepo';
import type { CareEvent } from '../types/event';
import { logError } from '../utils/devLog';

function cupsFromEvent(event: CareEvent): number {
  // Prefer metadata.cups (current shape); fall back to event.value (legacy).
  const fromMeta = (event.metadata as any)?.cups;
  if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) return fromMeta;
  if (typeof event.value === 'number' && Number.isFinite(event.value)) return event.value;
  return 0;
}

function dateKey(timestamp: string): string | null {
  const slice = timestamp.slice(0, 10);
  // Light validation — must look like YYYY-MM-DD.
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) && !isNaN(new Date(timestamp).getTime())
    ? slice
    : null;
}

function* iterateDays(startDate: string, endDate: string): Generator<string> {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}

/**
 * Record a hydration entry. Defaults to one cup; pass `cups` to log multiple
 * at once (e.g. a full bottle).
 */
export async function addCup(patientId: string, cups = 1): Promise<void> {
  if (cups <= 0) {
    throw new Error('addCup: cups must be positive');
  }
  try {
    await saveEvent({
      type: 'hydration_logged',
      timestamp: new Date().toISOString(),
      patientId,
      value: cups,
      metadata: { cups, unit: 'cups' },
      source: 'quick_log',
    });
  } catch (err) {
    logError('hydrationRepo.addCup', err);
    throw err;
  }
}

/**
 * Total cups logged on `date` for the given patient. Returns 0 on read errors.
 */
export async function getDayTotal(
  patientId: string,
  date: string,
): Promise<number> {
  try {
    const events = await getEventsByDate(date, patientId);
    return events
      .filter((e: CareEvent) => e.type === 'hydration_logged')
      .reduce((sum: number, e: CareEvent) => sum + cupsFromEvent(e), 0);
  } catch (err) {
    logError('hydrationRepo.getDayTotal', err);
    return 0;
  }
}

/**
 * Returns a per-day map of cup totals across the inclusive `[startDate,
 * endDate]` range. Days with zero events appear in the map with value 0
 * so consumers can render sparse timelines without their own gap-fill.
 */
export async function getHistory(
  patientId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  // Pre-fill the result so days with no events still appear with 0 cups.
  const totals: Record<string, number> = {};
  for (const day of iterateDays(startDate, endDate)) totals[day] = 0;

  try {
    const events = await getEventsByDateRange(startDate, endDate, patientId);
    for (const e of events) {
      if (e.type !== 'hydration_logged') continue;
      const day = dateKey(e.timestamp);
      if (!day || !(day in totals)) continue;
      totals[day] += cupsFromEvent(e);
    }
    return totals;
  } catch (err) {
    logError('hydrationRepo.getHistory', err);
    return totals;
  }
}
