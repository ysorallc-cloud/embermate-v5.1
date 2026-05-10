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
//
// Phase 11.7.3a — payload helper. The Insights aggregator at
// understandInsights.ts:614-619 reads `LogEntry.data?.type` to
// bucket avgSleepHours / avgHydrationPerDay. Pre-fix the historical
// loop wrote no payload, so the aggregator's switch never fired;
// the Missing Data section claimed "Sleep / Hydration / Evening
// wellness 14 days missing" while correlations populated from a
// different store. The helper now returns a per-itemType
// LogEntryData payload so the seeded LogEntries decode cleanly.
// ============================================================================

import type { LogEntryData } from '../types/carePlan';

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

/**
 * Returns a minimal LogEntryData payload for the given itemType so
 * the persisted LogEntry can be decoded by understandInsights's
 * data?.type-keyed aggregator. Returns undefined when no payload is
 * needed (medication / non-seeded itemTypes).
 *
 * `random` is injected so tests can drive deterministic values.
 */
export function historicalSeedDataPayload(
  itemType: string,
  random: () => number = Math.random,
): LogEntryData | undefined {
  if (itemType === 'sleep') {
    // 6.5–8.5 hours — a plausible distribution; 14 days of seeded
    // sleep produces a believable avg around 7.5h.
    const hours = Math.round((6.5 + random() * 2) * 10) / 10;
    return { type: 'sleep', hours };
  }
  if (itemType === 'hydration') {
    // 5–10 glasses — 14-day average reads as a reasonable hydration
    // pattern, not perfect, not concerning.
    const glasses = 5 + Math.floor(random() * 6);
    return { type: 'hydration', glasses };
  }
  if (itemType === 'wellness') {
    // The aggregator currently keys wellness via itemType === 'mood'
    // (understandInsights.ts:604). Use type 'mood' so the persisted
    // payload also decodes through any future data-aware aggregation.
    // 11.7.3b fixes the itemType-key mismatch independently — once
    // that lands, this payload still parses cleanly because mood
    // is also a valid LogEntryData shape.
    const mood = 3 + Math.floor(random() * 3); // 3, 4, or 5 — neutral-to-good
    return { type: 'mood', mood };
  }
  return undefined;
}
