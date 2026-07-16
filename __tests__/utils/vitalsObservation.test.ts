// ============================================================================
// VITALS OBSERVATION — canonical vitals-vs-history engine (STEP 1, UNIT 2).
//
// Contracts:
//   1. above / within / below the person's OWN usual.
//   2. PER-PERSON: the same reading classifies differently against different
//      histories — proves there is no fixed population cutoff.
//   3. insufficient_history below the minimum reading count.
//   4. returns the count of readings the observation is based on.
//   5. NEUTRAL: never emits a clinical verdict token (no "elevated" /
//      "abnormal" / "high" / "low" / "out of range" / severity). Reuses the
//      Gate D neutral-language contract.
// ============================================================================

import {
  observeVital,
  OBSERVATION_PHRASE,
  ObservationDirection,
} from '../../utils/vitalsObservation';

// Gate D verdict vocabulary + the population-verdict words this engine must
// never produce.
const VERDICT = /\b(out of range|outOfRange|abnormal|rangeAbnormal|elevated|high|low|normal|critical|severe)\b/i;

describe('observeVital — above / within / below the person\'s own usual', () => {
  const usualHistory = [120, 122, 118, 121, 119]; // person whose usual ≈ 120

  it('flags a reading well above the person\'s usual as above_usual', () => {
    const obs = observeVital(145, usualHistory);
    expect(obs.direction).toBe('above_usual');
  });

  it('flags a reading near the person\'s usual as within_usual', () => {
    const obs = observeVital(121, usualHistory);
    expect(obs.direction).toBe('within_usual');
  });

  it('flags a reading well below the person\'s usual as below_usual', () => {
    const obs = observeVital(95, usualHistory);
    expect(obs.direction).toBe('below_usual');
  });
});

describe('observeVital — per-person, no fixed population cutoff', () => {
  it('classifies the SAME reading differently against different histories', () => {
    // 145 is a textbook "high" systolic — but this engine has no textbook.
    const lowBaseline = observeVital(145, [118, 120, 122, 119, 121]);
    const highBaseline = observeVital(145, [143, 146, 144, 147, 145]);

    expect(lowBaseline.direction).toBe('above_usual'); // unusual for THIS person
    expect(highBaseline.direction).toBe('within_usual'); // normal for THIS person

    // The proof: identical reading, opposite classification → no shared cutoff.
    expect(lowBaseline.direction).not.toBe(highBaseline.direction);
  });

  it('a "normal" 120 reading reads as above_usual for a person who usually runs low', () => {
    const obs = observeVital(120, [98, 100, 102, 99, 101]);
    expect(obs.direction).toBe('above_usual');
  });
});

describe('observeVital — insufficient history + count', () => {
  it('returns insufficient_history below the minimum reading count', () => {
    const obs = observeVital(145, [120, 122]); // only 2 readings (< default 3)
    expect(obs.direction).toBe('insufficient_history');
    expect(obs.usual).toBeNull();
  });

  it('ignores non-finite history values when counting', () => {
    const obs = observeVital(145, [120, NaN, 122]);
    expect(obs.historyCount).toBe(2); // NaN dropped
    expect(obs.direction).toBe('insufficient_history');
  });

  it('reports the number of readings the observation is based on', () => {
    const obs = observeVital(121, [120, 122, 118, 121]);
    expect(obs.historyCount).toBe(4);
    expect(obs.usual).toBeCloseTo(120.25, 2);
  });

  it('respects a custom minHistory', () => {
    const obs = observeVital(145, [120, 122], { minHistory: 2 });
    expect(obs.direction).toBe('above_usual');
    expect(obs.historyCount).toBe(2);
  });
});

describe('observeVital — neutral language, never a verdict', () => {
  it('no phrase fragment contains a clinical verdict token', () => {
    for (const phrase of Object.values(OBSERVATION_PHRASE)) {
      expect(phrase).not.toMatch(VERDICT);
    }
  });

  it('every direction maps to a neutral "usual"-relative phrase (or a baseline note)', () => {
    const directions: ObservationDirection[] = [
      'above_usual',
      'within_usual',
      'below_usual',
      'insufficient_history',
    ];
    for (const d of directions) {
      expect(OBSERVATION_PHRASE[d]).toBeTruthy();
    }
    // The above/below fragments are framed against the person's OWN usual.
    expect(OBSERVATION_PHRASE.above_usual).toMatch(/usual/);
    expect(OBSERVATION_PHRASE.below_usual).toMatch(/usual/);
    expect(OBSERVATION_PHRASE.within_usual).toMatch(/usual/);
  });

  it('the direction union itself carries no verdict words', () => {
    const directions = ['above_usual', 'within_usual', 'below_usual', 'insufficient_history'];
    for (const d of directions) {
      expect(d).not.toMatch(VERDICT);
    }
  });
});
