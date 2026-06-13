// ============================================================================
// composeWeekRecap
//
// One-sentence summary at the bottom of the "How the week felt" timeline
// card on caregiver-wellness, and on the MoodStrip on the You tab.
// Reads the last N days of mood check-ins and produces honest, warm,
// non-judgmental copy. Returns "" when there is nothing meaningful to say.
//
// F7 C6b (2026-06-12) reframe — the prior recap library carried 7+ branches
// (weekend pattern, tough run, single bright spot, balanced mix, etc.).
// The F7 spec collapsed the voice to 3 warm outcomes:
//
//   All positive   → "A good week."
//   Mixed          → "A rougher [day/stretch]. You still showed up."
//   Mostly low     → "A hard week. That's allowed."
//
// Empty-days branch is preserved (the prior empathic acknowledgement still
// fits the warm register). Single-day phrasing falls into the same 3-bucket
// shape with "day" instead of "stretch" in the mixed outcome.
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

function moodWord(m: MoodLevel): 'tough' | 'getting-by' | 'okay' | 'good' {
  if (m <= 2) return 'tough';
  if (m === 3) return 'getting-by';
  if (m === 4) return 'okay';
  return 'good';
}

export function composeWeekRecap(days: WeekRecapDay[]): string {
  if (days.length === 0) return '';
  const filled = days.filter((d) => d.mood != null);

  // Empty-days fallback — preserved from the pre-F7 voice.
  if (filled.length === 0) {
    return `${days.length} empty days. That’s normal during stretches when you’re carrying a lot.`;
  }

  const toughCount = filled.filter((d) => moodWord(d.mood!) === 'tough').length;
  const positiveCount = filled.filter((d) => {
    const w = moodWord(d.mood!);
    return w === 'good' || w === 'okay';
  }).length;

  // Mostly low — at least half the filled days were tough.
  if (toughCount >= filled.length / 2 && toughCount > 0) {
    return "A hard week. That’s allowed.";
  }

  // All positive — every filled day reads as good or okay (no tough,
  // no getting-by). The strictest of the three buckets.
  if (positiveCount === filled.length) {
    return 'A good week.';
  }

  // Mixed — some tough or getting-by, some good/okay.
  const noun = filled.length === 1 ? 'day' : 'stretch';
  return `A rougher ${noun}. You still showed up.`;
}
