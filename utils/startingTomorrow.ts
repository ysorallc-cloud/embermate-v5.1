// ============================================================================
// getStartingTomorrow — the calm "first dose/reading tomorrow" signal for a
// care item the caregiver added AFTER its time today.
//
// The born-overdue guard in carePlanGenerator deliberately skips today's passed
// slot for a just-added MED or VITALS item (it didn't miss a dose/reading it
// never existed for), so the item reads neither overdue nor missed. Skipping
// alone would make it VANISH from today's Now — "did it save?". This helper
// derives a neutral, upcoming line for exactly those items so today's Now
// confirms the item is saved and scheduled, without any false lapse.
//
// BUCKET RULES DIFFER (mirrors the generator guard):
//   • meds + vitals → skip-and-preview (surfaced here).
//   • wellness / meals → render-anyway (NOT skipped, so never previewed here).
//
// Derived at the read layer (no phantom instance), so it never touches
// dayState / the START HERE pointer.
//   • Meds: per-item, from config.meds.medications — active + DAILY + created
//     TODAY + no surviving instance today.
//   • Vitals: single bucket item — enabled + has vitalTypes + has timesOfDay +
//     no surviving vitals instance today (on a normal day the instance always
//     exists; its absence with the bucket enabled means the born-past skip fired).
// ============================================================================

import type { MedicationPlanItem, VitalsBucketConfig, CarePlanConfig } from '../types/carePlanConfig';
import { TIME_OF_DAY_DEFAULTS } from '../types/carePlanConfig';
import type { DailyCareInstance } from '../types/carePlan';
import { toLocalDateString } from '../services/carePlanGenerator';

export interface StartingTomorrowItem {
  id: string;
  name: string;
  /** e.g. "8:00 AM" when a first time is resolvable; undefined otherwise. */
  timeLabel?: string;
  /** "first {noun} tomorrow" — 'dose' for meds, 'reading' for vitals. */
  noun: 'dose' | 'reading';
  emoji: string;
}

const HHMM = /^\d{2}:\d{2}$/;

function to12h(hhmm: string): string | undefined {
  if (!HHMM.test(hhmm)) return undefined;
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Earliest of a set of HH:mm strings as a 12-hour label, or undefined. */
function earliestLabel(times: (string | undefined | null)[]): string | undefined {
  const valid = times.filter((t): t is string => !!t && HHMM.test(t)).sort();
  return valid.length > 0 ? to12h(valid[0]) : undefined;
}

function medLabel(med: MedicationPlanItem): string | undefined {
  if (med.scheduledTimeHHmm && HHMM.test(med.scheduledTimeHHmm)) return to12h(med.scheduledTimeHHmm);
  return earliestLabel((med.timesOfDay ?? []).map((t) => TIME_OF_DAY_DEFAULTS[t]));
}

function medsStartingTomorrow(
  meds: MedicationPlanItem[],
  instances: DailyCareInstance[],
  todayStr: string,
): StartingTomorrowItem[] {
  const out: StartingTomorrowItem[] = [];
  for (const med of meds ?? []) {
    if (!med || med.active === false) continue;
    if ((med.scheduleFrequency ?? 'daily') !== 'daily') continue; // "tomorrow" only holds for daily
    if (!med.createdAt) continue;
    const created = new Date(med.createdAt);
    if (Number.isNaN(created.getTime()) || toLocalDateString(created) !== todayStr) continue;
    const hasTodayInstance = instances.some(
      (i) => i.itemType === 'medication' && !!i.itemName && i.itemName.startsWith(med.name),
    );
    if (hasTodayInstance) continue;
    out.push({ id: med.id, name: med.name, timeLabel: medLabel(med), noun: 'dose', emoji: '💊' });
  }
  return out;
}

function vitalsStartingTomorrow(
  vitals: VitalsBucketConfig | undefined,
  instances: DailyCareInstance[],
): StartingTomorrowItem[] {
  if (!vitals?.enabled) return [];
  if ((vitals.vitalTypes?.length ?? 0) === 0) return [];
  const timesOfDay = vitals.timesOfDay ?? ['morning'];
  if (timesOfDay.length === 0) return [];
  const hasTodayInstance = instances.some((i) => i.itemType === 'vitals');
  if (hasTodayInstance) return []; // already visible today (normal day)
  const timeLabel = earliestLabel(timesOfDay.map((t) => TIME_OF_DAY_DEFAULTS[t]));
  return [{ id: 'vitals', name: 'Vitals check', timeLabel, noun: 'reading', emoji: '📊' }];
}

/**
 * Care items to surface on today's Now as neutral "first dose/reading tomorrow"
 * lines (meds + vitals only — wellness/meals render-anyway).
 * @param config    the care-plan config
 * @param instances today's DailyCareInstances
 * @param now       reference clock (injectable for tests)
 */
export function getStartingTomorrow(
  config: CarePlanConfig | null | undefined,
  instances: DailyCareInstance[],
  now: Date = new Date(),
): StartingTomorrowItem[] {
  const todayStr = toLocalDateString(now);
  return [
    ...medsStartingTomorrow(config?.meds?.medications ?? [], instances, todayStr),
    ...vitalsStartingTomorrow(config?.vitals as VitalsBucketConfig | undefined, instances),
  ];
}
