// ============================================================================
// dailyAffirmation — deterministic daily picker.
// Locks in the v6.7 You-tab redesign Phase 1 helper: hash YYYY-MM-DD by
// summing char codes, then mod into AFFIRMATIONS.length.
// ============================================================================

import { existsSync } from 'fs';
import { join } from 'path';

const filePath = join(__dirname, '../../utils/dailyAffirmation.ts');

describe('dailyAffirmation module', () => {
  it('utils/dailyAffirmation.ts exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });
});

describe('getDailyAffirmation — hash-based daily selection', () => {
  const { getDailyAffirmation } = require('../../utils/dailyAffirmation');
  const { AFFIRMATIONS } = require('../../utils/affirmations');

  // Reference implementation: sum the char codes of YYYY-MM-DD, mod the
  // affirmation list length. This mirrors the hash the production helper
  // is required to use.
  function expectedIndex(d: Date): number {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    let sum = 0;
    for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return sum % AFFIRMATIONS.length;
  }

  it('returns a string from the AFFIRMATIONS list', () => {
    const a = getDailyAffirmation(new Date('2026-04-27T12:00:00'));
    expect(typeof a).toBe('string');
    expect(AFFIRMATIONS).toContain(a);
  });

  it('matches the char-sum-mod-length hash for a known date', () => {
    const d = new Date('2026-04-27T12:00:00');
    const idx = expectedIndex(d);
    expect(getDailyAffirmation(d)).toBe(AFFIRMATIONS[idx]);
  });

  it('matches the hash across a sample of distinct dates', () => {
    const dates = [
      new Date('2026-01-01T08:00:00'),
      new Date('2026-04-27T08:00:00'),
      new Date('2026-07-04T08:00:00'),
      new Date('2026-12-31T08:00:00'),
      new Date('2027-02-14T08:00:00'),
    ];
    for (const d of dates) {
      expect(getDailyAffirmation(d)).toBe(AFFIRMATIONS[expectedIndex(d)]);
    }
  });

  it('is idempotent across the same calendar day (time of day does not matter)', () => {
    const morning = new Date('2026-04-27T07:00:00');
    const evening = new Date('2026-04-27T22:30:00');
    expect(getDailyAffirmation(morning)).toBe(getDailyAffirmation(evening));
  });

  it('rotates across consecutive days (consecutive YYYY-MM-DD strings differ)', () => {
    const day1 = new Date('2026-04-27T12:00:00');
    const day2 = new Date('2026-04-28T12:00:00');
    expect(getDailyAffirmation(day1)).not.toBe(getDailyAffirmation(day2));
  });

  it('returns 7 distinct affirmations across 7 consecutive days (mid-month window)', () => {
    // Mid-month start avoids the DD '09'→'10' carry and the end-of-month
    // boundary, both of which can create a -8 / -1 step in the char-sum
    // hash. With a +1 step on each day in this window, 7 consecutive picks
    // map to 7 distinct mod-24 indices.
    const start = new Date('2026-04-12T12:00:00');
    const seen = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      seen.add(getDailyAffirmation(d));
    }
    expect(seen.size).toBe(7);
  });

  it('returns a non-empty string for any valid date', () => {
    // Sample a year of dates and verify each result is a non-empty string.
    const start = new Date('2026-01-01T12:00:00');
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const a = getDailyAffirmation(d);
      expect(typeof a).toBe('string');
      expect(a.length).toBeGreaterThan(0);
    }
  });

  it("default argument resolves to today's affirmation", () => {
    const now = new Date();
    expect(getDailyAffirmation()).toBe(getDailyAffirmation(now));
  });

  it('output index always falls within [0, AFFIRMATIONS.length)', () => {
    // Walk a year of dates; every produced affirmation must be in the list.
    const start = new Date('2026-01-01T12:00:00');
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const a = getDailyAffirmation(d);
      expect(AFFIRMATIONS).toContain(a);
    }
  });
});
