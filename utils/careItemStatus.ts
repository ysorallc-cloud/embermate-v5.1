// ============================================================================
// SHARED CARE-ITEM STATUS — one missed-vs-pending rule for Now AND Journal.
//
// Screens slice (SEAM 4). Pre-slice, Now and Journal derived "overdue/missed"
// from two different thresholds:
//   • Now (TimelineSection via isOverdue): scheduledTime + 30min, live.
//   • Journal (instance.status, persisted by carePlanGenerator): windowEnd +
//     120min — so a meal read OVERDUE on Now while still SCHEDULED on Journal.
//
// DECISION (locked with Amber): WINDOWED for every non-medication type;
// medications alone keep +30min. Both screens derive row state from THIS helper
// — one source of truth.
//   • non-medication (meals/vitals/wellness/etc): DUE→OVERDUE boundary =
//     windowEnd(windowLabel) + MISSED_GRACE_PERIOD. A windowed item stays 'due'
//     until its window ends + grace, not overdue at scheduledTime+30. Meals were
//     already here; Stage 1 (Option C) extends the SAME rule to vitals/wellness.
//   • medication: scheduledTime + OVERDUE_GRACE_MINUTES (Now's +30min) — a pill
//     is due at a specific clock time, not across a window. UNCHANGED.
//
// Status DERIVATION only — no store/schema change, no writes. A persisted
// 'missed' (from carePlanGenerator) maps to 'overdue' so an already-missed
// instance reads consistently on both screens.
// ============================================================================

import type { DailyCareInstance, DailyInstanceStatus } from '../types/carePlan';
import { OVERDUE_GRACE_MINUTES } from './nowHelpers';
import { MISSED_GRACE_PERIOD_MINUTES, getDefaultWindowEnd } from './careWindowRules';

export type CareItemStatus = 'upcoming' | 'due' | 'overdue' | 'done' | 'skipped';

// Structural input — accepts a full DailyCareInstance OR any trimmed row type
// (e.g. MedsBatchPanel's MedInstance, which carries only scheduledTime). Only
// scheduledTime is required; missing status → treat as pending (compute live),
// missing itemType → non-medication (windowed; windowLabel ?? 'afternoon').
// NOTE: the sole trimmed med caller (MedsBatchPanel) always passes real meds
// carrying itemType==='medication', so no live +30 input reaches the window path.
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
 * Non-medication (meals/vitals/wellness/etc): windowEnd(windowLabel) +
 *   MISSED_GRACE_PERIOD_MINUTES (the window boundary — Stage 1 extends the meal
 *   rule to every non-med type).
 * Medication: scheduledTime + OVERDUE_GRACE_MINUTES (Now's +30min).
 */
function overdueCutoff(instance: CareItemStatusInput, scheduled: Date): Date {
  if (instance.itemType !== 'medication') {
    const endStr = getDefaultWindowEnd(instance.windowLabel ?? 'afternoon'); // 'HH:mm'
    // SEAM 4 hardening (was the banked PART B item): derive windowEnd from the
    // already-parsed `scheduled` Date — the item's own calendar day — NOT from a
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
