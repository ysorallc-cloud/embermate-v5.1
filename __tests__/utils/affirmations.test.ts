// ============================================================================
// Affirmations library — content + tone contract.
// Locks in the v6.7 You-tab redesign Phase 1: 24 curated affirmations,
// each ≤80 chars, skewing toward acknowledgment over cheerleading.
// ============================================================================

import { existsSync } from 'fs';
import { join } from 'path';

const filePath = join(__dirname, '../../utils/affirmations.ts');

describe('Affirmations module', () => {
  it('utils/affirmations.ts exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });
});

describe('AFFIRMATIONS array — content quality', () => {
  // Lazy-import so the file-existence test above runs first cleanly.
  const { AFFIRMATIONS } = require('../../utils/affirmations');

  it('exports at least 24 affirmations', () => {
    expect(Array.isArray(AFFIRMATIONS)).toBe(true);
    expect(AFFIRMATIONS.length).toBeGreaterThanOrEqual(24);
  });

  it('every affirmation is a non-empty trimmed string', () => {
    for (const a of AFFIRMATIONS) {
      expect(typeof a).toBe('string');
      expect(a.trim().length).toBeGreaterThan(0);
      // Trim should be a no-op — no leading/trailing whitespace
      expect(a).toBe(a.trim());
    }
  });

  it('every affirmation is at most 80 characters', () => {
    for (const a of AFFIRMATIONS) {
      expect(a.length).toBeLessThanOrEqual(80);
    }
  });

  it('all affirmations are unique', () => {
    expect(new Set(AFFIRMATIONS).size).toBe(AFFIRMATIONS.length);
  });

  it('no exclamation marks (avoids cheerleading tone)', () => {
    for (const a of AFFIRMATIONS) {
      expect(a).not.toContain('!');
    }
  });

  it('no banned cheerleading phrases', () => {
    const banned = [
      /you'?ve got this/i,
      /you got this/i,
      /stay strong/i,
      /chin up/i,
    ];
    for (const a of AFFIRMATIONS) {
      for (const re of banned) {
        expect(a).not.toMatch(re);
      }
    }
  });

  it('no medical / curative claims', () => {
    const banned = [
      /you will feel better/i,
      /will heal/i,
      /will be cured/i,
    ];
    for (const a of AFFIRMATIONS) {
      for (const re of banned) {
        expect(a).not.toMatch(re);
      }
    }
  });

  it('includes the four required acknowledgment seed lines', () => {
    expect(AFFIRMATIONS).toContain("You're carrying a lot. Take a moment for yourself.");
    expect(AFFIRMATIONS).toContain('Caring for someone is real work. Rest is part of it.');
    expect(AFFIRMATIONS).toContain('Showing up is enough some days.');
    expect(AFFIRMATIONS).toContain("You don't have to be perfect to be enough.");
  });

  it('includes the four required permission seed lines', () => {
    expect(AFFIRMATIONS).toContain("It's okay to not be okay today.");
    expect(AFFIRMATIONS).toContain("You're allowed to feel however you're feeling.");
    expect(AFFIRMATIONS).toContain("Hard days don't mean you're failing.");
    expect(AFFIRMATIONS).toContain('You can ask for help.');
  });

  it('includes the four required quiet-hope seed lines', () => {
    expect(AFFIRMATIONS).toContain('Small acts of self-care add up.');
    expect(AFFIRMATIONS).toContain('Tomorrow is another chance — but right now matters too.');
    expect(AFFIRMATIONS).toContain('Every day you keep going is a kind of strength.');
    expect(AFFIRMATIONS).toContain("You're doing more than you realize.");
  });
});

// Daily rotation contract lives in __tests__/utils/dailyAffirmation.test.ts —
// the picker is its own module now so the data and the selection algorithm
// can evolve independently.
