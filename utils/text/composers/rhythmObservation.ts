// ============================================================================
// composeRhythmObservation
//
// "Noticed" callout inside the Your Rhythm card. Returns null when the
// caregiver's data doesn't show a confident pattern — silence is better
// than fabricated patterns.
// ============================================================================

import type { MoodLevel } from './wellnessOpening';

export interface RhythmCheckIn {
  /** YYYY-MM-DD. */
  date: string;
  /** Local hour 0-23 of the check-in. */
  hour: number;
  /** Day-of-week 0-6 (0=Sun). */
  weekday: number;
  /** Mood reported (1-5). */
  mood: MoodLevel;
}

export interface RhythmInput {
  checkIns: RhythmCheckIn[];
  /** ISO timestamps of breath sessions in the same window. */
  breathSessions?: string[];
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

export function composeRhythmObservation(input: RhythmInput): string | null {
  const { checkIns, breathSessions = [] } = input;

  if (checkIns.length < 3) return null;

  // Pattern 1 — weekend dominance.
  const weekendCount = checkIns.filter((c) => isWeekend(c.weekday)).length;
  const weekdayCount = checkIns.length - weekendCount;
  // ≥60% on weekends with at least 3 weekend check-ins.
  if (weekendCount >= 3 && weekendCount / checkIns.length >= 0.6) {
    return 'Weekends are when you check in most. That tracks — quiet moments help.';
  }

  // Pattern 2 — late-night habit (after 9 PM, before 4 AM).
  const lateNight = checkIns.filter((c) => c.hour >= 21 || c.hour < 4).length;
  if (lateNight >= 3 && lateNight / checkIns.length >= 0.6) {
    return 'You’ve been checking in late at night. Not unusual; that’s often when there’s space.';
  }

  // Pattern 3 — breath sessions tend to follow tough check-ins (within 24h).
  if (breathSessions.length > 0) {
    const toughTimes = checkIns
      .filter((c) => c.mood <= 2)
      .map((c) => new Date(`${c.date}T${String(c.hour).padStart(2, '0')}:00:00`).getTime());
    if (toughTimes.length >= 2) {
      const followups = breathSessions.filter((iso) => {
        const t = new Date(iso).getTime();
        return toughTimes.some((tt) => t > tt && t - tt < 24 * 60 * 60 * 1000);
      }).length;
      if (followups >= 2) {
        return 'After a couple tough days, you tend to take a breathing break. Worth noticing.';
      }
    }
  }

  return null;
}
