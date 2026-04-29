// ============================================================================
// composeOutcomesSummary — one-line summary of the day's outcomes.
// ============================================================================

import { composeOutcomesSummary } from '../../../../utils/text/composers/outcomesSummary';
import type { DailyOutcomes } from '../../../../utils/text/types';

const empty: DailyOutcomes = {
  logged: { count: 0 },
  missed: { count: 0, names: [] },
  pending: { count: 0, names: [] },
};

describe('composeOutcomesSummary', () => {
  it('all zero → "Nothing logged yet today."', () => {
    expect(composeOutcomesSummary(empty)).toBe('Nothing logged yet today.');
  });

  it('only logged events → "Today went smoothly — <summary>."', () => {
    const result = composeOutcomesSummary({
      logged: { count: 4, summary: '3 meals, 1 morning check-in' },
      missed: { count: 0, names: [] },
      pending: { count: 0, names: [] },
    });
    expect(result).toBe('Today went smoothly — 3 meals, 1 morning check-in.');
  });

  it('only logged with no summary → falls back to event count', () => {
    expect(
      composeOutcomesSummary({
        logged: { count: 4 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      }),
    ).toBe('Today went smoothly — 4 events logged.');
  });

  it('only logged with categories but no summary → builds summary from categories', () => {
    expect(
      composeOutcomesSummary({
        logged: {
          count: 4,
          categories: [
            { label: 'meals', count: 3 },
            { label: 'morning check-in', count: 1 },
          ],
        },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      }),
    ).toBe('Today went smoothly — 3 meals and 1 morning check-in.');
  });

  it('some misses → "Today was rough — N missed (names), N logged."', () => {
    const result = composeOutcomesSummary({
      logged: { count: 4 },
      missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
      pending: { count: 0, names: [] },
    });
    expect(result).toBe('Today was rough — 2 not logged (Acetaminophen and Amlodipine), 4 logged.');
  });

  it('three misses uses Oxford comma in the names list', () => {
    const result = composeOutcomesSummary({
      logged: { count: 4 },
      missed: { count: 3, names: ['Acetaminophen', 'Amlodipine', 'Lisinopril'] },
      pending: { count: 0, names: [] },
    });
    expect(result).toBe(
      'Today was rough — 3 not logged (Acetaminophen, Amlodipine, and Lisinopril), 4 logged.',
    );
  });

  it('only pending → "Mostly on track — N still to do (names)."', () => {
    const result = composeOutcomesSummary({
      logged: { count: 3 },
      missed: { count: 0, names: [] },
      pending: { count: 2, names: ['Evening meds', 'Vitals'] },
    });
    expect(result).toBe('Mostly on track — 2 still to do (Evening meds and Vitals).');
  });

  it('mixed (missed + pending + logged) → missed first, pending next, logged last', () => {
    const result = composeOutcomesSummary({
      logged: { count: 4 },
      missed: { count: 1, names: ['Amlodipine'] },
      pending: { count: 2, names: ['Evening meds', 'BP check'] },
    });
    expect(result).toBe(
      'Today was rough — 1 not logged (Amlodipine), 2 still to do (Evening meds and BP check), 4 logged.',
    );
  });

  it('handles plural / singular pluralization on the 1-missed case', () => {
    const result = composeOutcomesSummary({
      logged: { count: 1 },
      missed: { count: 1, names: ['Amlodipine'] },
      pending: { count: 0, names: [] },
    });
    expect(result).toBe('Today was rough — 1 not logged (Amlodipine), 1 logged.');
  });

  it('snapshot — hard day', () => {
    expect(
      composeOutcomesSummary({
        logged: { count: 4 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
      }),
    ).toMatchSnapshot();
  });

  it('snapshot — clean day', () => {
    expect(
      composeOutcomesSummary({
        logged: { count: 9, summary: '5 meds, 2 vitals, 2 meals' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      }),
    ).toMatchSnapshot();
  });

  it('snapshot — empty', () => {
    expect(composeOutcomesSummary(empty)).toMatchSnapshot();
  });
});
