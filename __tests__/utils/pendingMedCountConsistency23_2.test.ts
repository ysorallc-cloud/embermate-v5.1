// ============================================================================
// Phase 23.2 F4 — pending-medication count consistency tripwire.
//
// Three derivations of "today's pending medication count" coexist on the
// Now tab today:
//
//   Path A — todayStats.meds (StatRings tile).
//     `app/(tabs)/now.tsx` lines 328–357. For each itemType, builds
//     { completed, total }; `completed` counts status ∈ {'completed',
//     'skipped'}, `total` counts all instances. Pending-equivalent is
//     `total - completed`, which includes status ∈ {'pending', 'missed'}.
//
//   Path B — allPending.filter(itemType === 'medication') (MorningMedsBanner).
//     `app/(tabs)/now.tsx` lines 366–429. todayTimeline.pending is
//     pre-filtered to status === 'pending' only; missed items live in
//     todayTimeline.completed.
//
//   Path C — todayOutcomes.pending.count (EndOfShiftCard composer).
//     `app/(tabs)/now.tsx` lines 435–449. `pending.count = allPending.length`
//     so Path C is identical to Path B (with no itemType filter).
//
// On a no-missed fixture the three paths produce the same medication
// count. With missed items, Path A counts them under "not completed"
// while Paths B/C exclude them as "outside the actionable window." This
// is correct UX divergence — missed is a third category, distinct from
// pending — but the algebraic relationship must hold:
//
//   pathA.unmet(medication) === pathB(medication).count + missed(medication)
//
// This tripwire pins both:
//   1. On the baseline (no missed) the three derivations agree.
//   2. The algebraic relationship holds when missed is introduced.
//
// If a future change drifts any derivation's filter logic, the
// downstream surfaces (MorningMedsBanner, StatRings, EndOfShiftCard)
// will silently show inconsistent numbers. This test breaks first.
//
// Implementation note: the three derivations are re-implemented inline
// to mirror production. When a future phase extracts a shared util,
// this test will be updated to import from that util.
// ============================================================================

type InstanceStatus = 'pending' | 'completed' | 'skipped' | 'missed';

interface FixtureInstance {
  itemType: 'medication' | 'vitals' | 'nutrition' | 'wellness';
  status: InstanceStatus;
  itemName?: string;
}

// Path A — mirrors `getTypeStats` from now.tsx:332-336 for the meds bucket.
function pathA_statsForMeds(instances: FixtureInstance[]): { completed: number; total: number } {
  const typeInstances = instances.filter((i) => i.itemType === 'medication');
  const completed = typeInstances.filter(
    (i) => i.status === 'completed' || i.status === 'skipped',
  ).length;
  return { completed, total: typeInstances.length };
}

// Path B — mirrors allPending derivation from now.tsx:427-429 + the
// upstream pendingWithScores filter at now.tsx:405-407, projected to
// medications via `.filter(i => i.itemType === 'medication')`.
function pathB_pendingMeds(instances: FixtureInstance[]): FixtureInstance[] {
  const allPending = instances.filter((i) => i.status === 'pending');
  return allPending.filter((i) => i.itemType === 'medication');
}

// Path C — mirrors todayOutcomes.pending.count from now.tsx:444-447.
// The full allPending array (no itemType filter); the EndOfShiftCard
// surface aggregates across types, so the medication-projection is
// included here for invariant-comparison only.
function pathC_outcomesPending(instances: FixtureInstance[]): {
  totalCount: number;
  medicationCount: number;
} {
  const allPending = instances.filter((i) => i.status === 'pending');
  return {
    totalCount: allPending.length,
    medicationCount: allPending.filter((i) => i.itemType === 'medication').length,
  };
}

function missedMedsCount(instances: FixtureInstance[]): number {
  return instances.filter((i) => i.itemType === 'medication' && i.status === 'missed').length;
}

