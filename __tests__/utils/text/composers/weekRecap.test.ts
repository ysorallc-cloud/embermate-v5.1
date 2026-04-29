// ============================================================================
// composeWeekRecap — bottom-of-timeline single-sentence recap.
// ============================================================================

import { composeWeekRecap, type WeekRecapDay } from '../../../../utils/text/composers/weekRecap';

const day = (date: string, weekday: number, mood?: number): WeekRecapDay =>
  ({ date, weekday, mood: mood as any });

describe('composeWeekRecap', () => {
  it('returns "" for an empty input', () => {
    expect(composeWeekRecap([])).toBe('');
  });

  it('all empty days → empathic acknowledgement', () => {
    const days = [
      day('2026-04-23', 4),
      day('2026-04-24', 5),
      day('2026-04-25', 6),
      day('2026-04-26', 0),
      day('2026-04-27', 1),
      day('2026-04-28', 2),
    ];
    expect(composeWeekRecap(days)).toBe(
      '6 empty days. That’s normal during stretches when you’re carrying a lot.',
    );
  });

  it('single bright spot (good day, rest empty) → names the day', () => {
    const days = [
      day('2026-04-23', 4),
      day('2026-04-24', 5, 5),
      day('2026-04-25', 6),
      day('2026-04-26', 0),
    ];
    expect(composeWeekRecap(days)).toBe('Friday felt good.');
  });

  it('single tough spot → adds "not lost" framing', () => {
    const days = [
      day('2026-04-22', 3),
      day('2026-04-23', 4, 2),
      day('2026-04-24', 5),
    ];
    expect(composeWeekRecap(days)).toBe(
      'Thursday felt tough. The other days are unmarked, not unimportant.',
    );
  });

  it('tough run (3+ in a row) → calm "noted" framing', () => {
    const days = [
      day('2026-04-22', 3, 2),
      day('2026-04-23', 4, 1),
      day('2026-04-24', 5, 2),
      day('2026-04-25', 6, 4),
    ];
    expect(composeWeekRecap(days)).toBe(
      'A few tough days in a row. They’re not lost — they’re noted.',
    );
  });

  it('weekend brighter than weekdays → "Weekend felt lighter than the week."', () => {
    const days = [
      day('2026-04-20', 1, 3),
      day('2026-04-21', 2, 3),
      day('2026-04-22', 3, 2),
      day('2026-04-23', 4, 3),
      day('2026-04-25', 6, 5),
      day('2026-04-26', 0, 4),
    ];
    expect(composeWeekRecap(days)).toBe('Weekend felt lighter than the week.');
  });

  it('mostly heavy mix → "More heavy than light this stretch."', () => {
    const days = [
      day('2026-04-20', 1, 2),
      day('2026-04-21', 2, 3),
      day('2026-04-22', 3, 2),
      day('2026-04-23', 4, 4),
    ];
    expect(composeWeekRecap(days)).toBe('More heavy than light this stretch.');
  });

  it('balanced mix → "A mix — some lighter days, some harder."', () => {
    const days = [
      day('2026-04-22', 3, 2),
      day('2026-04-23', 4, 5),
      day('2026-04-24', 5, 4),
    ];
    expect(composeWeekRecap(days)).toBe('A mix — some lighter days, some harder.');
  });

  it('does not contain coach or failure vocabulary', () => {
    const fixtures: WeekRecapDay[][] = [
      [],
      [day('2026-04-23', 4, 2), day('2026-04-24', 5, 2), day('2026-04-25', 6, 2)],
      [day('2026-04-23', 4, 5)],
      [day('2026-04-23', 4)],
    ];
    const FORBIDDEN = ['great', 'wonderful', 'amazing', 'failed', 'missed', 'behind', 'keep it up'];
    for (const fixture of fixtures) {
      const out = composeWeekRecap(fixture).toLowerCase();
      for (const word of FORBIDDEN) {
        expect(out).not.toMatch(new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i'));
      }
    }
  });
});
