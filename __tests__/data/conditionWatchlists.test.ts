// ============================================================================
// conditionWatchlists — bundled library of "things to watch for" per chronic
// condition. Verifies completeness (8+ conditions, 3-4 items each), severity
// floor (all tags 'watch' until clinical review), and lookup by free-text
// condition string.
// ============================================================================

import {
  CONDITION_WATCHLISTS,
  getWatchlistForCondition,
  CUSTOM_CONDITION_FALLBACK,
} from '../../data/conditionWatchlists';

describe('CONDITION_WATCHLISTS — library shape', () => {
  it('covers at least 8 conditions', () => {
    expect(CONDITION_WATCHLISTS.length).toBeGreaterThanOrEqual(8);
  });

  it('every condition has 3-4 watch items', () => {
    for (const w of CONDITION_WATCHLISTS) {
      expect(w.watchFor.length).toBeGreaterThanOrEqual(3);
      expect(w.watchFor.length).toBeLessThanOrEqual(4);
    }
  });

  it('every watch item has symptom + whyItMatters + severity', () => {
    for (const w of CONDITION_WATCHLISTS) {
      for (const item of w.watchFor) {
        expect(typeof item.symptom).toBe('string');
        expect(item.symptom.length).toBeGreaterThan(0);
        expect(typeof item.whyItMatters).toBe('string');
        expect(item.whyItMatters.length).toBeGreaterThan(0);
        expect(['urgent', 'concerning', 'watch']).toContain(item.severity);
      }
    }
  });

  it('every condition has a unique conditionId', () => {
    const ids = CONDITION_WATCHLISTS.map((w) => w.conditionId);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });
});

describe('CONDITION_WATCHLISTS — severity floor (no clinical review yet)', () => {
  it('all severity tags ship as "watch" until clinical review per Phase 1 stop condition', () => {
    for (const w of CONDITION_WATCHLISTS) {
      for (const item of w.watchFor) {
        expect(item.severity).toBe('watch');
      }
    }
  });
});

describe('getWatchlistForCondition — lookup', () => {
  it('matches known conditions case-insensitively', () => {
    const result = getWatchlistForCondition('Hypertension');
    expect(result).not.toBeNull();
    expect(result!.conditionId).toBe('hypertension');
  });

  it('matches common aliases (e.g. "high blood pressure" → hypertension)', () => {
    const result = getWatchlistForCondition('high blood pressure');
    expect(result).not.toBeNull();
    expect(result!.conditionId).toBe('hypertension');
  });

  it('matches "type 2 diabetes" and variations', () => {
    expect(getWatchlistForCondition('type 2 diabetes')?.conditionId).toBe('type_2_diabetes');
    expect(getWatchlistForCondition('Type II Diabetes')?.conditionId).toBe('type_2_diabetes');
    expect(getWatchlistForCondition('diabetes type 2')?.conditionId).toBe('type_2_diabetes');
  });

  it('returns null for unknown / custom conditions', () => {
    const result = getWatchlistForCondition('mystery diagnosis');
    expect(result).toBeNull();
  });

  it('trims whitespace before matching', () => {
    const result = getWatchlistForCondition('  COPD  ');
    expect(result).not.toBeNull();
  });
});

describe('CUSTOM_CONDITION_FALLBACK', () => {
  it('exposes the fallback message for conditions outside the library', () => {
    expect(typeof CUSTOM_CONDITION_FALLBACK).toBe('string');
    expect(CUSTOM_CONDITION_FALLBACK.toLowerCase()).toContain('healthcare provider');
  });
});

describe('CONDITION_WATCHLISTS — covers the named-top conditions', () => {
  // Phase 1: "hypertension, type 2 diabetes, dementia, congestive heart failure,
  // COPD, depression, anxiety, arthritis, parkinson's, stroke recovery."
  const required = [
    'hypertension',
    'type_2_diabetes',
    'dementia',
    'congestive_heart_failure',
    'copd',
    'depression',
    'anxiety',
    'arthritis',
    'parkinsons',
    'stroke_recovery',
  ];

  for (const id of required) {
    it(`includes "${id}"`, () => {
      const found = CONDITION_WATCHLISTS.find((w) => w.conditionId === id);
      expect(found).toBeDefined();
    });
  }
});
