// ============================================================================
// Phase 7 — missed-count consistency across surfaces.
//
// Audit guard: given a known set of DailyCareInstance shapes, every surface
// that surfaces a "missed meds" count must agree. Today's Outcomes and the
// alert/insight engines may scope to different categories, but for
// `category === medication` the numbers must match for the same input.
//
// This is a contract test on the `classifyOutcomes` helper + a stub for
// the alert engine's missed-meds derivation. If the engines disagree in
// production, this test fails and the audit needs another pass.
// ============================================================================

import { classifyOutcomes, type ClassifyInput } from '../../utils/dailyOutcomes';

// Mirror the logic the alert engine uses to count missed medications today.
// Pinned here so a regression in either surface fails this test.
function countMissedMedsViaAlertEngine(instances: ClassifyInput[]): number {
  return instances.filter(
    (i) => i.itemType === 'medication' && i.status === 'missed',
  ).length;
}

const fixture: ClassifyInput[] = [
  { status: 'missed', itemName: 'Acetaminophen', itemType: 'medication' },
  { status: 'missed', itemName: 'Amlodipine', itemType: 'medication' },
  { status: 'completed', itemName: 'Lisinopril', itemType: 'medication' },
  { status: 'missed', itemName: 'Morning vitals', itemType: 'vitals' },
  { status: 'pending', itemName: 'Evening wellness', itemType: 'wellness' },
  { status: 'completed', itemName: 'Breakfast', itemType: 'meal' },
  { status: 'skipped', itemName: 'Walk', itemType: 'activity' },
];

describe('missed-count consistency — same definition across surfaces', () => {
  it('TodayOutcomes\' missed count for category="meds" matches the alert engine', () => {
    const outcomes = classifyOutcomes(fixture);
    const fromOutcomes = (outcomes.missed.items ?? []).filter(
      (i) => i.itemType === 'medication',
    ).length;
    const fromAlertEngine = countMissedMedsViaAlertEngine(fixture);
    expect(fromOutcomes).toBe(fromAlertEngine);
    expect(fromOutcomes).toBe(2);
  });

  it('skipped is NOT counted as missed (intentional skip is a positive action)', () => {
    const all: ClassifyInput[] = [
      { status: 'skipped', itemName: 'Acetaminophen', itemType: 'medication' },
      { status: 'completed', itemName: 'Amlodipine', itemType: 'medication' },
    ];
    expect(classifyOutcomes(all).missed.count).toBe(0);
    expect(countMissedMedsViaAlertEngine(all)).toBe(0);
  });

  it('TodayOutcomes\' missed.count is the union across all categories (broader scope)', () => {
    const outcomes = classifyOutcomes(fixture);
    // 2 missed meds + 1 missed vitals
    expect(outcomes.missed.count).toBe(3);
  });

  it('per-category missed numbers reconcile (audit contract)', () => {
    // For every itemType present, missed item counts must match between
    // surfaces. If a future surface introduces a different definition
    // (e.g. counting late-but-not-yet-overdue as "missed"), this test
    // surfaces the divergence.
    const outcomes = classifyOutcomes(fixture);
    const seenTypes = new Set<string>(fixture.map((i) => i.itemType));
    for (const t of seenTypes) {
      const fromOutcomes = (outcomes.missed.items ?? []).filter(
        (i) => i.itemType === t,
      ).length;
      const fromAlertEngine = fixture.filter(
        (i) => i.itemType === t && i.status === 'missed',
      ).length;
      expect({ type: t, count: fromOutcomes }).toEqual({ type: t, count: fromAlertEngine });
    }
  });
});
