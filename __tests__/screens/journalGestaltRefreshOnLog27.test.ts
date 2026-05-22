// ============================================================================
// Phase 27 closeout — gestalt refresh on log events (test-first reproduction).
//
// REPRODUCTION
//
// Section 1's "How today went" gestalt sentence is built by
// `buildShapeOfDay(selectedDate)` and cached in `narrativeSummary`
// state in journal.tsx. The useEffect that builds it has deps
// `[selectedDate]` ONLY — no event-driven re-run. So when the user
// logs vitals/meds/wellness/etc., the underlying data updates (Section
// 2's `brief` refreshes via the L427 useDataListener → loadReport)
// but `narrativeSummary` stays frozen on its pre-log value.
//
// Device-confirmed symptom (2026-05-21): Section 1 says "Vitals
// reading not yet recorded" while Section 2 shows BP 158/95 recorded
// at 5:58 PM same day. Self-contradiction = stale-closure refresh bug,
// not a data-source bug (the pipelines are correctly synced — vitals
// instance status flips pending → completed on log; centralStorage
// gets the reading; both Section 2's brief AND a fresh buildShapeOfDay
// would produce consistent results).
//
// The fix is end-to-end behavioral, but two test layers pin it
// structurally so it can't silently regress:
//
//   • Contract A (source-level): journal.tsx exposes a refreshMoodLine
//     useCallback that calls setNarrativeSummary, AND that callback is
//     wired into a useDataListener subscribing to the full event set
//     (DAILY_INSTANCES / LOGS / VITALS / MEDICATION / WELLNESS / MOOD).
//     The full set matters — the bug affects every bucket, not just
//     vitals (log a med → "X meds still scheduled" stays stale; log a
//     wellness check → wellness clause stays stale; etc.).
//
//   • Contract B (unit-level): buildShapeOfDay's per-instance logic
//     produces consistent output. Given vitals.status === 'completed'
//     the sentence does NOT contain "not yet recorded" / "missed";
//     given vitals.status === 'pending' it MAY; given no vitals at
//     all it doesn't mention vitals. Defends the per-instance logic
//     against future regression and rules out a wrong-source bug.
//
// EXPECTED PRE-FIX:
//   • Contract A — RED. No refreshMoodLine helper exists; no
//     useDataListener calls setNarrativeSummary.
//   • Contract B — GREEN. buildShapeOfDay's per-instance logic is
//     already correct; the bug is upstream in the refresh chain.
//
// EXPECTED POST-FIX:
//   • Both green. refreshMoodLine extracted into a useCallback, wired
//     to the 6-event listener; per-instance logic untouched.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

// Strip line + block comments so commit-narrative mentions of refresh
// helpers don't false-positive against structural assertions.
const journalStripped = journalSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// Mock the storage layer Contract B needs. These have to land before
// the buildShapeOfDay import below so the mocks take effect.
const mockListDailyInstances: jest.Mock = jest.fn(async () => [] as any[]);
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...args: any[]) =>
    (mockListDailyInstances as any).apply(null, args),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: jest.fn(async () => 'default'),
}));

import { buildShapeOfDay } from '../../utils/buildShapeOfDay';

// --------------------------------------------------------------------------
// CONTRACT A — source-level structural pin
// --------------------------------------------------------------------------
describe('Phase 27 closeout — Contract A: gestalt refresh listener (source-level)', () => {
  it('A.1: journal.tsx defines a refreshMoodLine useCallback that calls setNarrativeSummary', () => {
    // The fix extracts the moodLine load (originally an inline async
    // IIFE inside a [selectedDate]-deps useEffect) into a named
    // useCallback so both the initial-mount useEffect AND a
    // data-listener can invoke it without duplicating the build
    // logic. The callback must reach setNarrativeSummary (the gestalt
    // state setter); a no-op refresh that doesn't update state would
    // pass the structural pin but not the behavior.
    const m = journalStripped.match(
      /const\s+refreshMoodLine\s*=\s*useCallback\([\s\S]{0,1200}?\}\s*,\s*\[[^\]]*\]\s*\)/,
    );
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/setNarrativeSummary/);
  });

  it('A.2: refreshMoodLine is invoked from a useDataListener (event-driven refresh path)', () => {
    // Without this listener wiring, refreshMoodLine exists but only
    // runs once on mount via the initial [selectedDate] useEffect —
    // the stale-closure bug recurs.
    const m = journalStripped.match(
      /useDataListener\([\s\S]{0,1500}?refreshMoodLine[\s\S]{0,200}?\)/,
    );
    expect(m).not.toBeNull();
  });

  it('A.3: the listener subscribes to the FULL event set (every bucket whose log can change the gestalt)', () => {
    // The bug affects every bucket, not just vitals. Subscribing to
    // only EVENT.VITALS would leave the same stale-summary class for
    // meds (log a med → "X meds still scheduled" stays); wellness
    // (log a check-in → wellness clause stays stale); mood (mood
    // changes don't drive the shape-of-day directly but affect
    // related copy paths); etc. The full set covers every signal
    // that can change a day's shape.
    const REQUIRED_EVENTS = [
      'DAILY_INSTANCES',
      'LOGS',
      'VITALS',
      'MEDICATION',
      'WELLNESS',
      'MOOD',
    ];
    // Locate the listener block that wires refreshMoodLine (Contract
    // A.2 already confirmed it exists). Then assert every required
    // EVENT.* token appears inside that block.
    const block = journalStripped.match(
      /useDataListener\([\s\S]{0,1500}?refreshMoodLine[\s\S]{0,200}?\)/,
    );
    expect(block).not.toBeNull();
    const missing = REQUIRED_EVENTS.filter(
      (ev) => !block![0].includes(`EVENT.${ev}`),
    );
    if (missing.length > 0) {
      throw new Error(
        `Gestalt refresh listener is missing required event subscriptions:\n` +
          `  missing: ${missing.map((e) => `EVENT.${e}`).join(', ')}\n` +
          `  block:   ${block![0].slice(0, 500)}...\n\n` +
          `The bug affects every bucket. Subscribing to only some leaves the same\n` +
          `stale-summary class for the buckets you skip. Subscribe to all 6.`,
      );
    }
    expect(missing).toEqual([]);
  });
});

