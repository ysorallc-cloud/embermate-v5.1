// ============================================================================
// composeHandoffParagraph — coherent prose paragraph for the HandoffSheet.
// ============================================================================

import { composeHandoffParagraph } from '../../../../utils/text/composers/handoffParagraph';
import type { DailyOutcomes } from '../../../../utils/text/types';

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

const empty: DailyOutcomes = {
  logged: { count: 0 },
  missed: { count: 0, names: [] },
  pending: { count: 0, names: [] },
};

describe('composeHandoffParagraph', () => {
  it('hard day with notes ends in "Worth a quick review before handing off."', () => {
    const result = composeHandoffParagraph(
      {
        logged: { count: 4 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
      },
      'Dad seemed sleepy after lunch.',
      'Mom',
      at(22, 30),
    );
    expect(result).toBe(
      'Mom’s care today, as of 10:30 PM: Today was rough — 2 not logged (Acetaminophen and Amlodipine), 4 logged. "Dad seemed sleepy after lunch." Worth a quick review before handing off.',
    );
  });

  it('clean day with no notes drops the "worth a review" closer', () => {
    const result = composeHandoffParagraph(
      {
        logged: { count: 9, summary: '5 meds, 2 vitals, 2 meals' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
      null,
      'Mom',
      at(20, 0),
    );
    expect(result).toBe(
      'Mom’s care today, as of 8:00 PM: Today went smoothly — 5 meds, 2 vitals, 2 meals.',
    );
  });

  it('clean day with notes keeps the "worth a review" closer (notes are reason enough)', () => {
    const result = composeHandoffParagraph(
      {
        logged: { count: 9 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
      'Slept poorly. Ate well.',
      'Mom',
      at(20, 0),
    );
    expect(result).toBe(
      'Mom’s care today, as of 8:00 PM: Today went smoothly — 9 events logged. "Slept poorly. Ate well." Worth a quick review before handing off.',
    );
  });

  it('empty outcomes still reads naturally', () => {
    expect(
      composeHandoffParagraph(empty, null, 'Mom', at(20, 0)),
    ).toBe('Mom’s care today, as of 8:00 PM: Nothing logged yet today.');
  });

  // Phase 23.2 F3 — fallback consolidated to the canonical lowercase form
  // (utils/lovedOneFallback). Pre-23.2 these tests asserted the titlecase
  // string; post-23.2 the opener reads "your loved one's care today" —
  // mid-sentence register matching the lowercase reading elsewhere in
  // the app.
  it('falls back to the canonical lowercase loved-one when name is empty', () => {
    expect(
      composeHandoffParagraph(empty, null, '', at(20, 0)),
    ).toBe('your loved one’s care today, as of 8:00 PM: Nothing logged yet today.');
  });

  it('whitespace name falls back to the canonical lowercase loved-one', () => {
    expect(
      composeHandoffParagraph(empty, null, '   ', at(20, 0)),
    ).toBe('your loved one’s care today, as of 8:00 PM: Nothing logged yet today.');
  });

  it('whitespace-only notes are treated as no notes', () => {
    const result = composeHandoffParagraph(
      {
        logged: { count: 9 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
      '   ',
      'Mom',
      at(20, 0),
    );
    expect(result).toBe(
      'Mom’s care today, as of 8:00 PM: Today went smoothly — 9 events logged.',
    );
  });

  it('snapshot — hard day with notes', () => {
    expect(
      composeHandoffParagraph(
        {
          logged: { count: 4 },
          missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
          pending: { count: 0, names: [] },
        },
        'Dad seemed sleepy after lunch. Skipped the walk.',
        'Dad',
        at(22, 30),
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — clean day, no notes', () => {
    expect(
      composeHandoffParagraph(
        {
          logged: { count: 9, summary: '5 meds, 2 vitals, 2 meals' },
          missed: { count: 0, names: [] },
          pending: { count: 0, names: [] },
        },
        null,
        'Mom',
        at(20, 0),
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — pending only', () => {
    expect(
      composeHandoffParagraph(
        {
          logged: { count: 3 },
          missed: { count: 0, names: [] },
          pending: { count: 2, names: ['Evening meds', 'BP check'] },
        },
        'Slept through the afternoon.',
        'Mom',
        at(19, 0),
      ),
    ).toMatchSnapshot();
  });
});
