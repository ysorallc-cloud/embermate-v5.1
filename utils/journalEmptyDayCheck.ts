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
}

/**
 * Returns true when the JournalEmptyDay composition should render —
 * i.e. the selected today has no events, no completed instances, no
 * notes, and no caregiver-authored tone. Past days never render
 * JournalEmptyDay.
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
  );
}