// --------------------------------------------------------------------------
// CONTRACT B — unit-level self-consistency on buildShapeOfDay
// --------------------------------------------------------------------------
describe('Phase 27 closeout — Contract B: buildShapeOfDay vitals self-consistency', () => {
  beforeEach(() => {
    mockListDailyInstances.mockReset();
  });

  it('B.1: vitals.status === "completed" produces a sentence WITHOUT "not yet recorded" / "missed"', async () => {
    // Defends the per-instance logic. Pre-fix this assertion passes —
    // buildShapeOfDay correctly reads instance.status. The bug is
    // upstream (the refresh chain doesn't re-run the build); this
    // pin guarantees that if Contract A is satisfied, the per-bucket
    // sentence will be correct.
    mockListDailyInstances.mockResolvedValue([
      { itemType: 'vitals', status: 'completed' },
    ]);
    const result = await buildShapeOfDay('2026-05-19');
    expect(result.hasData).toBe(true);
    expect(result.summary.toLowerCase()).not.toContain('not yet recorded');
    // Vitals appears (the bucket is mentioned) but never paired with
    // a missed/not-yet negation.
    expect(result.summary.toLowerCase()).not.toMatch(
      /vitals[^.]*\b(missed|not yet)\b/,
    );
    // Affirmative — the recorded clause appears.
    expect(result.summary.toLowerCase()).toMatch(/vitals.*recorded|recorded.*vitals/);
  });

  it('B.2: vitals.status === "pending" MAY produce "not yet recorded" copy (informational, not duplicating Section 4)', async () => {
    // The "not yet recorded" copy is correct WHEN the data state IS
    // pending. The bug isn't this branch; it's that the branch
    // doesn't get re-evaluated after a log fires.
    mockListDailyInstances.mockResolvedValue([
      { itemType: 'vitals', status: 'pending' },
    ]);
    const result = await buildShapeOfDay('2026-05-19');
    expect(result.hasData).toBe(true);
    // Source-level allow — the not-yet-recorded clause is valid here.
    // (Whether it's UX-desirable that pending content duplicates
    // Section 4 STILL PENDING is a separate dedup question — out of
    // scope of this fix; pending dedup for the gestalt would be a
    // future phase.)
    expect(result.summary.toLowerCase()).toMatch(/not yet recorded/);
  });

  it('B.3: no vitals instances at all → sentence does NOT mention vitals', async () => {
    mockListDailyInstances.mockResolvedValue([
      { itemType: 'medication', status: 'completed' },
    ]);
    const result = await buildShapeOfDay('2026-05-19');
    expect(result.hasData).toBe(true);
    expect(result.summary.toLowerCase()).not.toContain('vitals');
  });

  it('B.4: mixed completed + pending vitals — recorded clause dominates over scheduled-only phrasing', async () => {
    // 2 instances, 1 completed, 1 still pending. Output must
    // surface the completed beat (so caregivers see what's done)
    // without claiming all vitals are missed.
    mockListDailyInstances.mockResolvedValue([
      { itemType: 'vitals', status: 'completed' },
      { itemType: 'vitals', status: 'pending' },
    ]);
    const result = await buildShapeOfDay('2026-05-19');
    expect(result.hasData).toBe(true);
    // The completed clause must appear (don't drop it for the
    // pending one).
    expect(result.summary.toLowerCase()).toMatch(
      /vitals.*recorded|recorded.*vitals/,
    );
  });
});
