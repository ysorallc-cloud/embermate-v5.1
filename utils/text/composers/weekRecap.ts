// ============================================================================
// composeWeekRecap
//
// One-sentence summary at the bottom of the "How the week felt" timeline
// card. Reads the last N days of mood check-ins and produces honest,
// non-judgmental copy. Returns "" when there's nothing meaningful to say.
// ============================================================================

import type { MoodLevel } from './wellnessOpening';

export interface WeekRecapDay {
  /** YYYY-MM-DD. */
  date: string;
  /** Mood for the day, or undefined if no check-in. */
  mood?: MoodLevel;
  /** Day-of-week index 0-6 (0=Sun). */
  weekday: number;
}

const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function moodWord(m: MoodLevel): 'tough' | 'getting-by' | 'okay' | 'good' {
  if (m <= 2) return 'tough';
  if (m === 3) return 'getting-by';
  if (m === 4) return 'okay';
  return 'good';
}

export function composeWeekRecap(days: WeekRecapDay[]): string {
  if (days.length === 0) return '';
  const filled = days.filter((d) => d.mood != null);
  const empty = days.length - filled.length;

  if (filled.length === 0) {
    return `${empty} empty days. That’s normal during stretches when you’re carrying a lot.`;
  }

  // Single bright spot inside an otherwise-empty week.
  if (filled.length === 1) {
    const [only] = filled;
    const word = moodWord(only.mood!);
    if (word === 'good' || word === 'okay') {
      return `${WEEKDAY_NAME[only.weekday]} felt ${word}.`;
    }
    return `${WEEKDAY_NAME[only.weekday]} felt ${word}. The other days are unmarked, not unimportant.`;
  }

  // Tough run — three+ tough days in a row anywhere in the window.
  let run = 0;
  let maxRun = 0;
  for (const d of days) {
    if (d.mood != null && moodWord(d.mood) === 'tough') {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else {
      run = 0;
    }
  }
  if (maxRun >= 3) {
    return 'A few tough days in a row. They’re not lost — they’re noted.';
  }

  // Bright weekend pattern — Sat/Sun mood >= 4 while weekday avg <= 3.
  const weekend = filled.filter((d) => d.weekday === 0 || d.weekday === 6);
  const weekday = filled.filter((d) => d.weekday !== 0 && d.weekday !== 6);
  if (weekend.length > 0 && weekday.length > 0) {
    const wAvg = weekend.reduce((s, d) => s + d.mood!, 0) / weekend.length;
    const dAvg = weekday.reduce((s, d) => s + d.mood!, 0) / weekday.length;
    if (wAvg >= 4 && dAvg <= 3) {
      return 'Weekend felt lighter than the week.';
    }
  }

  // Otherwise return a calm summary based on overall mix.
  const toughCount = filled.filter((d) => moodWord(d.mood!) === 'tough').length;
  if (toughCount >= filled.length / 2) {
    return 'More heavy than light this stretch.';
  }
  return 'A mix — some lighter days, some harder.';
}
