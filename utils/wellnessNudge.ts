// ============================================================================
// WELLNESS NUDGE
//
// Decides whether to render the "A gentle nudge" card on the Wellness page,
// produces the headline + body for whichever trigger fired, and persists a
// per-day dismissal flag so a "Maybe later" tap stays dismissed for the
// rest of the calendar day.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export type NudgeTrigger = 'long-absence' | 'tough-stretch' | 'no-breath';

export interface NudgeInput {
  /** Days since the last mood check-in. null when there's never been one. */
  daysSinceLastCheckIn: number | null;
  /** Tough/getting-by check-in count in the last 14 days. */
  toughDaysLast14: number;
  /** Breath sessions in the last 30 days. */
  breathSessionsLast30: number;
}

export interface NudgeContent {
  trigger: NudgeTrigger;
  headline: string;
  body: string;
}

export function shouldShowNudge(input: NudgeInput): NudgeContent | null {
  if (input.daysSinceLastCheckIn != null && input.daysSinceLastCheckIn >= 7) {
    return {
      trigger: 'long-absence',
      headline: 'It’s been a stretch.',
      body: 'When you can, taking a few minutes for yourself helps. The Breathe tool is short.',
    };
  }
  if (input.toughDaysLast14 >= 5) {
    return {
      trigger: 'tough-stretch',
      headline: 'This week’s been heavy.',
      body: 'The Helpline is always there if you want to talk to someone. Even checking in here counts.',
    };
  }
  if (input.breathSessionsLast30 === 0 && input.toughDaysLast14 >= 1) {
    return {
      trigger: 'no-breath',
      headline: 'You haven’t paused much.',
      body: 'When you can, taking a few minutes for yourself helps. The Breathe tool is short.',
    };
  }
  return null;
}

const KEY_PREFIX = 'wellnessNudgeDismissed:';

function todayKey(date?: Date): string {
  const d = date ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function isNudgeDismissedToday(date?: Date): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(`${KEY_PREFIX}${todayKey(date)}`);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function dismissNudgeForToday(date?: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${todayKey(date)}`, 'true');
  } catch {}
}
