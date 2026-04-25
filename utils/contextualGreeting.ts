// ============================================================================
// CONTEXTUAL GREETING — Rule-based, time-aware greeting for the Now tab
// No LLM call. Pure logic against hour, stats, and schedule.
// ============================================================================

import type { TodayStats, StatData } from './nowHelpers';

export interface Greeting {
  title: string;
  subtitle: string;
}

function remaining(stats: TodayStats): number {
  let left = 0;
  for (const key of ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness'] as const) {
    const s: StatData | undefined = stats[key as keyof TodayStats];
    if (s) left += Math.max(0, s.total - s.completed);
  }
  return left;
}

function totalDone(stats: TodayStats): number {
  let done = 0;
  for (const key of ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness'] as const) {
    const s: StatData | undefined = stats[key as keyof TodayStats];
    if (s) done += s.completed;
  }
  return done;
}

function totalItems(stats: TodayStats): number {
  let total = 0;
  for (const key of ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness'] as const) {
    const s: StatData | undefined = stats[key as keyof TodayStats];
    if (s) total += s.total;
  }
  return total;
}

/**
 * Build a contextual greeting based on time of day, care stats, and schedule.
 *
 * @param hour - Current hour (0–23)
 * @param stats - Today's care completion stats
 * @param nextScheduledTime - Formatted time of the next scheduled task, or null
 * @param patientName - The care recipient's name (e.g. "Mom")
 */
export function buildGreeting(
  hour: number,
  stats: TodayStats,
  nextScheduledTime: string | null,
  patientName: string,
): Greeting {
  const left = remaining(stats);
  const done = totalDone(stats);
  const total = totalItems(stats);
  const allDone = total > 0 && left === 0;

  // ── Late night (0–5) ──
  if (hour < 6) {
    return {
      title: 'Late night check-in',
      subtitle: left > 0 ? `${left} item${left !== 1 ? 's' : ''} still pending.` : "Everything's logged.",
    };
  }

  // ── Morning (6–11) ──
  if (hour < 12) {
    const subtitle = nextScheduledTime
      ? `${patientName}'s first meds are at ${nextScheduledTime}.`
      : total > 0
        ? `${total} item${total !== 1 ? 's' : ''} on today's schedule.`
        : `${patientName}'s care day is starting.`;

    return { title: 'Good morning', subtitle };
  }

  // ── Midday (12–17) ──
  if (hour < 18) {
    const title = 'Good afternoon';
    let subtitle: string;

    if (allDone) {
      subtitle = `Morning went smoothly — all ${done} tasks done.`;
    } else if (done > 0) {
      subtitle = `${done} of ${total} done so far. ${left} remaining.`;
    } else {
      subtitle = `${total} item${total !== 1 ? 's' : ''} still on the schedule.`;
    }

    return { title, subtitle };
  }

  // ── Evening (18–23) ──
  let title: string;
  if (allDone) {
    title = 'All caught up';
  } else if (left === 1) {
    title = 'Almost there';
  } else {
    title = 'Good evening';
  }

  let subtitle: string;
  if (allDone) {
    subtitle = `All ${done} items completed today.`;
  } else {
    subtitle = `${left} item${left !== 1 ? 's' : ''} still remaining tonight.`;
  }

  return { title, subtitle };
}
