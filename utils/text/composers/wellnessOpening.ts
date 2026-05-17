// ============================================================================
// composeWellnessOpening
//
// First-line reflection on the Your Wellness page. Friend-tone — never
// coach, never doctor. Phase 29 Batch C F6 retired the five evaluative
// branches (Path B) and collapsed the count-fork (Q-F6.3 Option B):
// every output is now observational (describes state) or invitational
// (forward-looking, no past evaluation). No verdicts on caregiver
// behavior, however soft.
//
// Pre-F6 the composer rendered praise-frame copy at five branches —
// "That counts" / "It's been a stretch — that's clear" / "Looks like
// a lighter stretch" / "A glimpse, but enough to reflect on" / "You've
// been showing up for yourself" — soft verdicts that read as scoring
// regardless of specific word choice. The witness voice work across
// the You tab + wellness subscreen is structurally
// observational/invitational; shipping v1.0 with this composer as the
// one praise-coded outlier would be visible inconsistency on the
// surface most users hit.
//
// Forbidden-vocab guard in the dedicated test extended with the
// retired phrase fragments ("that counts" / "showing up" / "lighter
// stretch" / "enough to reflect" / "for yourself") so the regression
// guard catches the praise FRAME, not just specific words.
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
    return `You checked in once ${range}.`;
  }

  // count >= 2: single mix-switch ladder. The pre-F6 count >= 4 vs
  // count 2-3 fork retired with Path B — every mix branch returned
  // the same observational copy regardless of count tier, so the
  // conditional split was confusion debt. Q-F6.3 Option B locked
  // the full collapse.
  const mix = classifyMix(moodValues);
  const timesLabel = pluralize(checkInsCount, 'time');

  if (mix === 'all-tough') {
    return `You checked in ${timesLabel} ${range}. It’s been a stretch.`;
  }
  if (mix === 'all-okay') {
    return `You checked in ${timesLabel} ${range}. Steady.`;
  }
  if (mix === 'mixed') {
    return `You checked in ${timesLabel} ${range}. Some harder days, some lighter.`;
  }
  // unknown — no mood values recorded for the check-ins, or no values in
  // the 1-5 range. Bare observational form: the user did the action;
  // no characterization of the data follows.
  return `You checked in ${timesLabel} ${range}.`;
}
