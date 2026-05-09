// ============================================================================
// SAMPLE-DATA HISTORICAL SEED SHAPE — Phase 11.6
//
// Pure decision function for the historical-instance seed loop in
// initializeSampleData. Extracted out of the loop body so the
// per-itemType seed policy is testable as a unit and the medication-
// parity fix is co-located with its contract.
//
// Pre-11.6: the loop seeded only wellness/sleep/hydration past-day
// instances. Medications were filtered out, so every downstream
// surface that reads listDailyInstancesRange for medication adherence
// — Insights adherence grid, Visit Prep, getDistinctInstanceCompletionDays
// — saw zero past-day medication instances. The whole grid was red.
//
// Post-11.6: medications are seeded at ~90% adherence, matching the
// rate seedSampleMedicationLogs already established. Skipped status
// is used for the ~10% miss rate because the existing adherenceRate
// formula in understandInsights.ts (line 635-636) treats
// completedCount + skippedCount as caregiver-acted ("handled").
// Using 'missed' would have made the ~10% read as a real adherence
// gap; using 'skipped' reflects the more accurate "caregiver
// deliberately didn't take this dose" semantics.
//
// Wellness/sleep/hydration stay at 100% completed — they're proxy
// compliance signals, not adherence-style behavior. Other itemTypes
// (vitals, activity, mood, etc.) return null so the loop skips them
// (they're seeded through other paths).
// ============================================================================

export type HistoricalSeedDecision = 'completed' | 'skipped' | null;

/**
 * Returns the status to seed for a past-day instance of the given
 * itemType, or null when the loop should skip the instance entirely.
 *
 * `random` is injected so tests can drive a deterministic distribution.
 */
export function decideHistoricalSeedStatus(
  itemType: string,
  random: () => number = Math.random,
): HistoricalSeedDecision {
  if (itemType === 'wellness' || itemType === 'sleep' || itemType === 'hydration') {
    return 'completed';
  }
  if (itemType === 'medication') {
    // ~90% adherence — matches seedSampleMedicationLogs's 0.1 skip
    // rate so the two seeded layers tell a consistent story.
    return random() > 0.1 ? 'completed' : 'skipped';
  }
  return null;
}