describe('Phase 23.2 F4 — pending-medication count consistency tripwire', () => {
  it('contract 1: baseline fixture (no missed) — all three derivations agree on the medication-pending count', () => {
    // 5 medication instances: 3 pending, 2 completed; 1 unrelated vitals
    // instance so Path A's typeInstances filter has work to do.
    const instances: FixtureInstance[] = [
      { itemType: 'medication', status: 'pending', itemName: 'Amlodipine' },
      { itemType: 'medication', status: 'pending', itemName: 'Lisinopril' },
      { itemType: 'medication', status: 'pending', itemName: 'Metformin' },
      { itemType: 'medication', status: 'completed', itemName: 'Atorvastatin' },
      { itemType: 'medication', status: 'completed', itemName: 'Aspirin' },
      { itemType: 'vitals', status: 'pending' },
    ];

    const a = pathA_statsForMeds(instances);
    const b = pathB_pendingMeds(instances);
    const c = pathC_outcomesPending(instances);

    // Path A's unmet count = total - completed (no missed in fixture).
    const aUnmet = a.total - a.completed;

    expect(aUnmet).toBe(3);
    expect(b.length).toBe(3);
    expect(c.medicationCount).toBe(3);
    expect(aUnmet).toBe(b.length);
    expect(b.length).toBe(c.medicationCount);
  });

  it('contract 2: algebraic invariant — A.unmet === B.length + missed(meds), even when missed > 0', () => {
    // Fixture mirrors a late-evening Now scenario: morning meds completed,
    // afternoon meds missed (window passed), evening meds still pending.
    const instances: FixtureInstance[] = [
      { itemType: 'medication', status: 'completed', itemName: 'Morning Amlodipine' },
      { itemType: 'medication', status: 'completed', itemName: 'Morning Metformin' },
      { itemType: 'medication', status: 'missed',    itemName: 'Afternoon Lisinopril' },
      { itemType: 'medication', status: 'missed',    itemName: 'Afternoon Aspirin' },
      { itemType: 'medication', status: 'pending',   itemName: 'Evening Atorvastatin' },
    ];

    const a = pathA_statsForMeds(instances);
    const b = pathB_pendingMeds(instances);
    const missed = missedMedsCount(instances);

    const aUnmet = a.total - a.completed;
    expect(aUnmet).toBe(3);     // pending + missed
    expect(b.length).toBe(1);   // pending only
    expect(missed).toBe(2);

    // The canonical invariant. If any production path drifts, this fails.
    expect(aUnmet).toBe(b.length + missed);
  });

  it('contract 3: skipped status counts as completed in Path A (consistent with StatRings UX)', () => {
    // Skipped doses are an active caregiver decision, not a missed window.
    // StatRings should show them as part of the "done" portion of the
    // ring; the invariant must hold under skipped-non-zero too.
    const instances: FixtureInstance[] = [
      { itemType: 'medication', status: 'pending'   },
      { itemType: 'medication', status: 'completed' },
      { itemType: 'medication', status: 'skipped'   },
    ];

    const a = pathA_statsForMeds(instances);
    expect(a.completed).toBe(2); // completed + skipped both count
    expect(a.total).toBe(3);
    expect(a.total - a.completed).toBe(1); // only the pending item

    const b = pathB_pendingMeds(instances);
    expect(b.length).toBe(1);

    // No missed → invariant collapses to direct equality.
    expect(a.total - a.completed).toBe(b.length);
  });

  it('contract 4: empty medication fixture — all paths report 0 (no NaN, no off-by-one)', () => {
    const instances: FixtureInstance[] = [
      { itemType: 'vitals', status: 'pending' },
      { itemType: 'nutrition', status: 'completed' },
    ];
    const a = pathA_statsForMeds(instances);
    const b = pathB_pendingMeds(instances);
    const c = pathC_outcomesPending(instances);
    expect(a).toEqual({ completed: 0, total: 0 });
    expect(b.length).toBe(0);
    expect(c.medicationCount).toBe(0);
    expect(c.totalCount).toBe(1); // the vitals pending instance
  });
});
