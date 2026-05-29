// ============================================================================
// INSIGHTS DATA GAPS — Phase 11.9.3
//
// Pure data-gap detector for the Insights tab's "Missing data" surface.
// Extracted from app/(tabs)/understand.tsx:258 so the function is
// importable in tests without pulling in React Native / expo-router /
// the rest of the screen's component graph.
//
// Reads the rolled-up averages from UnderstandPageData and surfaces
// 1–3 gap rows when sleep / wellness / hydration coverage is sparse.
// computeDataGaps stays a pure function — same input → same output;
// no I/O.
// ============================================================================

import type { UnderstandPageData } from './understandInsights';
import { MVP_HIDDEN_BUCKETS } from '../types/carePlanConfig';

export interface DataGap {
  metric: string;
  daysMissing: number;
  impact: string;
  icon: string;
}

export function computeDataGaps(
  pageData: UnderstandPageData,
  timeRange: number,
): DataGap[] {
  const gaps: DataGap[] = [];

  // Phase 34 F4 — do NOT flag data gaps for v1-hidden buckets. A
  // hidden bucket (sleep/water/activity/appointments) can't be
  // enabled or logged in v1, so surfacing a "Missing Sleep data"
  // gap would be a phantom gap for a feature the caregiver can't
  // act on — the reverse "control doesn't control" pattern. Gated
  // on the same MVP_HIDDEN_BUCKETS single source of truth as every
  // other suppression surface; v1.1 unhide re-enables the gap rows.
  if (pageData.avgSleepHours === 0 && !MVP_HIDDEN_BUCKETS.includes('sleep')) {
    gaps.push({
      metric: 'Sleep',
      daysMissing: timeRange,
      impact: "Can't assess if fatigue reports correlate with sleep quality",
      icon: '😴',
    });
  }

  // Evening wellness — wellness is a v1-VISIBLE bucket, so its gap
  // row stays.
  if (pageData.avgWellnessPerDay < 0.5) {
    const missing = Math.round(timeRange * (1 - pageData.avgWellnessPerDay));
    gaps.push({
      metric: 'Evening wellness',
      daysMissing: missing,
      impact: 'Incomplete picture of end-of-day pain and alertness levels',
      icon: '📋',
    });
  }

  if (pageData.avgHydrationPerDay === 0 && !MVP_HIDDEN_BUCKETS.includes('water')) {
    gaps.push({
      metric: 'Hydration',
      daysMissing: timeRange,
      impact: 'Unable to track dehydration risk or medication absorption',
      icon: '💧',
    });
  }

  return gaps;
}
