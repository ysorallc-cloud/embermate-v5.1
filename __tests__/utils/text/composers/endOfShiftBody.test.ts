// ============================================================================
// composeEndOfShiftBody — body text for the End of Shift card.
// ============================================================================

import { composeEndOfShiftBody } from '../../../../utils/text/composers/endOfShiftBody';
import type { DailyOutcomes, Alert } from '../../../../utils/text/types';

const noAlerts: Alert[] = [];

const empty: DailyOutcomes = {
  logged: { count: 0 },
  missed: { count: 0, names: [] },
  pending: { count: 0, names: [] },
};

describe('composeEndOfShiftBody', () => {
  it('clean day → "N items logged. Review before handing off."', () => {
    expect(
      composeEndOfShiftBody(
        { logged: { count: 9 }, missed: { count: 0, names: [] }, pending: { count: 0, names: [] } },
        noAlerts,
      ),
    ).toBe('9 items logged. Review before handing off.');
  });

  it('day with misses → "N items logged, M missed doses, …. Review before handing off."', () => {
    const result = composeEndOfShiftBody(
      {
        logged: { count: 7 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '152/96', time: new Date('2026-04-29T10:00:00'), severity: 'high' },
        ],
      },
      noAlerts,
    );
    expect(result).toBe(
      '7 items logged, 2 not logged, 1 BP reading was high. Review before handing off.',
    );
  });

  it('day with pending → "N items logged, M still to do. Review before handing off."', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 6 },
          missed: { count: 0, names: [] },
          pending: { count: 2, names: ['Evening meds', 'BP check'] },
        },
        noAlerts,
      ),
    ).toBe('6 items logged, 2 still to do. Review before handing off.');
  });

  it('day with both pending and missed → both clauses listed', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 5 },
          missed: { count: 1, names: ['Lisinopril'] },
          pending: { count: 1, names: ['Evening meds'] },
        },
        noAlerts,
      ),
    ).toBe('5 items logged, 1 not logged, 1 still to do. Review before handing off.');
  });

  it('elevated reading is reported as "elevated" not "high"', () => {
    const result = composeEndOfShiftBody(
      {
        logged: { count: 8 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '142/88', time: new Date('2026-04-29T10:00:00'), severity: 'elevated' },
        ],
      },
      noAlerts,
    );
    expect(result).toBe('8 items logged, 1 BP reading was elevated. Review before handing off.');
  });

  it('zero logged with nothing else → "0 items logged. Review before handing off."', () => {
    expect(composeEndOfShiftBody(empty, noAlerts)).toBe('0 items logged. Review before handing off.');
  });

  it('singular pluralization on logged count', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 1 },
          missed: { count: 0, names: [] },
          pending: { count: 0, names: [] },
        },
        noAlerts,
      ),
    ).toBe('1 item logged. Review before handing off.');
  });

  it('singular pluralization on missed dose', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 5 },
          missed: { count: 1, names: ['Amlodipine'] },
          pending: { count: 0, names: [] },
        },
        noAlerts,
      ),
    ).toBe('5 items logged, 1 not logged. Review before handing off.');
  });

  it('snapshot — clean day', () => {
    expect(
      composeEndOfShiftBody(
        { logged: { count: 9 }, missed: { count: 0, names: [] }, pending: { count: 0, names: [] } },
        noAlerts,
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — day with misses + high BP', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 7 },
          missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
          pending: { count: 0, names: [] },
          notable: [
            { type: 'BP', reading: '152/96', time: new Date('2026-04-29T10:00:00'), severity: 'high' },
          ],
        },
        noAlerts,
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — day with pending', () => {
    expect(
      composeEndOfShiftBody(
        {
          logged: { count: 6 },
          missed: { count: 0, names: [] },
          pending: { count: 2, names: ['Evening meds', 'BP check'] },
        },
        noAlerts,
      ),
    ).toMatchSnapshot();
  });
});
