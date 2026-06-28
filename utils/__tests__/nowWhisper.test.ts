// ============================================================================
// Now timeline whisper line — overdue-branch copy fix (device-walk #3).
//
// The overdue branch hardcoded "Morning done." — factually false while items
// are overdue (a trust issue in a care app), and emitted "0 still ahead" when
// nothing is pending. Corrected to bare-factual copy that reflects actual
// state and never claims a time-block is "done" while overdue > 0.
// ============================================================================

import { composeNowWhisper } from '../nowWhisper';

type S = 'done' | 'overdue' | 'pending';
const mk = (done: number, overdue: number, pending: number): { status: S }[] => [
  ...Array.from({ length: done }, () => ({ status: 'done' as S })),
  ...Array.from({ length: overdue }, () => ({ status: 'overdue' as S })),
  ...Array.from({ length: pending }, () => ({ status: 'pending' as S })),
];

describe('composeNowWhisper — overdue branch (fix #3)', () => {
  it('empty → null (no whisper)', () => {
    expect(composeNowWhisper([])).toBeNull();
  });

  it('everything done → "All done today." (the only legit "done" claim)', () => {
    expect(composeNowWhisper(mk(3, 0, 0))).toBe('All done today.');
  });

  it('reported case — done present, 7 overdue, 0 pending → "7 overdue." (no false "Morning done")', () => {
    expect(composeNowWhisper(mk(2, 7, 0))).toBe('7 overdue.');
  });

  it('overdue + pending → "N overdue, M still ahead."', () => {
    expect(composeNowWhisper(mk(0, 7, 3))).toBe('7 overdue, 3 still ahead.');
  });

  it('singular overdue, no pending → "1 overdue."', () => {
    expect(composeNowWhisper(mk(0, 1, 0))).toBe('1 overdue.');
  });

  it('singular overdue + singular pending → "1 overdue, 1 still ahead."', () => {
    expect(composeNowWhisper(mk(1, 1, 1))).toBe('1 overdue, 1 still ahead.');
  });

  it('no overdue, only pending → unchanged "thing(s) still ahead" copy', () => {
    expect(composeNowWhisper(mk(0, 0, 1))).toBe('1 thing still ahead.');
    expect(composeNowWhisper(mk(2, 0, 3))).toBe('3 things still ahead.');
  });

  // The regression guard that matters: a care app must not assert a time-block
  // is "done" while anything is overdue.
  it('NEVER claims "done" while overdue > 0 (across many states)', () => {
    for (let done = 0; done <= 4; done++) {
      for (let overdue = 1; overdue <= 9; overdue++) {
        for (let pending = 0; pending <= 4; pending++) {
          const line = composeNowWhisper(mk(done, overdue, pending));
          expect(line).not.toBeNull();
          expect(line!).not.toMatch(/done/i);
          expect(line!).not.toMatch(/morning/i);
        }
      }
    }
  });
});
