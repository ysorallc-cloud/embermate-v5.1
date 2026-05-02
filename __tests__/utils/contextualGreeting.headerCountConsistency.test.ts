// ============================================================================
// Now-tab header count ↔ stat tile count consistency — Phase 2.7.
//
// Device review surfaced a count mismatch on Now: the header subtitle read
// "17 items still pending" while the four stat tiles + schedule + Outcomes
// all read 9. Both numbers were mathematically correct — they were
// answering different questions. The header's `remaining()` /
// `totalDone()` / `totalItems()` helpers iterated over a 7-key list
// (meds, vitals, meals, water, sleep, activity, wellness) that included
// three categories — water, sleep, activity — that don't surface as stat
// tiles, so they counted invisibly toward the header's "N pending"
// number.
//
// Phase 2.7 fix: align the header's iteration list with the four
// categories StatRings actually displays (meds, vitals, wellness, meals).
// Lifted into a shared `HEADER_COUNT_CATEGORIES` constant at the top of
// contextualGreeting.ts so the contract is visible at the source and the
// structural test below can pin both surfaces in lockstep.
//
// Pinning the structural contract here matters more than the value
// assertions: in 6 months when someone adds an `activity` tile or removes
// `wellness`, this test forces them to update both surfaces together.
// ============================================================================

import { buildGreeting, HEADER_COUNT_CATEGORIES } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

// Fixture: 9 visible items pending across the four stat tiles, plus 9
// items on hidden water/sleep categories that should NOT count toward
// the header subtitle.
const fixture: TodayStats = {
  meds:     { completed: 0, total: 2 },
  vitals:   { completed: 0, total: 1 },
  wellness: { completed: 0, total: 3 },
  meals:    { completed: 0, total: 3 },
  // Hidden categories — should be ignored by the header counters.
  water:    { completed: 0, total: 8 },
  sleep:    { completed: 0, total: 1 },
} as unknown as TodayStats;

describe('Phase 2.7 — header count matches displayed stat tiles', () => {
  it('late-night (hour < 6) subtitle counts only the four visible categories', () => {
    const g = buildGreeting(1, fixture, null, 'Mom');
    // Visible total pending = (2-0)+(1-0)+(3-0)+(3-0) = 9.
    expect(g.subtitle).toBe('9 items still pending.');
    // Negative — the hidden categories' 9 items must NOT inflate the count.
    expect(g.subtitle).not.toMatch(/\b1[78]\b/);
    expect(g.subtitle).not.toMatch(/water|sleep|activity/i);
  });

  it('evening (hour 20) subtitle counts only the four visible categories', () => {
    const g = buildGreeting(20, fixture, null, 'Mom');
    expect(g.subtitle).toBe('Almost done — 9 left tonight');
    expect(g.subtitle).not.toMatch(/\b1[78]\b/);
  });

  it('HEADER_COUNT_CATEGORIES matches the StatRings CATEGORIES key set', () => {
    // Structural lockstep: any future fifth tile / removed tile forces a
    // sync update here. Read the StatRings source directly so we don't have
    // to mount React Native to introspect the exported component.
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const src = readFileSync(
      join(__dirname, '../../components/now/StatRings.tsx'),
      'utf8',
    );
    // Pull every `key: '<value>'` literal inside the CATEGORIES const block.
    const block = src.match(/CATEGORIES[^=]*=\s*\[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    const keyMatches = Array.from(
      (block![1] as string).matchAll(/key:\s*['"](\w+)['"]/g),
    ).map((m) => m[1]);
    expect(keyMatches.length).toBe(4);

    const headerKeys = [...HEADER_COUNT_CATEGORIES].sort();
    const tileKeys = [...keyMatches].sort();
    expect(headerKeys).toEqual(tileKeys);
  });
});
