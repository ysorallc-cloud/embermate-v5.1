// ============================================================================
// JOURNAL EMPTY-DAY CHECK — Phase 11.5.1
//
// Pure decision function for "should <JournalEmptyDay> render for the
// selected day?" Extracted out of journal.tsx so the decision is
// testable as a unit and the union-read fix is co-located with its
// contract.
//
// Bug context: pre-fix journal.tsx checked only `dayEvents.length > 0`
// alongside notes + tone. Sample data writes 14 days of completed
// instances via the instance pipeline (logInstanceCompletion) — those
// don't surface in dayEvents. The empty-day branch then rendered
// alongside the populated counter ("4 of 12 logged · 7 still to do"),
// contradicting itself.
//
// Fix: factor in `hasCompletedInstances`, sourced from
// outcomes.logged.count > 0 (the same instance pipeline the counter
// reads). Past-day path is unaffected — past days route to
// NarrativeView with its own empty handling.
//
// Same bug class as Phase 5.13.5 fixed for narrativeSummaryBuilder
// (where the unionCount helper merged events + completed instances).
// This phase keeps the fix local; the union-helper extraction is its
// own future commit.
// ============================================================================

import { getCareItemStatus, CareItemStatusInput } from './careItemStatus';

/** Minimal shape getOutstandingItemNames needs — a status-computable
 *  instance that also carries a display name. DailyCareInstance satisfies it. */
export type OutstandingInstance = CareItemStatusInput & { itemName: string };

export interface JournalEmptyDayCheckInput {
  /** True for any date that isn't today. Past days use NarrativeView. */
  isViewingPast: boolean;
  /** True if the event-pipeline read for this day returned at least one event. */
  hasEvents: boolean;
  /** True if the saved reflection text for the day is non-empty after trim. */
  hasNotes: boolean;
  /** True if the caregiver-authored handoff tone for the day is non-empty. */
  hasTone: boolean;
  /** True if the instance-pipeline read for this day surfaced any
   *  completed instances. Sourced from outcomes.logged.count > 0 in
   *  the consumer (journal.tsx) — same source the counter line uses. */
  hasCompletedInstances: boolean;
  /** True if any of the day's care items is OVERDUE (past its window,
   *  un-logged) per getCareItemStatus. A missed item is CONTENT — the day
   *  is not empty; something needs attention — so the restorative empty
   *  state (which says "the day is still open") must NOT render over a
   *  genuine miss. Computed by the consumer via getOutstandingItemNames so
   *  the same canonical helper governs both the gate and the "Still to do"
   *  line. Optional (defaults false) for back-compat with existing callers. */
  hasOutstandingItems?: boolean;
}

/**
 * Returns true when the JournalEmptyDay composition should render —
 * i.e. the selected today has no events, no completed instances, no
 * notes, no caregiver-authored tone, AND nothing overdue. Past days never
 * render JournalEmptyDay.
 */
export function shouldRenderJournalEmptyDay(
  input: JournalEmptyDayCheckInput,
): boolean {
  if (input.isViewingPast) return false;
  return (
    !input.hasEvents
    && !input.hasNotes
    && !input.hasTone
    && !input.hasCompletedInstances
    && !input.hasOutstandingItems
  );
}

/**
 * Names of the day's care items that are OVERDUE (past their window,
 * un-logged) — the "Still to do" list Journal surfaces so it names what's
 * outstanding instead of falsely claiming "the day is still open."
 *
 * Routes through getCareItemStatus (the canonical missed-vs-pending helper)
 * — it CONSUMES the helper and derives no status of its own. Persisted
 * status is never read here; a merely-pending (not-yet-overdue) item is
 * correctly excluded so a genuinely-still-open morning stays quiet.
 */
export function getOutstandingItemNames(
  instances: OutstandingInstance[],
): string[] {
  return instances
    .filter((i) => getCareItemStatus(i) === 'overdue')
    .map((i) => i.itemName);
}
