// ============================================================================
// Phase 11.5.1 — Journal empty-day trigger reads instance pipeline.
//
// Bug repro: device-review screenshot shows <JournalEmptyDay> rendered
// alongside the populated counter ("4 of 12 logged · 7 still to do").
// Sample data writes 14 days of completed instances via the instance
// pipeline; the empty-day check at journal.tsx:625-630 reads only
// dayEvents (event pipeline). Result: !hasEvents → empty=true even
// when the day has 4 completed instances.
//
// Fix: the empty-day decision factors in `outcomes.logged.count > 0`
// (the same instance source the counter line uses). Pulled into a
// pure helper so the decision is testable as a unit and the source
// of the bug fix is co-located with its contract.
//
// Contracts pinned:
//   1. Reproduction: when hasCompletedInstances=true and dayEvents
//      is empty, helper returns false (NOT empty). Without the fix,
//      this would return true.
//   2. Genuine empty: all four signals false → helper returns true.
//   3. Counter parity: when the fix is engaged, the empty-day branch
//      and the populated counter are mutually exclusive across all
//      input combinations (this is a property test).
//   4. Past-day path unaffected: isViewingPast=true short-circuits
//      to false regardless. Past days use NarrativeView, which has
//      its own empty handling.
//   5. Source-level wiring: journal.tsx consumes the helper and
//      passes outcomes.logged.count > 0 as hasCompletedInstances.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  shouldRenderJournalEmptyDay,
  JournalEmptyDayCheckInput,
} from '../../utils/journalEmptyDayCheck';

function input(over: Partial<JournalEmptyDayCheckInput> = {}): JournalEmptyDayCheckInput {
  return {
    isViewingPast: false,
    hasEvents: false,
    hasNotes: false,
    hasTone: false,
    hasCompletedInstances: false,
    ...over,
  };
}

describe('Phase 11.5.1 — shouldRenderJournalEmptyDay', () => {
  describe('Contract 1: bug reproduction', () => {
    it('hasCompletedInstances=true with no events → NOT empty (sample-data parity fix)', () => {
      // Sample-data screenshot: 4 completed instances, 0 events.
      // Pre-fix this returned true (incorrectly empty); post-fix
      // returns false.
      const out = shouldRenderJournalEmptyDay(
        input({ hasCompletedInstances: true }),
      );
      expect(out).toBe(false);
    });

    it('hasCompletedInstances=true alongside hasNotes/hasTone is also NOT empty', () => {
      // Property: any single populated signal disqualifies empty.
      expect(
        shouldRenderJournalEmptyDay(
          input({ hasCompletedInstances: true, hasNotes: true }),
        ),
      ).toBe(false);
      expect(
        shouldRenderJournalEmptyDay(
          input({ hasCompletedInstances: true, hasTone: true }),
        ),
      ).toBe(false);
    });
  });

  describe('Contract 2: genuine empty day', () => {
    it('all four signals false → empty=true', () => {
      const out = shouldRenderJournalEmptyDay(input());
      expect(out).toBe(true);
    });
  });

  describe('Contract 3: counter parity (mutual exclusion)', () => {
    // Property: across all 4-bit combinations of (hasEvents, hasNotes,
    // hasTone, hasCompletedInstances) for the today path, the helper
    // and "any populated counter" must never both be true. The
    // counter line at journal.tsx:716-725 renders when total > 0 —
    // same instance source the helper now consults.
    const bits: Array<[boolean, boolean, boolean, boolean]> = [];
    for (const e of [false, true])
      for (const n of [false, true])
        for (const t of [false, true])
          for (const c of [false, true])
            bits.push([e, n, t, c]);

    for (const [e, n, t, c] of bits) {
      it(`exclusive: events=${e} notes=${n} tone=${t} completed=${c}`, () => {
        const empty = shouldRenderJournalEmptyDay(
          input({
            hasEvents: e,
            hasNotes: n,
            hasTone: t,
            hasCompletedInstances: c,
          }),
        );
        const counterPopulated = e || n || t || c;
        // If counter would render (any signal populated), empty must
        // be false. Mutually exclusive.
        if (counterPopulated) expect(empty).toBe(false);
        else expect(empty).toBe(true);
      });
    }
  });

  describe('Contract 4: past-day path unaffected', () => {
    it('isViewingPast=true → empty=false regardless of other inputs', () => {
      // Past days use NarrativeView with its own empty handling; the
      // today-only JournalEmptyDay must not render.
      expect(
        shouldRenderJournalEmptyDay(input({ isViewingPast: true })),
      ).toBe(false);
      expect(
        shouldRenderJournalEmptyDay(
          input({
            isViewingPast: true,
            hasEvents: false,
            hasCompletedInstances: false,
          }),
        ),
      ).toBe(false);
    });
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring audit
// ----------------------------------------------------------------------------

describe('Phase 11.5.1 — journal.tsx wiring', () => {
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('contract 5: imports shouldRenderJournalEmptyDay from the helper', () => {
    expect(journalSrc).toMatch(
      /import\s*\{[^}]*\bshouldRenderJournalEmptyDay\b[^}]*\}\s*from\s*['"][^'"]+\/utils\/journalEmptyDayCheck['"]/,
    );
  });

  it('contract 5: the empty-day decision passes outcomes.logged.count > 0 as hasCompletedInstances', () => {
    // The helper's hasCompletedInstances flag must come from the
    // instance-pipeline source the counter already reads. Without
    // this, the bug returns.
    expect(journalSrc).toMatch(
      /hasCompletedInstances\s*:\s*outcomes\.logged\.count\s*>\s*0/,
    );
  });

  it('contract 5: no inline empty-day logic remains (helper owns the decision)', () => {
    // Pre-fix the empty check was inline at lines 624-630 and again
    // at 644-651. After extraction the inline pattern should be gone.
    const inlinePattern = /!hasEvents\s*&&\s*!hasNotes\s*&&\s*!hasTone(?!\s*&&\s*!hasCompletedInstances)/;
    expect(journalSrc).not.toMatch(inlinePattern);
  });
});
