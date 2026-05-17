// ============================================================================
// composeWellnessOpening — branch coverage + tone guard.
//
// Phase 29 Batch C F6 (Path B, Option B collapse) retired the five
// evaluative branches in this composer and collapsed the count-fork.
// Test branch count drops from 10 → 7 (six output strings + the 14d
// range-label variant, which exercises the same composer entry point
// but pins the RANGE_LABEL routing).
//
// Forbidden-vocab guard extended with the retired phrase fragments so
// future drift back to praise framing fails loudly.
// ============================================================================

import {
  composeWellnessOpening,
  type MoodLevel,
} from '../../../../utils/text/composers/wellnessOpening';

const moods = (...vals: number[]): MoodLevel[] => vals as MoodLevel[];

describe('composeWellnessOpening — branches (Phase 29 Batch C F6 Path B)', () => {
  it('first-time user → welcome line (invitational, unchanged)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 7, isFirstTimeUser: true }),
    ).toBe('Welcome to your wellness space. Your first check-in is whenever you’re ready.');
  });

  it('0 check-ins (this week) → permission to skip (observational + invitational, unchanged)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 7 }),
    ).toBe('You haven’t checked in this week. That’s okay — you’re allowed to skip.');
  });

  it('0 check-ins, 14d range → "these two weeks" (range-label routing preserved)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 0, moodValues: [], daysOfData: 14 }),
    ).toContain('these two weeks');
  });

  it('1 check-in → "You checked in once {range}." (observational; "That counts" praise retired)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 1, moodValues: moods(3), daysOfData: 7 }),
    ).toBe('You checked in once this week.');
  });

  it('count ≥ 2, all-tough → "It’s been a stretch." (observational; "that’s clear" verdict retired)', () => {
    // Same copy regardless of count tier post-Option B collapse.
    expect(
      composeWellnessOpening({ checkInsCount: 2, moodValues: moods(2, 3), daysOfData: 7 }),
    ).toBe('You checked in 2 times this week. It’s been a stretch.');
    expect(
      composeWellnessOpening({ checkInsCount: 5, moodValues: moods(2, 3, 2, 3, 1), daysOfData: 7 }),
    ).toBe('You checked in 5 times this week. It’s been a stretch.');
  });

  it('count ≥ 2, all-okay → "Steady." (observational; "lighter stretch" comparative retired)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 2, moodValues: moods(4, 5), daysOfData: 7 }),
    ).toBe('You checked in 2 times this week. Steady.');
    expect(
      composeWellnessOpening({ checkInsCount: 5, moodValues: moods(4, 4, 5, 5, 4), daysOfData: 7 }),
    ).toBe('You checked in 5 times this week. Steady.');
  });

  it('count ≥ 2, mixed → "Some harder days, some lighter." (observational, unchanged)', () => {
    expect(
      composeWellnessOpening({ checkInsCount: 3, moodValues: moods(2, 4, 5), daysOfData: 7 }),
    ).toBe('You checked in 3 times this week. Some harder days, some lighter.');
    expect(
      composeWellnessOpening({ checkInsCount: 7, moodValues: moods(2, 3, 4, 5, 2, 4, 3), daysOfData: 7 }),
    ).toBe('You checked in 7 times this week. Some harder days, some lighter.');
  });

  it('count ≥ 2, unknown mix → bare observational form (no "A glimpse" / "showing up" praise frames)', () => {
    // moodValues empty — composer can't characterize the data, so it
    // names the action only. Same copy regardless of count tier.
    expect(
      composeWellnessOpening({ checkInsCount: 2, moodValues: [], daysOfData: 7 }),
    ).toBe('You checked in 2 times this week.');
    expect(
      composeWellnessOpening({ checkInsCount: 5, moodValues: [], daysOfData: 7 }),
    ).toBe('You checked in 5 times this week.');
  });
});

describe('composeWellnessOpening — tone guard (Phase 29 Batch C F6 extended)', () => {
  const FORBIDDEN = [
    // Original v6.7 reframe vocabulary — generic coach / failure /
    // diagnostic frames.
    'great', 'wonderful', 'amazing', 'failed', 'missed', 'behind',
    'fantastic', 'excellent', 'keep it up', 'stay strong',
    // Phase 29 Batch C F6 — praise-frame fragments retired by Path B.
    // These guard against re-introduction of the evaluative branches.
    'that counts', 'showing up', 'lighter stretch', 'enough to reflect',
    'for yourself',
  ];

  const fixtures: Array<Parameters<typeof composeWellnessOpening>[0]> = [
    { checkInsCount: 0, moodValues: [], daysOfData: 7 },
    { checkInsCount: 1, moodValues: moods(3), daysOfData: 7 },
    { checkInsCount: 2, moodValues: moods(2, 3), daysOfData: 7 },
    { checkInsCount: 3, moodValues: moods(4, 5, 4), daysOfData: 7 },
    { checkInsCount: 5, moodValues: moods(1, 2, 3, 4, 5), daysOfData: 7 },
    { checkInsCount: 5, moodValues: [], daysOfData: 7 },
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
