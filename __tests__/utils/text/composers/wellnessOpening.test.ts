// ============================================================================
// composeWellnessOpening — branch coverage + tone guard.
// ============================================================================

import {
  composeWellnessOpening,
  type MoodLevel,
} from '../../../../utils/text/composers/wellnessOpening';

const moods = (...vals: number[]): MoodLevel[] => vals as MoodLevel[];

describe('composeWellnessOpening — branches', () => {
  it('first-time user → welcome line', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 7, isFirstTimeUser: true }),
    ).toBe('Welcome to your wellness space. Your first check-in is whenever you’re ready.');
  });

  it('0 check-ins (this week) → permission to skip', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 7 }),
    ).toBe('You haven’t checked in this week. That’s okay — you’re allowed to skip.');
  });

  it('0 check-ins, 14d range → "these two weeks"', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 14 }),
    ).toContain('these two weeks');
  });

  it('1 check-in → "You checked in once. That counts."', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 1, moodValues: moods(3), daysOfData: 7 }),
    ).toBe('You checked in once. That counts.');
  });

  it('2-3 check-ins, mixed mood → some harder some lighter', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 3, moodValues: moods(2, 4, 5), daysOfData: 7 }),
    ).toBe('You checked in 3 times. Some harder days, some lighter.');
  });

  it('2-3 check-ins, all-tough → "stretch — that’s clear."', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 2, moodValues: moods(2, 3), daysOfData: 7 }),
    ).toBe('You checked in 2 times. It’s been a stretch — that’s clear.');
  });

  it('2-3 check-ins, all-okay → "lighter stretch."', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 2, moodValues: moods(4, 5), daysOfData: 7 }),
    ).toBe('You checked in 2 times. Looks like a lighter stretch.');
  });

  it('4+ check-ins, all-tough → stretch (long form)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 5, moodValues: moods(2, 3, 2, 3, 1), daysOfData: 7 }),
    ).toBe('You checked in 5 times. It’s been a stretch — that’s clear.');
  });

  it('4+ check-ins, all-okay → lighter stretch (long form)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 5, moodValues: moods(4, 4, 5, 5, 4), daysOfData: 7 }),
    ).toBe('You checked in 5 times. Looks like a lighter stretch.');
  });

  it('4+ check-ins, mixed → "Some harder days, some lighter."', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 7, moodValues: moods(2, 3, 4, 5, 2, 4, 3), daysOfData: 7 }),
    ).toBe('You checked in 7 times. Some harder days, some lighter.');
  });
});

describe('composeWellnessOpening — tone guard', () => {
  const FORBIDDEN = [
    'great', 'wonderful', 'amazing', 'failed', 'missed', 'behind',
    'fantastic', 'excellent', 'keep it up', 'stay strong',
  ];

  const fixtures: Array<Parameters<typeof composeWellnessOpening>[0]> = [
    { checkInsCount: 0, moodValues: [], daysOfData: 7 },
    { checkInsCount: 1, moodValues: moods(3), daysOfData: 7 },
    { checkInsCount: 2, moodValues: moods(2, 3), daysOfData: 7 },
    { checkInsCount: 3, moodValues: moods(4, 5, 4), daysOfData: 7 },
    { checkInsCount: 5, moodValues: moods(1, 2, 3, 4, 5), daysOfData: 7 },
    { checkInsCount: 0, moodValues: [], daysOfData: 7, isFirstTimeUser: true },
  ];

  it.each(FORBIDDEN)('no opening contains the forbidden phrase "%s"', (word) => {
    for (const f of fixtures) {
      expect(composeWellnessOpening(f).toLowerCase()).not.toMatch(
        new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i'),
      );
    }
  });
});
