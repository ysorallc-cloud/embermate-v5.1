// ============================================================================
// composeWellnessOpening
//
// First-line reflection on the Your Wellness page. Friend-tone — never
// coach, never doctor. Branches by check-in count + mood mix.
// ============================================================================

import { pluralize } from '../primitives';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface WellnessOpeningInput {
  /** Total check-ins in the selected range. */
  checkInsCount: number;
  /** Mood values (1-5) for the check-ins, in any order. */
  moodValues: MoodLevel[];
  /** Days of data the page is showing (7 / 14 / 30). */
  daysOfData: number;
  /** True iff the user has *zero* lifetime check-ins. */
  isFirstTimeUser?: boolean;
}

const RANGE_LABEL: Record<number, string> = {
  7: 'this week',
  14: 'these two weeks',
  30: 'this month',
};

function rangeLabel(days: number): string {
  return RANGE_LABEL[days] ?? `the last ${days} days`;
}

function classifyMix(moodValues: MoodLevel[]): 'all-tough' | 'all-okay' | 'mixed' | 'unknown' {
  if (moodValues.length === 0) return 'unknown';
  const tough = moodValues.filter((v) => v <= 3).length;
  const okay = moodValues.filter((v) => v >= 4).length;
  if (tough > 0 && okay === 0) return 'all-tough';
  if (okay > 0 && tough === 0) return 'all-okay';
  return 'mixed';
}

export function composeWellnessOpening(input: WellnessOpeningInput): string {
  const { checkInsCount, moodValues, daysOfData, isFirstTimeUser } = input;

  if (isFirstTimeUser) {
    return 'Welcome to your wellness space. Your first check-in is whenever you’re ready.';
  }

  const range = rangeLabel(daysOfData);

  if (checkInsCount === 0) {
    return `You haven’t checked in ${range}. That’s okay — you’re allowed to skip.`;
  }

  if (checkInsCount === 1) {
    return 'You checked in once. That counts.';
  }

  const mix = classifyMix(moodValues);

  if (checkInsCount >= 4) {
    if (mix === 'all-tough') {
      return `You checked in ${pluralize(checkInsCount, 'time')}. It’s been a stretch — that’s clear.`;
    }
    if (mix === 'all-okay') {
      return `You checked in ${pluralize(checkInsCount, 'time')}. Looks like a lighter stretch.`;
    }
    if (mix === 'mixed') {
      return `You checked in ${pluralize(checkInsCount, 'time')}. Some harder days, some lighter.`;
    }
    return 'You’ve been showing up for yourself ' + range + '.';
  }

  // 2-3 check-ins
  if (mix === 'all-tough') {
    return `You checked in ${pluralize(checkInsCount, 'time')}. It’s been a stretch — that’s clear.`;
  }
  if (mix === 'all-okay') {
    return `You checked in ${pluralize(checkInsCount, 'time')}. Looks like a lighter stretch.`;
  }
  if (mix === 'mixed') {
    return `You checked in ${pluralize(checkInsCount, 'time')}. Some harder days, some lighter.`;
  }
  return `You checked in ${pluralize(checkInsCount, 'time')}. A glimpse, but enough to reflect on.`;
}
