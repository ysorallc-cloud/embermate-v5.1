// ============================================================================
// Phase 5.10.a — Red Flags & Alerts detector
//
// Top-of-page colored callout that surfaces critical / attention items
// for the doctor to triage immediately. Pulls from existing data shapes
// (adherence, notes, symptom changes, sleep deltas) and emits a flat
// RedFlag[] list with severity. Empty list means no callout block.
//
// v1 / Gate D: the vitals out-of-range branch was REMOVED. "N readings
// outside the usual range" is a fixed-cutoff clinical verdict, not the
// patient's own baseline, and this callout is the most prominent
// provider-facing surface. buildRedFlags no longer accepts vitals; the
// source scan in __tests__/gates/gateD_noClinicalVerdict.test.ts guards
// against the verdict text regressing into services/redFlags.ts.
// ============================================================================

import { buildRedFlags } from '../../services/redFlags';
import type { AdherenceEntry } from '../../services/visitPrepPdf';
import type { SymptomChange } from '../../services/symptomChangeDetection';

type Note = { date: string; text: string };

describe('Phase 5.10.a — buildRedFlags', () => {
  it('returns empty list when nothing flaggable surfaces', () => {
    const flags = buildRedFlags({
      adherence: [],
      notesInRange: [],
      symptomChanges: [],
      sleepDelta: 0,
    });
    expect(flags).toEqual([]);
  });

  it('flags medication refused ≥2 times as attention', () => {
    const adherence: AdherenceEntry[] = [
      { name: 'Amlodipine', dosage: '2.5mg', rate: 60, missedDays: 6 },
    ];
    const flags = buildRedFlags({
      adherence,
      notesInRange: [],
      symptomChanges: [],
      sleepDelta: 0,
      refusedByMed: { Amlodipine: 3 },
    });
    expect(flags.length).toBe(1);
    expect(flags[0].severity).toBe('attention');
    expect(flags[0].text).toMatch(/Amlodipine/);
    expect(flags[0].text).toMatch(/refused/i);
  });

  it('flags critical-keyword notes ("fell" / "hurt" / "severe" / "blood") as critical', () => {
    const notesInRange: Note[] = [
      { date: '2026-04-22', text: 'She fell stepping out of the tub.' },
      { date: '2026-04-26', text: 'Quiet day.' },
    ];
    const flags = buildRedFlags({
      adherence: [], notesInRange, symptomChanges: [], sleepDelta: 0,
    });
    expect(flags.length).toBe(1);
    expect(flags[0].severity).toBe('critical');
    expect(flags[0].text).toMatch(/Apr 22/);
    expect(flags[0].text).toMatch(/fell/i);
  });

  it('flags attention-keyword notes ("hard" / "struggle") as attention', () => {
    const notesInRange: Note[] = [
      { date: '2026-04-21', text: 'Mom said today felt hard.' },
    ];
    const flags = buildRedFlags({
      adherence: [], notesInRange, symptomChanges: [], sleepDelta: 0,
    });
    expect(flags.length).toBe(1);
    expect(flags[0].severity).toBe('attention');
  });

  it('flags worsening symptom changes as critical', () => {
    const symptomChanges: SymptomChange[] = [
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent (4 vs 1).' },
    ];
    const flags = buildRedFlags({
      adherence: [], notesInRange: [], symptomChanges, sleepDelta: 0,
    });
    expect(flags.length).toBe(1);
    expect(flags[0].severity).toBe('critical');
    expect(flags[0].text).toMatch(/Headaches more frequent/);
  });

  it('flags sleep dropped ≥0.5 vs prior period as attention', () => {
    const flags = buildRedFlags({
      adherence: [], notesInRange: [], symptomChanges: [], sleepDelta: -0.6,
    });
    expect(flags.length).toBe(1);
    expect(flags[0].severity).toBe('attention');
    expect(flags[0].text).toMatch(/Sleep/);
  });

  it('does NOT flag sleep when delta is between -0.5 and 0', () => {
    const flags = buildRedFlags({
      adherence: [], notesInRange: [], symptomChanges: [], sleepDelta: -0.3,
    });
    expect(flags).toEqual([]);
  });

  it('does NOT emit a vitals threshold verdict (removed for v1 — Gate D)', () => {
    // Even with worsening vitals in the window, no "outside the usual range"
    // clinical claim may reach this provider-facing callout. The only flags
    // here come from the non-threshold sources.
    const flags = buildRedFlags({
      adherence: [], notesInRange: [], symptomChanges: [], sleepDelta: 0,
    });
    expect(flags.some((f) => /out of range|outside the usual range/i.test(f.text))).toBe(false);
  });

  it('orders flags critical-first regardless of detection order', () => {
    const flags = buildRedFlags({
      adherence: [],
      notesInRange: [
        { date: '2026-04-21', text: 'Felt hard today.' },          // attention
        { date: '2026-04-22', text: 'She fell during the night.' }, // critical
      ],
      symptomChanges: [],
      sleepDelta: 0,
    });
    expect(flags.length).toBe(2);
    expect(flags[0].severity).toBe('critical');
    expect(flags[1].severity).toBe('attention');
  });
});
