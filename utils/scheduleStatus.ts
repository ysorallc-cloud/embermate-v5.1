// ============================================================================
// SCHEDULE STATUS
//
// Caregiver-warm period status helper. Maps a list of scheduled events for
// a period (morning / afternoon / evening) plus the current time onto a
// labeled state. The `label` field is the metadata text the period header
// renders — pinned here so all surfaces share a single source of truth and
// no consumer can drift back to "missed" / "overdue" copy.
// ============================================================================

export type Period = 'morning' | 'afternoon' | 'evening';

/** Minimal shape callers need to provide. Compatible with DailyCareInstance. */
export interface ScheduleEvent {
  /** ISO timestamp or HH:mm string. Not used for status branching today —
   *  reserved so future iterations can hook in (e.g. "still due now"). */
  scheduledTime: string;
  status: 'completed' | 'skipped' | 'pending' | 'missed' | string;
}

export type PeriodStatus =
  | { kind: 'past-complete'; loggedCount: number; label: 'complete' }
  | { kind: 'past-incomplete'; loggedCount: number; notLoggedCount: number; label: string }
  | { kind: 'current-active'; toGoCount: number; label: string }
  | { kind: 'current-caughtup'; label: 'caught up' }
  | { kind: 'future'; comingUpCount: number; label: string };

const PERIOD_BOUNDS: Record<Period, { startHour: number; endHour: number }> = {
  morning: { startHour: 5, endHour: 12 },     // 5:00 – 11:59
  afternoon: { startHour: 12, endHour: 18 },  // 12:00 – 17:59
  evening: { startHour: 18, endHour: 22 },    // 18:00 – 21:59
};

function isLogged(status: string): boolean {
  return status === 'completed' || status === 'skipped';
}

export function getPeriodStatus(
  period: Period,
  events: ScheduleEvent[],
  now: Date = new Date(),
): PeriodStatus {
  const { startHour, endHour } = PERIOD_BOUNDS[period];
  const hour = now.getHours();
  const isPast = hour >= endHour;
  const isCurrent = hour >= startHour && hour < endHour;

  const loggedCount = events.filter((e) => isLogged(e.status)).length;
  const notLoggedCount = events.length - loggedCount;

  if (isPast) {
    if (notLoggedCount === 0) {
      return { kind: 'past-complete', loggedCount, label: 'complete' };
    }
    const noun = notLoggedCount === 1 ? '1 not logged' : `${notLoggedCount} not logged`;
    return { kind: 'past-incomplete', loggedCount, notLoggedCount, label: noun };
  }

  if (isCurrent) {
    if (notLoggedCount === 0) {
      return { kind: 'current-caughtup', label: 'caught up' };
    }
    const noun = notLoggedCount === 1 ? '1 to go' : `${notLoggedCount} to go`;
    return { kind: 'current-active', toGoCount: notLoggedCount, label: noun };
  }

  // Future
  return {
    kind: 'future',
    comingUpCount: events.length,
    label: events.length === 1 ? '1 coming up' : `${events.length} coming up`,
  };
}
