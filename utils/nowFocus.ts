// ============================================================================
// nowFocus — the shared Now-tab state model.
//
// ONE function that, given today's DailyCareInstances (+ a reference `now`),
// answers "what should the Now tab surface?": the single next action, whether
// the day is active or done, and the open/upcoming counts for the folded
// summary line. Both the schedule re-tone (START HERE hero + folded line) and
// the reflection-honesty gate read from this so they can never contradict each
// other or the schedule.
//
// Overdue determination REUSES getCareItemStatus (the app's canonical resolver,
// grace windows and all) so this matches the timeline's own overdue split.
// Only status==='pending' items are "open" — 'missed'/'completed'/'skipped' are
// resolved (this mirrors the Now timeline, where 'missed' lives in the
// completed bucket, not the pending/overdue split).
// ============================================================================

import type { DailyCareInstance, CarePlanItemType } from '../types/carePlan';
import { getCareItemStatus } from './careItemStatus';

export type NowDayState = 'active' | 'done';

export interface NowFocus {
  /** The ONE item to surface in the START HERE hero. Null when the day is done. */
  topAction: DailyCareInstance | null;
  /** 'active' when anything is still open (overdue or upcoming); 'done' otherwise. */
  dayState: NowDayState;
  /** Overdue (open-now) pending items. */
  openCount: number;
  /** Upcoming (later-today) pending items. */
  upcomingCount: number;
}

// Importance by item TYPE (no new data). meds > vitals > meals/mood/hydration >
// everything else. Used ONLY to break ties among OVERDUE items — upcoming
// ordering is purely chronological.
const TYPE_IMPORTANCE: Record<CarePlanItemType, number> = {
  medication: 5,
  vitals: 4,
  nutrition: 3,
  mood: 3,
  hydration: 3,
  wellness: 2,
  sleep: 2,
  activity: 2,
  appointment: 2,
  self_care: 1,
  errand: 1,
  shift: 1,
  custom: 1,
};

function importanceOf(itemType: CarePlanItemType): number {
  return TYPE_IMPORTANCE[itemType] ?? 0;
}

function scheduledMs(i: DailyCareInstance): number {
  const t = new Date(i.scheduledTime).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

export function computeNowFocus(
  instances: DailyCareInstance[],
  now: Date = new Date(),
): NowFocus {
  const pending = instances.filter((i) => i.status === 'pending');
  const overdue = pending.filter((i) => getCareItemStatus(i, now) === 'overdue');
  const upcoming = pending.filter((i) => getCareItemStatus(i, now) !== 'overdue');

  let topAction: DailyCareInstance | null = null;
  if (overdue.length > 0) {
    // Highest importance wins; ties break to the oldest (most overdue) first.
    topAction = [...overdue].sort((a, b) => {
      const byImportance = importanceOf(b.itemType) - importanceOf(a.itemType);
      if (byImportance !== 0) return byImportance;
      return scheduledMs(a) - scheduledMs(b);
    })[0];
  } else if (upcoming.length > 0) {
    // Nothing overdue → the next upcoming item, purely chronological.
    topAction = [...upcoming].sort((a, b) => scheduledMs(a) - scheduledMs(b))[0];
  }

  const dayState: NowDayState = pending.length > 0 ? 'active' : 'done';

  return {
    topAction,
    dayState,
    openCount: overdue.length,
    upcomingCount: upcoming.length,
  };
}
