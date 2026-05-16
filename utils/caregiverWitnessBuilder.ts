// ============================================================================
// CAREGIVER WITNESS BUILDER — Phase 11.1
//
// Reads from the same union pipeline as narrativeSummaryBuilder
// (instances + logs + events) and produces a short, observation-only
// line that grounds the You-tab affirmation header and footer in what
// the caregiver has actually been doing.
//
// Contract is observation, not praise. No interpretive language, no
// "great"/"keep going"/"you're crushing it" framing. Same forbidden-
// vocab spirit that pinned narrativeSummaryBuilder factualOnly mode in
// 5.12.b. The footer keeps the Phase 7.4 "most people never see what
// that takes" voice — the line in front of it just gets specific.
//
// Returns null when no signal qualifies, in which case the caller
// falls back to the existing generic affirmation/footer copy. Same
// voice, same styling regardless of which surfaces — the user
// shouldn't be able to tell witness from generic.
//
// Read pipeline mirrors the post-5.13.5 narrative builder:
// (events, completed instances) union-deduplicated by
// (carePlanItemId, scheduledTime) so a flow that writes both doesn't
// double-count. Logs are read for completeness but the dedup-counted
// signals (medication_volume, wellness_consistency) follow the
// established two-source pattern from narrativeSummaryBuilder's
// unionCount.
//
// Threshold values are V1 guesses. Real-user data will tell us which
// fire too often or never. Tune in a follow-up phase, not in consumer
// code — keep the magic numbers in this file.
// ============================================================================

import { listDailyInstancesRange, listLogsInRange } from '../storage/carePlanRepo';
import { getEventsByDateRange } from '../storage/eventRepo';
import { getActivePatientId } from '../storage/patientRegistry';
import { logError } from './devLog';
import type { CareEvent, EventType } from '../types/event';
import type { DailyCareInstance, LogEntry, CarePlanItemType } from '../types/carePlan';

// ----------------------------------------------------------------------------
// V1 thresholds — tunable. Real-user data will tell us which fire too
// often or never. Tune in a follow-up phase, not in consumer code.
// ----------------------------------------------------------------------------

const THRESHOLDS = {
  MORNING_STREAK_DAYS: 5, // of 7
  HIGH_COMPLETION_PCT: 80,
  MEDICATION_VOLUME_WEEK: 10,
  WELLNESS_CONSISTENCY_WEEK: 5,
  LONG_STRETCH_DAYS: 21,
} as const;

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type WitnessSource =
  | 'morning_streak'
  | 'medication_volume'
  | 'wellness_consistency'
  | 'high_completion_week'
  | 'long_stretch_carried';

