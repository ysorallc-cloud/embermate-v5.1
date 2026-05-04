// ============================================================================
// WHAT CHANGED — synthesize a 1-3 line lede for Visit Prep
// Phase 5.8.b
//
// Reads existing detector outputs (symptom changes, vital trends, functional
// issues) and produces a short, plain-language summary the caregiver can
// edit before the PDF is generated. The pull is auto-draft only; user edits
// persist via storage/visitPrepDraftRepo.ts.
// ============================================================================

import type { SymptomChange } from './symptomChangeDetection';
import type { FunctionalIssue } from './functionalIssueExtraction';

export interface WhatChangedVitalSnapshot {
  type: string;
  label: string;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  outOfRange: number;
}

export interface WhatChangedInput {
  symptomChanges: SymptomChange[];
  vitals: WhatChangedVitalSnapshot[];
  functionalIssues: FunctionalIssue[];
  /** Length of the visit-prep window in days. < 7 → insufficientData. */
  periodDays: number;
}

export interface WhatChangedResult {
  observations: string[];
  insufficientData: boolean;
}

const MAX_OBSERVATIONS = 3;
const MIN_DAYS = 7;
const DEFERRED_MESSAGE = 'Two weeks of tracking suggested before patterns appear here.';

const FUNCTIONAL_PRIORITY: Record<FunctionalIssue['severity'], number> = {
  urgent: 0,
  concerning: 1,
  watch: 2,
};

function describeVital(v: WhatChangedVitalSnapshot): string | null {
  // Only surface vitals when there's a real change signal — directional
  // trend AND at least one out-of-range reading. "Stable but high" stays in
  // the table, not the lede.
  if (v.trend === 'stable' || v.trend === 'unknown') return null;
  if (v.outOfRange <= 0) return null;
  const direction = v.trend === 'up' ? 'higher' : 'lower';
  const verb = v.trend === 'up' ? 'trending up' : 'trending down';
  return (
    `${v.label} readings have been ${verb} — ${v.outOfRange} ` +
    `${v.outOfRange === 1 ? 'reading' : 'readings'} outside the usual range.`
  );
}

export function buildWhatChanged(input: WhatChangedInput): WhatChangedResult {
  if (input.periodDays < MIN_DAYS) {
    return { observations: [DEFERRED_MESSAGE], insufficientData: true };
  }

  // Pass 1 — collect negative-direction observations in priority order.
  const negatives: string[] = [];

  // Worsening / new symptoms first.
  const worseningSymptoms = input.symptomChanges
    .filter((s) => s.change === 'worse' || s.change === 'new')
    .map((s) => s.briefDescription);
  for (const line of worseningSymptoms) {
    if (negatives.length >= MAX_OBSERVATIONS) break;
    negatives.push(line);
  }

  // Concerning / urgent functional issues next.
  const sortedFn = [...input.functionalIssues].sort(
    (a, b) => FUNCTIONAL_PRIORITY[a.severity] - FUNCTIONAL_PRIORITY[b.severity],
  );
  for (const issue of sortedFn) {
    if (issue.severity === 'watch') break; // skip the lowest tier in the lede
    if (negatives.length >= MAX_OBSERVATIONS) break;
    negatives.push(issue.observation);
  }

  // Vitals last among negatives.
  for (const v of input.vitals) {
    if (negatives.length >= MAX_OBSERVATIONS) break;
    const line = describeVital(v);
    if (line) negatives.push(line);
  }

  if (negatives.length > 0) {
    return { observations: negatives.slice(0, MAX_OBSERVATIONS), insufficientData: false };
  }

  // Pass 2 — no negatives. Surface improvements only as fallback.
  const improvements = input.symptomChanges
    .filter((s) => s.change === 'better' || s.change === 'resolved')
    .map((s) => s.briefDescription)
    .slice(0, MAX_OBSERVATIONS);

  if (improvements.length > 0) {
    return { observations: improvements, insufficientData: false };
  }

  return { observations: [DEFERRED_MESSAGE], insufficientData: true };
}
