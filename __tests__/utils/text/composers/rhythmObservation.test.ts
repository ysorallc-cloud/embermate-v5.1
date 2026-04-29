// ============================================================================
// composeRhythmObservation — pattern detection + tone guard.
// ============================================================================

import {
  composeRhythmObservation,
  type RhythmCheckIn,
} from '../../../../utils/text/composers/rhythmObservation';

const ci = (date: string, weekday: number, hour: number, mood: number): RhythmCheckIn =>
  ({ date, weekday, hour, mood: mood as any });

describe('composeRhythmObservation', () => {
  it('returns null with fewer than 3 check-ins (not enough signal)', () => {
    expect(composeRhythmObservation({ checkIns: [] })).toBeNull();
    expect(
      composeRhythmObservation({
        checkIns: [ci('2026-04-26', 0, 10, 4), ci('2026-04-25', 6, 11, 3)],
      }),
    ).toBeNull();
  });

  it('detects the weekend-dominance pattern', () => {
    const checkIns = [
      ci('2026-04-25', 6, 10, 4),
      ci('2026-04-26', 0, 11, 4),
      ci('2026-04-19', 0, 9, 3),
      ci('2026-04-18', 6, 12, 5),
    ];
    expect(composeRhythmObservation({ checkIns })).toBe(
      'Weekends are when you check in most. That tracks — quiet moments help.',
    );
  });

  it('detects the late-night pattern', () => {
    const checkIns = [
      ci('2026-04-22', 3, 22, 3),
      ci('2026-04-23', 4, 23, 4),
      ci('2026-04-24', 5, 1, 3),
    ];
    expect(composeRhythmObservation({ checkIns })).toBe(
      'You’ve been checking in late at night. Not unusual; that’s often when there’s space.',
    );
  });

  it('detects breath-after-tough sequence', () => {
    const checkIns = [
      ci('2026-04-22', 3, 18, 2),
      ci('2026-04-24', 5, 19, 2),
      ci('2026-04-26', 0, 14, 4),
    ];
    const breathSessions = [
      '2026-04-22T20:00:00',
      '2026-04-24T21:30:00',
    ];
    expect(composeRhythmObservation({ checkIns, breathSessions })).toBe(
      'After a couple tough days, you tend to take a breathing break. Worth noticing.',
    );
  });

  it('returns null when no confident pattern emerges', () => {
    const checkIns = [
      ci('2026-04-22', 3, 11, 4),
      ci('2026-04-23', 4, 14, 3),
      ci('2026-04-24', 5, 16, 4),
    ];
    expect(composeRhythmObservation({ checkIns })).toBeNull();
  });

  it('observations never use coach or failure vocabulary', () => {
    const FORBIDDEN = ['great', 'wonderful', 'failed', 'missed', 'behind', 'keep it up'];
    const fixtures = [
      [ci('2026-04-25', 6, 10, 4), ci('2026-04-26', 0, 11, 4), ci('2026-04-19', 0, 9, 3), ci('2026-04-18', 6, 12, 5)],
      [ci('2026-04-22', 3, 22, 3), ci('2026-04-23', 4, 23, 4), ci('2026-04-24', 5, 1, 3)],
    ];
    for (const checkIns of fixtures) {
      const out = (composeRhythmObservation({ checkIns }) ?? '').toLowerCase();
      for (const word of FORBIDDEN) {
        expect(out).not.toMatch(new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i'));
      }
    }
  });
});
