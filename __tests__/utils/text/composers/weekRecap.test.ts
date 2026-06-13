// ============================================================================
// composeWeekRecap — F7 C6b 3-bucket contract.
//
// F7 (2026-06-12) collapsed the pre-F7 7-branch recap library (weekend
// pattern, tough run, single bright spot, balanced mix, etc.) into 3
// warm outcomes:
//   All positive   → "A good week."
//   Mostly low     → "A hard week. That's allowed."
//   Mixed          → "A rougher [day/stretch]. You still showed up."
// Empty-days fallback is preserved.
// ============================================================================

import { composeWeekRecap, type WeekRecapDay } from '../../../../utils/text/composers/weekRecap';

const day = (date: string, weekday: number, mood?: number): WeekRecapDay =>
  ({ date, weekday, mood: mood as any });

describe('composeWeekRecap — F7 C6b 3-bucket voice', () => {
  it('returns "" for an empty input', () => {
    expect(composeWeekRecap([])).toBe('');
  });

  it('all empty days → empathic acknowledgement (preserved from pre-F7)', () => {
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

  it('all positive (every filled day is good or okay) → "A good week."', () => {
    const days = [
      day('2026-04-23', 4, 5),
      day('2026-04-24', 5, 4),
      day('2026-04-25', 6, 5),
    ];
    expect(composeWeekRecap(days)).toBe('A good week.');
  });

  it('mostly low (toughCount ≥ half) → "A hard week. That\'s allowed."', () => {
    const days = [
      day('2026-04-20', 1, 2),
      day('2026-04-21', 2, 3),
      day('2026-04-22', 3, 2),
      day('2026-04-23', 4, 4),
    ];
    expect(composeWeekRecap(days)).toBe("A hard week. That’s allowed.");
  });

  it('mixed multi-day → "A rougher stretch. You still showed up."', () => {
    const days = [
      day('2026-04-22', 3, 3),
      day('2026-04-23', 4, 5),
      day('2026-04-24', 5, 4),
    ];
    expect(composeWeekRecap(days)).toBe('A rougher stretch. You still showed up.');
  });

  it('mixed single-day → "A rougher day. You still showed up."', () => {
    // Single filled day that doesn't qualify as positive (getting-by,
    // mood 3) falls into the mixed bucket with "day" instead of
    // "stretch".
    const days = [
      day('2026-04-22', 3, 3),
      day('2026-04-23', 4),
      day('2026-04-24', 5),
    ];
    expect(composeWeekRecap(days)).toBe('A rougher day. You still showed up.');
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