export interface WitnessSignal {
  /** Short specific line, sentence-cased, no trailing period.
   *  Example: "You showed up 6 of 7 mornings this week" */
  line: string;
  /**
   * Short specific footer fragment. May contain full sentences and a
   * newline; styling preserves the break.
   *
   * Phase 26 F5 — INTENTIONALLY UNRENDERED. The field used to drive the
   * footer affirmation block at the bottom of app/(tabs)/support.tsx
   * (added by Phase 11.3); Phase 26 retired that footer because the
   * AffirmationHeader at the top of the You tab already carries the
   * witness via `line`, so the footer was a duplicate emotional beat.
   * The builder still emits this field — do not remove it speculatively.
   * v1.1 cleanup may drop the field + the per-source compositions if
   * no surface revives it. If you're adding a new surface that wants
   * a longer witness line, prefer rendering this field over inventing
   * a new one.
   */
  footerLine: string;
  /** The signal that won, for instrumentation + tests. */
  source: WitnessSource;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Same dedup pattern as narrativeSummaryBuilder.unionCount: events of
 * the given type union completed instances of the given itemType,
 * keyed by (carePlanItemId, scheduledTime). Events without those keys
 * fall back to event:${id} so they stay unique.
 */
function unionCount(
  events: CareEvent[],
  eventType: EventType,
  instances: DailyCareInstance[],
  itemType: CarePlanItemType,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const e of events) {
    if (e.type !== eventType) continue;
    const meta = (e.metadata || {}) as Record<string, any>;
    const itemId = meta.carePlanItemId;
    const sched = meta.scheduledTime;
    const key = itemId && sched ? `${itemId}:${sched}` : `event:${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  for (const i of instances) {
    if (i.itemType !== itemType) continue;
    if (i.status !== 'completed') continue;
    const key = `${i.carePlanItemId}:${i.scheduledTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  return count;
}

// ----------------------------------------------------------------------------
// Signal evaluators — each returns a WitnessSignal or null
// ----------------------------------------------------------------------------

interface SignalContext {
  /** Last 7 dates inclusive of today, ordered oldest → newest. */
  weekDates: string[];
  /** Last 30 dates inclusive of today, ordered oldest → newest.
   *  Long enough to detect a 21-day stretch from any starting point
   *  inside the window. */
  longDates: string[];
  /** Instances scheduled across the 7-day window. */
  weekInstances: DailyCareInstance[];
  /** Instances scheduled across the 30-day window. */
  longInstances: DailyCareInstance[];
  /** Logs across the 30-day window. */
  longLogs: LogEntry[];
  /** Events across the 30-day window. */
  longEvents: CareEvent[];
}

function evalMorningStreak(ctx: SignalContext): WitnessSignal | null {
  // Count distinct days in the 7-day window where there's at least one
  // completed instance with windowLabel === 'morning'. The runtime
  // morning marker on a DailyCareInstance is windowLabel (set at
  // generation from the source-of-truth metadata.timeSlot in
  // utils/carePlanDefaults.ts). No time-of-day heuristic.
  const morningDays = new Set<string>();
  for (const i of ctx.weekInstances) {
    if (i.windowLabel !== 'morning') continue;
    if (i.status !== 'completed') continue;
    morningDays.add(i.date);
  }
  const n = morningDays.size;
  if (n < THRESHOLDS.MORNING_STREAK_DAYS) return null;
  return {
    line: `You showed up ${n} of 7 mornings this week`,
    footerLine: `${n} mornings this week.\nMost people never see what that takes.`,
    source: 'morning_streak',
  };
}

function evalHighCompletionWeek(ctx: SignalContext): WitnessSignal | null {
  const total = ctx.weekInstances.length;
  if (total === 0) return null;
  // Skipped counts as caregiver-acted, not a gap — pinned by contract 9.
  const acted = ctx.weekInstances.filter(
    (i) => i.status === 'completed' || i.status === 'skipped',
  ).length;
  const pct = Math.round((acted / total) * 100);
  if (pct < THRESHOLDS.HIGH_COMPLETION_PCT) return null;
  return {
    line: `You handled ${pct}% of this week's schedule`,
    footerLine: `${acted} care moments this week.\nMost people never see what that takes.`,
    source: 'high_completion_week',
  };
}

function evalMedicationVolume(ctx: SignalContext): WitnessSignal | null {
  const count = unionCount(
    weekSlice(ctx.longEvents, ctx.weekDates),
    'medication_taken',
    ctx.weekInstances,
    'medication',
  );
  if (count < THRESHOLDS.MEDICATION_VOLUME_WEEK) return null;
  return {
    // Phase 29 Batch A.1 F3 — "medication windows hit this week" →
    // "medications, on time, this week." The "windows hit" framing
    // read as operational performance scoring ("hit" specifically
    // codes as success-rating); the new phrasing is observational
    // and stays in the witness-voice register the rest of the You-
    // lane carries. Pinned by
    // __tests__/utils/caregiverWitnessBuilder.test.ts (existing pin
    // updated) + youTabMoment29.test.tsx absence pin (Batch A.1 F4).
    line: `${count} medications, on time, this week.`,
    footerLine: `${count} medications, on time, this week.\nMost people never see what that takes.`,
    source: 'medication_volume',
  };
}

function evalWellnessConsistency(ctx: SignalContext): WitnessSignal | null {
  const count = unionCount(
    weekSlice(ctx.longEvents, ctx.weekDates),
    'wellness_check',
    ctx.weekInstances,
    'wellness',
  );
  if (count < THRESHOLDS.WELLNESS_CONSISTENCY_WEEK) return null;
  return {
    line: `${count} wellness check-ins logged this week`,
    footerLine: `${count} wellness check-ins this week.\nMost people never see what that takes.`,
    source: 'wellness_consistency',
  };
}

function evalLongStretchCarried(ctx: SignalContext): WitnessSignal | null {
  // Any activity on a given date counts: an instance acted on
  // (completed/skipped/missed/partial), a log of any kind, or an event
  // of any type. The signal is "showed up at all", not "completed
  // perfectly".
  const activeDates = new Set<string>();
  for (const i of ctx.longInstances) {
    if (i.status === 'pending') continue;
    activeDates.add(i.date);
  }
  for (const l of ctx.longLogs) {
    activeDates.add(l.date);
  }
  for (const e of ctx.longEvents) {
    // Events store timestamp; derive the date from the ISO prefix.
    const date = (e.timestamp || '').slice(0, 10);
    if (date) activeDates.add(date);
  }
  // Count consecutive active days ending at today.
  let streak = 0;
  for (let i = ctx.longDates.length - 1; i >= 0; i--) {
    if (activeDates.has(ctx.longDates[i])) streak++;
    else break;
  }
  if (streak < THRESHOLDS.LONG_STRETCH_DAYS) return null;
  return {
    line: `${streak} days running. You've been here every one.`,
    footerLine: `${streak} days running.\nMost people never see what that takes.`,
    source: 'long_stretch_carried',
  };
}

function weekSlice<T extends { timestamp?: string }>(
  events: T[],
  weekDates: string[],
): T[] {
  const set = new Set(weekDates);
  return events.filter((e) => {
    const d = (e.timestamp || '').slice(0, 10);
    return d && set.has(d);
  });
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

/**
 * Returns the highest-priority qualifying witness signal, or null when
 * no threshold qualifies. Caller falls back to generic affirmation /
 * footer copy when null is returned.
 */
export async function buildCaregiverWitness(
  patientId?: string,
  asOf?: Date,
): Promise<WitnessSignal | null> {
  try {
    const pid = patientId ?? (await getActivePatientId());
    const today = asOf ?? new Date();
    // 7-day window ending today, inclusive.
    const weekStart = addDays(today, -6);
    const weekStartStr = ymd(weekStart);
    const todayStr = ymd(today);
    // Long window — 30 days back. The 21-day stretch fits inside this
    // and we get the same week as a slice; one fetch round-trip.
    const longStart = addDays(today, -29);
    const longStartStr = ymd(longStart);

    const [longInstances, longLogs, longEvents] = await Promise.all([
      listDailyInstancesRange(pid, longStartStr, todayStr),
      listLogsInRange(pid, longStartStr, todayStr),
      getEventsByDateRange(longStartStr, todayStr, pid),
    ]);

    const weekInstances = longInstances.filter(
      (i) => i.date >= weekStartStr && i.date <= todayStr,
    );

    const weekDates: string[] = [];
    for (let n = 6; n >= 0; n--) weekDates.push(ymd(addDays(today, -n)));
    const longDates: string[] = [];
    for (let n = 29; n >= 0; n--) longDates.push(ymd(addDays(today, -n)));

    const ctx: SignalContext = {
      weekDates,
      longDates,
      weekInstances,
      longInstances,
      longLogs,
      longEvents,
    };

    // Evaluation order: most specific first. First qualifier wins.
    const evaluators: Array<(c: SignalContext) => WitnessSignal | null> = [
      evalMorningStreak,
      evalHighCompletionWeek,
      evalMedicationVolume,
      evalWellnessConsistency,
      evalLongStretchCarried,
    ];

    for (const evaluator of evaluators) {
      const sig = evaluator(ctx);
      if (sig) return sig;
    }

    return null;
  } catch (err) {
    logError('caregiverWitnessBuilder.buildCaregiverWitness', err);
    return null;
  }
}
