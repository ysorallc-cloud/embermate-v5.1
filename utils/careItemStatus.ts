// ============================================================================
// SHARED CARE-ITEM STATUS — one missed-vs-pending rule for Now AND Journal.
//
// Screens slice (SEAM 4). Pre-slice, Now and Journal derived "overdue/missed"
// from two different thresholds:
//   • Now (TimelineSection via isOverdue): scheduledTime + 30min, live.
//   • Journal (instance.status, persisted by carePlanGenerator): windowEnd +
//     120min — so a meal read OVERDUE on Now while still SCHEDULED on Journal.
//
// DECISION (locked with Amber): WINDOWED for meals; meds/vitals keep +30min.
// Both screens now derive row state from THIS helper — one source of truth.
//   • nutrition (meals): DUE→OVERDUE boundary = windowEnd + MISSED_GRACE_PERIOD
//     (Journal's existing window, single-sourced from carePlanGenerator).
//   • everything else (meds/vitals/etc): scheduledTime + OVERDUE_GRACE_MINUTES
//     (Now's existing +30min — UNCHANGED, so meds/vitals are a no-op regression).
//
// Status DERIVATION only — no store/schema change, no writes. A persisted
// 'missed' (from carePlanGenerator) maps to 'overdue' so an already-missed
// instance reads consistently on both screens.
// ============================================================================

import type { DailyCareInstance, DailyInstanceStatus } from '../types/carePlan';
import { OVERDUE_GRACE_MINUTES } from './nowHelpers';
import { MISSED_GRACE_PERIOD_MINUTES, getDefaultWindowEnd } from '../services/carePlanGenerator';

export type CareItemStatus = 'upcoming' | 'due' | 'overdue' | 'done' | 'skipped';

// Structural input — accepts a full DailyCareInstance OR any trimmed row type
// (e.g. MedsBatchPanel's MedInstance, which carries only scheduledTime). Only
// scheduledTime is required; missing status → treat as pending (compute live),
// missing itemType → non-nutrition (+30min), windowLabel only read for meals.
export type CareItemStatusInput =
  Pick<DailyCareInstance, 'scheduledTime'> & {
    status?: DailyInstanceStatus;
    itemType?: DailyCareInstance['itemType'];
    date?: string;
    windowLabel?: DailyCareInstance['windowLabel'];
  };

function parseScheduled(instance: { scheduledTime: string; date?: string }): Date | null {
  const { scheduledTime, date } = instance;
  if (!scheduledTime) return null;
  let d = new Date(scheduledTime);
  // HH:mm form needs a date to anchor; if none provided, anchor to today.
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}/.test(scheduledTime)) {
    const anchor = date ?? new Date().toISOString().slice(0, 10);
    d = new Date(`${anchor}T${scheduledTime.slice(0, 5)}:00`);
  }
  return isNaN(d.getTime()) ? null : d;
}

/**
 * The DUE→OVERDUE cutoff for a pending instance, per the locked per-type rule.
 * Meals: windowEnd(windowLabel) + MISSED_GRACE_PERIOD_MINUTES (Journal's window).
 * Everything else: scheduledTime + OVERDUE_GRACE_MINUTES (Now's +30min).
 */
function overdueCutoff(instance: CareItemStatusInput, scheduled: Date): Date {
  if (instance.itemType === 'nutrition') {
    const endStr = getDefaultWindowEnd(instance.windowLabel ?? 'afternoon'); // 'HH:mm'
    // SEAM 4 hardening (was the banked PART B item): derive windowEnd from the
    // already-parsed `scheduled` Date — the meal's own calendar day — NOT from a
    // separate instance.date field. The prior `new Date(\`${instance.date}T...\`)`
    // silently fell back to scheduledTime+120 (noon lunch → overdue at 14:00)
    // whenever `date` was absent/malformed. `scheduled` is always valid here
    // (parseScheduled succeeded), so windowEnd resolves regardless of `date`.
    const [h, m] = endStr.split(':').map((n) => parseInt(n, 10));
    const windowEnd = new Date(scheduled);
    windowEnd.setHours(h, m, 0, 0);
    return new Date(windowEnd.getTime() + MISSED_GRACE_PERIOD_MINUTES * 60 * 1000);
  }
  return new Date(scheduled.getTime() + OVERDUE_GRACE_MINUTES * 60 * 1000);
}

/**
 * Single source of truth for a care instance's display status.
 * Both Now (timeline row state) and Journal (meal missed-vs-pending) consume
 * this — no parallel threshold in either screen.
 */
export function getCareItemStatus(
  instance: CareItemStatusInput,
  now: Date = new Date(),
): CareItemStatus {
  const status: DailyInstanceStatus | undefined = instance.status;
  if (status === 'completed') return 'done';
  if (status === 'skipped') return 'skipped';
  // Persisted missed (carePlanGenerator) reads as overdue on both screens.
  if (status === 'missed') return 'overdue';

  // pending / partial / unknown → derive live from the clock.
  const scheduled = parseScheduled(instance);
  if (!scheduled) return 'due';
  if (now < scheduled) return 'upcoming';
  return now > overdueCutoff(instance, scheduled) ? 'overdue' : 'due';
}
