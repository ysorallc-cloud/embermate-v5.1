// ============================================================================
// Phase 5.8.b — buildWhatChanged: synthesize 1-3 plain-language observations
// from the existing structured detectors.
//
// Priority order:
//   1. Worsening symptom changes (kind: 'worse' or 'new')
//   2. Vital trends with out-of-range readings (trend ≠ 'stable')
//   3. Concerning / urgent functional issues
//   4. Improvements ('better' / 'resolved') if no negatives surfaced
//
// Insufficient data (period < 7 days OR no detectable changes) →
// ["Two weeks of tracking suggested before patterns appear here."]
// ============================================================================

import { buildWhatChanged } from '../../services/whatChanged';
import type { SymptomChange } from '../../services/symptomChangeDetection';
import type { FunctionalIssue } from '../../services/functionalIssueExtraction';

type VitalSnapshot = {
  type: string;
  label: string;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  outOfRange: number;
};

describe('Phase 5.8.b — buildWhatChanged', () => {
  it('returns deferred message when period is under 7 days', () => {
    const out = buildWhatChanged({
      symptomChanges: [],
      vitals: [],
      functionalIssues: [],
      periodDays: 3,
    });
    expect(out.observations).toEqual([
      'Two weeks of tracking suggested before patterns appear here.',
    ]);
    expect(out.insufficientData).toBe(true);
  });

  it('returns deferred message when no changes are detectable, even if period is long', () => {
    const out = buildWhatChanged({
      symptomChanges: [],
      vitals: [],
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.observations).toEqual([
      'Two weeks of tracking suggested before patterns appear here.',
    ]);
    expect(out.insufficientData).toBe(true);
  });

  it('surfaces a worsening symptom change as a single observation', () => {
    const symptomChanges: SymptomChange[] = [
      {
        symptom: 'headache',
        change: 'worse',
        firstHalfFreq: 1,
        secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent in the past week (4 vs 1).',
      },
    ];
    const out = buildWhatChanged({
      symptomChanges,
      vitals: [],
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.observations).toEqual([
      'Headaches more frequent in the past week (4 vs 1).',
    ]);
    expect(out.insufficientData).toBe(false);
  });

  it('caps at 3 observations even with abundant data', () => {
    const symptomChanges: SymptomChange[] = [
      { symptom: 'a', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 3,
        briefDescription: 'A worsened.' },
      { symptom: 'b', change: 'new', firstHalfFreq: 0, secondHalfFreq: 2,
        briefDescription: 'B is new.' },
      { symptom: 'c', change: 'worse', firstHalfFreq: 2, secondHalfFreq: 4,
        briefDescription: 'C worsened.' },
      { symptom: 'd', change: 'new', firstHalfFreq: 0, secondHalfFreq: 5,
        briefDescription: 'D appeared.' },
    ];
    const functionalIssues: FunctionalIssue[] = [
      { category: 'mood', observation: 'Mood low.', severity: 'urgent' },
    ];
    const out = buildWhatChanged({
      symptomChanges,
      vitals: [],
      functionalIssues,
      periodDays: 30,
    });
    expect(out.observations.length).toBe(3);
  });

  it('symptom worsenings beat functional issues beat vitals when slots are tight', () => {
    const symptomChanges: SymptomChange[] = [
      { symptom: 's1', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'S1 worsened.' },
    ];
    const functionalIssues: FunctionalIssue[] = [
      { category: 'mood', observation: 'F1 concerning.', severity: 'concerning' },
    ];
    const vitals: VitalSnapshot[] = [
      { type: 'systolic', label: 'Systolic BP', trend: 'up', outOfRange: 5 },
    ];
    const out = buildWhatChanged({
      symptomChanges, vitals, functionalIssues, periodDays: 14,
    });
    // Tight to 3; symptom and functional are high priority, vitals last.
    expect(out.observations[0]).toContain('S1 worsened');
    expect(out.observations).toContain('F1 concerning.');
  });

  it('vital trend with out-of-range readings produces a synthesized line', () => {
    const vitals: VitalSnapshot[] = [
      { type: 'systolic', label: 'Systolic BP', trend: 'up', outOfRange: 5 },
    ];
    const out = buildWhatChanged({
      symptomChanges: [],
      vitals,
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.observations.length).toBe(1);
    expect(out.observations[0]).toMatch(/Systolic BP/);
    expect(out.observations[0]).toMatch(/(trending|trended) (up|higher)/i);
  });

  it('improvements surface only when no negatives exist', () => {
    const symptomChanges: SymptomChange[] = [
      { symptom: 'cough', change: 'better', firstHalfFreq: 4, secondHalfFreq: 1,
        briefDescription: 'Cough improving (1 vs 4).' },
    ];
    const out = buildWhatChanged({
      symptomChanges,
      vitals: [],
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.observations.some((s) => /improving|improved|better/i.test(s))).toBe(true);
    expect(out.insufficientData).toBe(false);
  });

  it("ignores 'better' / 'resolved' symptoms when negatives are present", () => {
    const symptomChanges: SymptomChange[] = [
      { symptom: 'cough', change: 'better', firstHalfFreq: 4, secondHalfFreq: 1,
        briefDescription: 'Cough improving.' },
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent.' },
    ];
    const out = buildWhatChanged({
      symptomChanges,
      vitals: [],
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.observations.some((s) => /improving|improved|better/i.test(s))).toBe(false);
    expect(out.observations.some((s) => /Headaches more frequent/.test(s))).toBe(true);
  });

  it('vitals with stable trend are not surfaced even with out-of-range readings', () => {
    // "Stable but high" is a status signal, not a *change* signal — keep
    // it out of the lede; it'll show in the vitals table.
    const vitals: VitalSnapshot[] = [
      { type: 'systolic', label: 'Systolic BP', trend: 'stable', outOfRange: 5 },
    ];
    const out = buildWhatChanged({
      symptomChanges: [],
      vitals,
      functionalIssues: [],
      periodDays: 14,
    });
    expect(out.insufficientData).toBe(true);
  });
});
