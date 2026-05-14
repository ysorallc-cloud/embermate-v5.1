// ============================================================================
// Phase 23.2 F2 — End-of-shift orphan count anchor.
//
// Post-23.1, when the only non-zero outcome is missed items, the body
// rendered as "11 not yet logged. Review before handing off." The bare
// count read as orphaned — 11 of what? Phase 23.2's confirmed framing
// switches that case to denominator-anchored grammar:
//
//   "X of N logged today. Review before handing off."
//
// where X = logged.count (0 in the screenshot case) and N = total
// (logged + pending + missed). This harmonises with two existing
// fraction-grammar surfaces:
//
//   • Journal footer (JournalDisclaimer): "X of N logged today"
//   • Journal gestalt block: "0/5 medications logged"
//
// If Phase 22.4 later reframes the gestalt away from fractions, this
// footer follows then.
//
// Scope:
//   • ONLY the orphan case (logged === 0 AND pending === 0 AND missed > 0)
//     switches to the new framing.
//   • The all-zero day (logged + pending + missed all zero) keeps its
//     Phase-23.1 wrap-up fallback unchanged.
//   • Cases with pending OR with logged > 0 keep their Phase-23.1
//     witness-voice clauses unchanged (pending is the actionable signal
//     in those cases).
// ============================================================================

import { composeEndOfShiftBody } from '../../../../utils/text/composers/endOfShiftBody';
import type { DailyOutcomes, Alert } from '../../../../utils/text/types';

const noAlerts: Alert[] = [];

describe('Phase 23.2 F2 — End-of-shift orphan count anchor', () => {
  it('contract 1: orphan case (logged=0, pending=0, missed>0) → "0 of N logged today"', () => {
    const allMissed: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 11, names: [] },
      pending: { count: 0, names: [] },
    };
    expect(composeEndOfShiftBody(allMissed, noAlerts)).toBe(
      '0 of 11 logged today. Review before handing off.',
    );
  });

  it('contract 2: small orphan (1 missed) preserves the fraction grammar', () => {
    const oneMissed: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 1, names: ['Acetaminophen'] },
      pending: { count: 0, names: [] },
    };
    expect(composeEndOfShiftBody(oneMissed, noAlerts)).toBe(
      '0 of 1 logged today. Review before handing off.',
    );
  });

  it('contract 3: orphan case does NOT use the legacy "X not yet logged" phrasing', () => {
    const allMissed: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 11, names: [] },
      pending: { count: 0, names: [] },
    };
    const out = composeEndOfShiftBody(allMissed, noAlerts);
    // Defensive: the 23.1 orphan output was "11 not yet logged. ..."
    // The 23.2 anchored output replaces it; the legacy clause must not
    // re-appear on this branch.
    expect(out).not.toMatch(/^11 not yet logged/);
  });

  it('contract 4: pending-non-zero case keeps the 23.1 witness-voice clauses (unchanged)', () => {
    // Reconciliation example from the simulator review: 0 logged, 11
    // missed, 3 pending. Pending IS the actionable evening signal, so
    // the witness-voice clauses still lead. F2 only changes the orphan
    // branch.
    const mixed: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 11, names: [] },
      pending: { count: 3, names: ['Evening meds', 'Dinner', 'BP check'] },
    };
    expect(composeEndOfShiftBody(mixed, noAlerts)).toBe(
      '3 still to do this evening, 11 not yet logged. Review before handing off.',
    );
  });

  it('contract 5: logged-non-zero with only missed details keeps the 23.1 phrasing (unchanged)', () => {
    // Not an orphan — the logged clause anchors. Phase 23.1 output stands.
    const someLoggedSomeMissed: DailyOutcomes = {
      logged: { count: 5 },
      missed: { count: 1, names: ['Amlodipine'] },
      pending: { count: 0, names: [] },
    };
    expect(composeEndOfShiftBody(someLoggedSomeMissed, noAlerts)).toBe(
      '5 items logged, 1 not yet logged. Review before handing off.',
    );
  });

  it('contract 6: all-zero day keeps the 23.1 wrap-up fallback (unchanged)', () => {
    const allZero: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 0, names: [] },
      pending: { count: 0, names: [] },
    };
    expect(composeEndOfShiftBody(allZero, noAlerts)).toBe(
      "Today's care is wrapping up. Review before handing off.",
    );
  });

  it('contract 7: orphan + notable readings — notable clause joins after the fraction', () => {
    // If the day had no logged or pending entries but a notable BP
    // reading surfaced, the fraction still anchors the head, with the
    // notable clause appended like the existing witness-voice paths.
    const orphanWithNotable: DailyOutcomes = {
      logged: { count: 0 },
      missed: { count: 8, names: [] },
      pending: { count: 0, names: [] },
      notable: [
        { type: 'BP', reading: '152/96', time: new Date('2026-04-29T10:00:00'), severity: 'high' },
      ],
    };
    expect(composeEndOfShiftBody(orphanWithNotable, noAlerts)).toBe(
      '0 of 8 logged today, 1 BP reading was high. Review before handing off.',
    );
  });
});
