// ============================================================================
// Phase 5.8.b — selectNotesForVisitPrep
//
// Selects up to 3 notes from a date-range window. Priority order:
//   1. Notes containing flag keywords (utils/keywordFlags.ts) — up to 3
//   2. If fewer than 3 from step 1, fill from oldest / midpoint / newest
//      of the remaining notes
// Render full text (no truncation), each note dated.
// ============================================================================

import { selectNotesForVisitPrep } from '../../utils/visitPrepNoteCuration';

type Note = { date: string; text: string };

describe('Phase 5.8.b — selectNotesForVisitPrep', () => {
  it('returns all notes when fewer than the maximum exist (no fabrication)', () => {
    const notes: Note[] = [
      { date: '2026-04-20', text: 'Steady morning.' },
    ];
    const out = selectNotesForVisitPrep(notes, 3);
    expect(out.length).toBe(1);
    expect(out[0].text).toBe('Steady morning.');
    expect(out[0].date).toBe('2026-04-20');
  });

  it('renders full text (no truncation, no slice-100)', () => {
    const long = 'A'.repeat(280);
    const out = selectNotesForVisitPrep([{ date: '2026-04-20', text: long }], 3);
    expect(out[0].text).toBe(long);
    expect(out[0].text.length).toBe(280);
  });

  it('keyword-flagged notes win over non-flagged when the cap binds', () => {
    const notes: Note[] = [
      { date: '2026-04-19', text: 'Quiet day.' },
      { date: '2026-04-20', text: 'Quiet day.' },
      { date: '2026-04-21', text: "Mom said today felt hard." },
      { date: '2026-04-22', text: 'Quiet day.' },
      { date: '2026-04-23', text: 'Refused her morning meds twice.' },
      { date: '2026-04-24', text: 'Quiet day.' },
    ];
    const out = selectNotesForVisitPrep(notes, 3);
    expect(out.length).toBe(3);
    const flaggedTexts = out.map((n) => n.text);
    expect(flaggedTexts).toContain("Mom said today felt hard.");
    expect(flaggedTexts).toContain('Refused her morning meds twice.');
  });

  it('caps at 3 even when 4+ flagged notes exist; keeps oldest 3', () => {
    const notes: Note[] = [
      { date: '2026-04-19', text: 'Hard morning.' },
      { date: '2026-04-21', text: 'She refused dinner.' },
      { date: '2026-04-23', text: 'Worried about the cough.' },
      { date: '2026-04-25', text: 'Fell stepping out of the tub.' },
    ];
    const out = selectNotesForVisitPrep(notes, 3);
    expect(out.length).toBe(3);
    // Order is chronological for the rendered output.
    expect(out.map((n) => n.date)).toEqual([
      '2026-04-19', '2026-04-21', '2026-04-23',
    ]);
  });

  it('fills empty slots with oldest/midpoint/newest when flagged notes are scarce', () => {
    const notes: Note[] = [
      { date: '2026-04-19', text: 'Quiet day.' },                  // oldest
      { date: '2026-04-21', text: 'Quiet day.' },
      { date: '2026-04-23', text: 'Hard morning.' },               // flagged
      { date: '2026-04-25', text: 'Quiet day.' },                  // midpoint
      { date: '2026-04-27', text: 'Quiet day.' },                  // newest
    ];
    const out = selectNotesForVisitPrep(notes, 3);
    // Expect 1 flagged + 2 from oldest/midpoint/newest fill.
    expect(out.length).toBe(3);
    const dates = out.map((n) => n.date);
    expect(dates).toContain('2026-04-23');
    // Plus two of the time-based fills (oldest, midpoint, newest from the
    // non-flagged remainder).
    const fills = dates.filter((d) => d !== '2026-04-23');
    expect(fills.length).toBe(2);
    // Output is chronological.
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('handles empty input gracefully', () => {
    expect(selectNotesForVisitPrep([], 3)).toEqual([]);
  });

  it('does not return duplicate notes if the same note matches both passes', () => {
    const notes: Note[] = [
      { date: '2026-04-20', text: 'Hard.' },                 // flagged
      { date: '2026-04-21', text: 'Quiet.' },
    ];
    const out = selectNotesForVisitPrep(notes, 3);
    expect(out.length).toBe(2);
    const dates = out.map((n) => n.date);
    expect(new Set(dates).size).toBe(2);
  });

  it('flag-keyword detection is word-bounded (no false positives on substrings)', () => {
    const notes: Note[] = [
      { date: '2026-04-19', text: 'Made hardware repairs in the kitchen.' },
      { date: '2026-04-20', text: 'Quiet day.' },
      { date: '2026-04-21', text: 'Worried about her balance.' },
    ];
    const out = selectNotesForVisitPrep(notes, 1);
    // Only the second note ("Worried…") should be flagged. "Hardware"
    // contains "hard" as a substring but should NOT match.
    expect(out.length).toBe(1);
    expect(out[0].text).toContain('Worried');
  });
});
