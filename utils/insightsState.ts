// ============================================================================
// INSIGHTS STATE CLASSIFIER — Phase 3.7.3.
//
// At fresh-install state (1 day of data, sparse logs), the Insights tab
// previously rendered both the empty-state UI ("13 more days, then trends
// appear") AND the populated-state UI (Visit prep + Care/Medication
// reports + a 9% adherence chart with red Xs). Caregivers were
// simultaneously told to wait 13 days and shown a sparse, alarming chart.
// Information flow broke.
//
// Phase 3.7.3 introduces a single classifier so every section in
// app/(tabs)/understand.tsx can gate its render against the same state:
//
//   empty       loggedEventCount === 0       no logs at all
//   building    1+ events, < 14 days of data Patterns Coming + watch-for
//   populated   ≥ 14 days of data            full Insights surface
//
// Critical invariant: the medication adherence chart NEVER renders when
// daysOfData < 14, regardless of any other condition. A 9% reading with
// sparse data reads as judgment to a caregiver and damages trust on
// first impression. Tests assert this directly.
// ============================================================================

export type InsightsState = 'empty' | 'building' | 'populated';

export const POPULATED_DAYS_THRESHOLD = 14;

/**
 * Phase 28a — day-count threshold below which the InsightsEmptyStatePreview
 * ("Patterns Coming · X of 14 days") renders, and at-or-above which the
 * partial-populated surfaces (this-week's-pulse summary + data-gaps
 * section) start rendering inside the building state.
 *
 * Pre-28a the empty-state preview was gated on `gating.showPatternsComing`
 * (true through all of building state, i.e. days 1-13) while the pulse +
 * data-gaps surfaces gated independently on `daysOfData >= 7`. The 7-13
 * day window therefore rendered both groups simultaneously. Sample data
 * seeded 13 days, landing exactly in the overlap and surfacing the bug.
 *
 * Phase 28a fix: the empty-state preview's guard now also requires
 * `daysOfData < EMPTY_STATE_DAYS_THRESHOLD`. Three mutually-exclusive
 * render groups:
 *
 *   • days < 7        → empty-state preview only
 *   • 7 ≤ days < 14   → pulse + data-gaps only (building with content)
 *   • days ≥ 14       → full populated (reports + adherence too)
 *
 * Naming rationale: parallels POPULATED_DAYS_THRESHOLD's _DAYS_THRESHOLD
 * suffix. The "EMPTY_STATE" prefix names the surface the threshold
 * gates — the empty-state preview hides at-or-above this day count.
 */
export const EMPTY_STATE_DAYS_THRESHOLD = 7;

/**
 * Classify the Insights tab into one of three states. Pure function so
 * the gating logic is testable without mounting the full screen.
 *
 * @param daysOfData       Distinct calendar days that carry tracked data.
 * @param loggedEventCount Total logged events across all categories.
 *                         Used to distinguish "no data ever" from
 *                         "1 day in, building."
 */
export function classifyInsightsState(
  daysOfData: number,
  loggedEventCount: number,
): InsightsState {
  if (loggedEventCount === 0) return 'empty';
  if (daysOfData < POPULATED_DAYS_THRESHOLD) return 'building';
  return 'populated';
}

/**
 * Gating rules per section, derived from the state. Centralised so the
 * understand.tsx render path stays declarative and the per-section
 * tests can pin each rule independently.
 */
export interface InsightsGating {
  /** Patterns Coming card + watch-for list. */
  showPatternsComing: boolean;
  /** Tip card ("Start logging from Now"). Empty state only. */
  showTipCard: boolean;
  /** Real pattern cards (correlations, EmberMate noticed). */
  showPatternCards: boolean;
  /** Reports section (Visit prep + Care report + Medication report). */
  showReports: boolean;
  /** Medication adherence chart. */
  showAdherenceChart: boolean;
}

export function gatingForState(
  state: InsightsState,
  daysOfData: number,
): InsightsGating {
  // Adherence chart has its own hard floor independent of state — the
  // spec calls this out explicitly. A populated-state classification
  // requires daysOfData >= 14 anyway, but the explicit check defends
  // against future classifier changes that could weaken the threshold.
  const adherenceFloor = daysOfData >= POPULATED_DAYS_THRESHOLD;
  switch (state) {
    case 'empty':
      return {
        showPatternsComing: true,
        showTipCard: true,
        showPatternCards: false,
        showReports: false,
        showAdherenceChart: false,
      };
    case 'building':
      return {
        showPatternsComing: true,
        showTipCard: false,
        showPatternCards: false,
        showReports: false,
        showAdherenceChart: false,
      };
    case 'populated':
      return {
        showPatternsComing: false,
        showTipCard: false,
        showPatternCards: true,
        showReports: true,
        showAdherenceChart: adherenceFloor,
      };
  }
}
