// ============================================================================
// DAILY REFLECTION REPO — Silent vital signs persistence.
//
// One record per patient + date, holding sleep / mood / energy 1–5 plus an
// optional one-sentence reflection. Powers the Now-tab silent-vitals capture
// and the Visit Prep range query (`getRangeWithMissingDays` is consumed by
// the trend visualizations downstream).
//
// Storage shape:
//   key  → `@embermate_daily_reflections_v1:{patientId}`
//   data → Record<YYYY-MM-DD, DailyReflection>
//
// Single per-patient key keeps reads cheap for ranged queries (Visit Prep
// pulls 30 days at once); for our scale (≤ a few thousand entries per
// patient), the JSON cost is negligible vs the round-trip savings.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';

export type ReflectionScore = 1 | 2 | 3 | 4 | 5;

export interface DailyReflection {
  patientId: string;
  date: string;                      // YYYY-MM-DD
  sleepQuality?: ReflectionScore;
  mood?: ReflectionScore;
  energyLevel?: ReflectionScore;
  reflection?: string;
  source?: 'silent-vitals' | 'auto-fill' | 'wellness-wizard' | 'now-checkbox';
  createdAt: string;
  updatedAt: string;
}

export interface DailyReflectionPoint {
  date: string;
  reflection: DailyReflection | null;
}

const KEY = (patientId: string) => `@embermate_daily_reflections_v1:${patientId}`;

type Store = Record<string, DailyReflection>;

async function readStore(patientId: string): Promise<Store> {
  return safeGetItem<Store>(KEY(patientId), {});
}

async function writeStore(patientId: string, store: Store): Promise<void> {
  await safeSetItem(KEY(patientId), store);
}

/**
 * Create or merge a reflection for the given patient + date. Existing fields
 * are preserved when the patch leaves them out, matching the silent-vitals
 * capture flow where a caregiver may fill one row at a time.
 */
export async function upsertDailyReflection(
  patientId: string,
  date: string,
  patch: Partial<Omit<DailyReflection, 'patientId' | 'date' | 'createdAt' | 'updatedAt'>>,
): Promise<DailyReflection> {
  try {
    const store = await readStore(patientId);
    const now = new Date().toISOString();
    const existing = store[date];
    const next: DailyReflection = existing
      ? { ...existing, ...patch, updatedAt: now }
      : {
          patientId,
          date,
          ...patch,
          createdAt: now,
          updatedAt: now,
        };
    store[date] = next;
    await writeStore(patientId, store);
    emitDataUpdate(EVENT.WELLNESS);
    return next;
  } catch (err) {
    logError('dailyReflectionRepo.upsert', err);
    throw err;
  }
}

/**
 * Returns the reflection for the given patient + date, or null when nothing
 * has been captured yet. Does not fall back to nearby days — callers (e.g. the
 * Now-tab "default to yesterday's values" path) compose that themselves.
 */
export async function getDailyReflection(
  patientId: string,
  date: string,
): Promise<DailyReflection | null> {
  try {
    const store = await readStore(patientId);
    return store[date] ?? null;
  } catch (err) {
    logError('dailyReflectionRepo.get', err);
    return null;
  }
}

/**
 * Reflections logged within the inclusive `[startDate, endDate]` window,
 * sorted ascending by date. Days with no reflection are dropped — see
 * `getRangeWithMissingDays` for the gap-filled variant.
 */
export async function getRange(
  patientId: string,
  startDate: string,
  endDate: string,
): Promise<DailyReflection[]> {
  try {
    const store = await readStore(patientId);
    const out: DailyReflection[] = [];
    for (const date of Object.keys(store)) {
      if (date >= startDate && date <= endDate) out.push(store[date]);
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  } catch (err) {
    logError('dailyReflectionRepo.getRange', err);
    return [];
  }
}

/**
 * Convenience helper for the Now-tab wellness flow — returns yesterday's
 * reflection or null. The "yesterday" anchor is local-time-based so the
 * caregiver's morning lookup matches what they logged the night before.
 */
export async function getYesterdayReflection(
  patientId: string,
  now: Date = new Date(),
): Promise<DailyReflection | null> {
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  // Use local YYYY-MM-DD (not UTC slice) so the boundary matches the rest
  // of the app's day-key conventions.
  const y = yest.getFullYear();
  const m = String(yest.getMonth() + 1).padStart(2, '0');
  const d = String(yest.getDate()).padStart(2, '0');
  return getDailyReflection(patientId, `${y}-${m}-${d}`);
}

/**
 * Remove a single day's reflection — only used by the Now-tab undo path
 * after an auto-fill default log. Silent on missing entries.
 */
export async function deleteDailyReflection(
  patientId: string,
  date: string,
): Promise<void> {
  try {
    const store = await readStore(patientId);
    if (!(date in store)) return;
    delete store[date];
    await writeStore(patientId, store);
    emitDataUpdate(EVENT.WELLNESS);
  } catch (err) {
    logError('dailyReflectionRepo.delete', err);
  }
}

/**
 * One point per day across the inclusive range — Visit Prep trend
 * visualizations rely on this so they never have to gap-fill themselves.
 * Missing days surface as `{ date, reflection: null }`.
 */
export async function getRangeWithMissingDays(
  patientId: string,
  startDate: string,
  endDate: string,
): Promise<DailyReflectionPoint[]> {
  if (startDate > endDate) return [];
  try {
    const store = await readStore(patientId);
    const points: DailyReflectionPoint[] = [];
    // Iterate calendar days inclusive; UTC noon avoids DST edge cases.
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      points.push({ date, reflection: store[date] ?? null });
    }
    return points;
  } catch (err) {
    logError('dailyReflectionRepo.getRangeWithMissingDays', err);
    return [];
  }
}
