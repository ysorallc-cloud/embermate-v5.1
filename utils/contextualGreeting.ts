// ============================================================================
// CONTEXTUAL GREETING — Rule-based, time-aware greeting for the Now tab
// No LLM call. Pure logic against hour, stats, and schedule.
// ============================================================================

import type { TodayStats, StatData } from './nowHelpers';
import { pluralize } from './text/primitives';

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
      subtitle: left > 0 ? `${pluralize(left, 'item')} still pending.` : "Everything's logged.",
    };
  }

  // Subtitles intentionally drop the patient name — it's already rendered
  // in the header pill above the metadata row. Repeating it forces the line
  // to wrap on common iPhone widths. Variants below are tuned to fit a
  // single line beside the time chip.

  // ── Morning (6–11) ──
  if (hour < 12) {
    const subtitle = nextScheduledTime
      ? `Next meds: ${nextScheduledTime}`
      : total > 0
        ? `${pluralize(total, 'item')} on today's schedule.`
        : 'Care day is starting.';

    return { title: 'Good morning', subtitle };
  }

  // ── Midday (12–17) ──
  if (hour < 18) {
    const title = 'Good afternoon';
    let subtitle: string;

    if (nextScheduledTime) {
      subtitle = `Next meds: ${nextScheduledTime}`;
    } else if (allDone) {
      subtitle = "Morning's done. Afternoon's clear.";
    } else if (done > 0) {
      subtitle = `${done} of ${total} done so far. ${left} remaining.`;
    } else {
      subtitle = `${pluralize(total, 'item')} still on the schedule.`;
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
    subtitle = 'All done. Nice work.';
  } else {
    subtitle = `Almost done — ${left} left tonight`;
  }

  return { title, subtitle };
}
