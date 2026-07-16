// ============================================================================
// CARE COMPLETION — single source of truth for "is this window/day done?"
//
// A window or day is complete only when every instance reached a caregiver-
// resolved terminal state that is NOT a failure. Two statuses block
// completion:
//   - 'pending' — nothing logged yet.
//   - 'missed'  — the window's grace period passed and nobody logged it
//                 (ensureDailyInstances auto-transitions pending → missed).
//                 A FAILURE, not a decision. It must NOT count toward "done"
//                 and must never render a celebratory/complete state.
//
// Statuses that do NOT block completion:
//   - 'completed' — logged as done.
//   - 'skipped'   — caregiver DELIBERATELY marked not-taken (a legitimate
//                   close). Counts toward the window/day being done — do not
//                   turn deliberate skips into failures.
//   - 'partial'   — some sub-units logged; unchanged from prior behavior.
//
// Before this helper existed, every rollup computed "done" as "no pending
// remain" (useDailyCareInstances getWindowStatus + allComplete, useCareTasks
// allComplete), which silently treated 'missed' as done. Routing all rollups
// through one predicate keeps the Now-tab summary, window headers, and any
// Journal/Insights "X of Y done" reads consistent.
// ============================================================================

import { DailyInstanceStatus } from '../types/carePlan';

/**
 * Does this status block a window/day from being considered complete?
 * True for 'pending' and 'missed'; false for 'completed', 'skipped', 'partial'.
 */
export function statusBlocksCompletion(status: DailyInstanceStatus): boolean {
  return status === 'pending' || status === 'missed';
}

/**
 * Is a set of instances/tasks complete? Requires at least one item AND no item
 * in a completion-blocking status ('pending' or 'missed').
 */
export function isInstanceSetComplete(
  items: ReadonlyArray<{ status: DailyInstanceStatus }>,
): boolean {
  return items.length > 0 && !items.some(i => statusBlocksCompletion(i.status));
}
