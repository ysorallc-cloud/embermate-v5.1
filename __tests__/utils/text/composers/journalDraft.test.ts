// ============================================================================
// composeJournalDraft — multi-sentence draft for the Journal text input.
// ============================================================================

import { composeJournalDraft } from '../../../../utils/text/composers/journalDraft';
import type { DailyOutcomes, Alert } from '../../../../utils/text/types';

const at = (h: number, m = 0) => {
  const d = new Date('2026-04-29T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
};

const noAlerts: Alert[] = [];

const empty: DailyOutcomes = {
  logged: { count: 0 },
  missed: { count: 0, names: [] },
  pending: { count: 0, names: [] },
};

describe('composeJournalDraft', () => {
  it('empty outcomes → empty string (no draft to suggest)', () => {
    expect(composeJournalDraft(empty, noAlerts, at(10, 0))).toBe('');
  });

  it('hard day → outcomes summary + notable BP reading', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 4 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '148/92', time: at(10, 0), severity: 'elevated' },
        ],
      },
      noAlerts,
      at(11, 0),
    );
    expect(result).toBe(
      'Today was rough — 2 not logged (Acetaminophen and Amlodipine), 4 logged. BP at 10:00 AM was 148/92, slightly elevated. Afternoon and evening still ahead.',
    );
  });

  it('good day → only the smooth summary, no extras', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 4, summary: '3 meals, 1 morning check-in' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
      noAlerts,
      at(20, 0),
    );
    expect(result).toBe('Today went smoothly — 3 meals, 1 morning check-in.');
  });

  it('morning with pending → appends "afternoon and evening still ahead"', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 2, summary: '1 meds, 1 breakfast' },
        missed: { count: 0, names: [] },
        pending: { count: 3, names: ['Lunch', 'Afternoon meds', 'Evening meds'] },
      },
      noAlerts,
      at(9, 0),
    );
    expect(result).toBe(
      'Mostly on track — 3 still to do (Lunch, Afternoon meds, and Evening meds). Afternoon and evening still ahead.',
    );
  });

  it('afternoon with pending in evening → appends "evening still ahead"', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 4 },
        missed: { count: 0, names: [] },
        pending: { count: 1, names: ['Evening meds'] },
      },
      noAlerts,
      at(14, 0),
    );
    expect(result).toBe('Mostly on track — 1 still to do (Evening meds). Evening still ahead.');
  });

  it('omits notable when severity is normal', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 4 },
        missed: { count: 1, names: ['Amlodipine'] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '120/80', time: at(10, 0), severity: 'normal' },
        ],
      },
      noAlerts,
      at(11, 0),
    );
    // Normal readings aren't notable; don't fabricate. Morning still adds
    // the "ahead" closing.
    expect(result).toBe('Today was rough — 1 not logged (Amlodipine), 4 logged. Afternoon and evening still ahead.');
  });

  it('omits notable sentence when multiple readings (ambiguous which to mention)', () => {
    // Stop condition: if no clear standout, default to omitting BP. Better
    // silent than wrong.
    const result = composeJournalDraft(
      {
        logged: { count: 4 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '148/92', time: at(10, 0), severity: 'elevated' },
          { type: 'BP', reading: '152/95', time: at(15, 0), severity: 'high' },
        ],
      },
      noAlerts,
      at(16, 0),
    );
    expect(result).toBe('Today went smoothly — 4 events logged.');
  });

  it('a single notable HR reading uses the same template ("HR at TIME was VALUE")', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 1 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'HR', reading: '102 bpm', time: at(15, 30), severity: 'elevated' },
        ],
      },
      noAlerts,
      at(16, 0),
    );
    expect(result).toBe(
      'Today went smoothly — 1 event logged. HR at 3:30 PM was 102 bpm, slightly elevated.',
    );
  });

  it('high severity uses "high" not "slightly elevated"', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 1 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'BP', reading: '170/100', time: at(15, 0), severity: 'high' },
        ],
      },
      noAlerts,
      at(16, 0),
    );
    expect(result).toBe('Today went smoothly — 1 event logged. BP at 3:00 PM was 170/100, high.');
  });

  it('low severity uses "low"', () => {
    const result = composeJournalDraft(
      {
        logged: { count: 1 },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
        notable: [
          { type: 'Glucose', reading: '62 mg/dL', time: at(8, 30), severity: 'low' },
        ],
      },
      noAlerts,
      at(9, 0),
    );
    expect(result).toBe('Today went smoothly — 1 event logged. Glucose at 8:30 AM was 62 mg/dL, low. Afternoon and evening still ahead.');
  });

  it('snapshot — morning only with pending afternoon', () => {
    expect(
      composeJournalDraft(
        {
          logged: { count: 2, summary: 'meds, breakfast' },
          missed: { count: 0, names: [] },
          pending: { count: 2, names: ['Lunch', 'Afternoon meds'] },
        },
        noAlerts,
        at(10, 0),
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — hard day with elevated BP', () => {
    expect(
      composeJournalDraft(
        {
          logged: { count: 4 },
          missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
          pending: { count: 0, names: [] },
          notable: [
            { type: 'BP', reading: '148/92', time: at(10, 0), severity: 'elevated' },
          ],
        },
        noAlerts,
        at(11, 0),
      ),
    ).toMatchSnapshot();
  });

  it('snapshot — empty day returns ""', () => {
    expect(composeJournalDraft(empty, noAlerts, at(10, 0))).toMatchSnapshot();
  });
});
