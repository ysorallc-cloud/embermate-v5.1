// ============================================================================
// SLEEP, ENERGY & MOOD PATTERNS — Phase 5.10.a
//
// Replaces the legacy "Wellness" section in Visit Prep. Surfaces variance
// + same-day correlation rather than just averages — doctors triage by
// "is this a change or a baseline" first, "what's the number" second.
//
// Pulls per-day reflection points (sleepQuality / mood / energyLevel,
// each 1-5) from dailyReflectionRepo for both the visit-prep window AND
// the equal-length prior window.
//
// Correlations are intentionally simple — same-day AND-logic, not stats.
// ============================================================================

import {
  getRangeWithMissingDays,
  type DailyReflectionPoint,
} from '../storage/dailyReflectionRepo';
import { logError } from '../utils/devLog';

const POOR_SLEEP_THRESHOLD = 2;
const LOW_SLEEP_THRESHOLD_FOR_CORRELATION = 3;
const LOW_ENERGY_THRESHOLD = 2;
const DIFFICULT_MOOD_THRESHOLD = 2;
const SLEEP_CONCENTRATION_TAIL_DAYS = 5;
const SLEEP_CONCENTRATION_MIN_HITS = 3;
const SLEEP_CONCENTRATION_QUALITY_FLOOR = 3;

export interface WellnessSleepSummary {
  avgQuality: number;
  priorAvg: number | null;
  poorNights: { date: string; quality: number }[];
  earlierWaking: boolean;
}

export interface WellnessEnergySummary {
  afternoonDipDays: number;
  /** Of the dip days, how many also had low sleep quality. */
  correlatesWithPoorSleep: number | null;
}

export interface WellnessMoodSummary {
  difficultMornings: { date: string; reason?: string }[];
  /** Reserved for future correlation against vitals. */
  correlatesWithVitals: boolean;
}

export interface WellnessPatternsSummary {
  sleep: WellnessSleepSummary | null;
  energy: WellnessEnergySummary | null;
  mood: WellnessMoodSummary | null;
}

export interface BuildWellnessPatternsInput {
  patientId: string;
  dateRange: { start: string; end: string };
}

function priorWindow(start: string, end: string): { start: string; end: string } {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const priorEnd = new Date(s);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - (days - 1));
  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
  };
}

function avgOf(points: DailyReflectionPoint[], pick: (r: any) => number | undefined): number | null {
  const values = points
    .map((p) => pick(p.reflection))
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function buildSleep(
  points: DailyReflectionPoint[],
  priorPoints: DailyReflectionPoint[],
): WellnessSleepSummary | null {
  const avg = avgOf(points, (r) => r?.sleepQuality);
  if (avg === null) return null;
  const priorAvg = avgOf(priorPoints, (r) => r?.sleepQuality);
  const poorNights = points
    .filter((p) =>
      typeof p.reflection?.sleepQuality === 'number' &&
      p.reflection.sleepQuality < POOR_SLEEP_THRESHOLD,
    )
    .map((p) => ({ date: p.date, quality: p.reflection!.sleepQuality! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // earlierWaking: ≥3 of last 5 days had quality below floor.
  const tail = points.slice(-SLEEP_CONCENTRATION_TAIL_DAYS);
  const tailHits = tail.filter((p) =>
    typeof p.reflection?.sleepQuality === 'number' &&
    p.reflection.sleepQuality < SLEEP_CONCENTRATION_QUALITY_FLOOR,
  ).length;
  const earlierWaking = tailHits >= SLEEP_CONCENTRATION_MIN_HITS;

  return { avgQuality: avg, priorAvg, poorNights, earlierWaking };
}

function buildEnergy(points: DailyReflectionPoint[]): WellnessEnergySummary | null {
  const dipDays = points.filter(
    (p) =>
      typeof p.reflection?.energyLevel === 'number' &&
      p.reflection.energyLevel <= LOW_ENERGY_THRESHOLD,
  );
  if (dipDays.length === 0) return null;
  const correlated = dipDays.filter(
    (p) =>
      typeof p.reflection?.sleepQuality === 'number' &&
      p.reflection.sleepQuality <= LOW_SLEEP_THRESHOLD_FOR_CORRELATION,
  ).length;
  return {
    afternoonDipDays: dipDays.length,
    correlatesWithPoorSleep: correlated,
  };
}

function buildMood(points: DailyReflectionPoint[]): WellnessMoodSummary | null {
  const difficult = points.filter(
    (p) =>
      typeof p.reflection?.mood === 'number' &&
      p.reflection.mood <= DIFFICULT_MOOD_THRESHOLD,
  );
  if (difficult.length === 0) return null;
  return {
    difficultMornings: difficult
      .map((p) => ({ date: p.date }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    correlatesWithVitals: false,
  };
}

export async function buildWellnessPatterns(
  input: BuildWellnessPatternsInput,
): Promise<WellnessPatternsSummary> {
  const { patientId, dateRange } = input;
  try {
    const prior = priorWindow(dateRange.start, dateRange.end);
    const [points, priorPoints] = await Promise.all([
      getRangeWithMissingDays(patientId, dateRange.start, dateRange.end),
      getRangeWithMissingDays(patientId, prior.start, prior.end),
    ]);
    return {
      sleep: buildSleep(points, priorPoints),
      energy: buildEnergy(points),
      mood: buildMood(points),
    };
  } catch (err) {
    logError('wellnessPatterns.build', err);
    return { sleep: null, energy: null, mood: null };
  }
}
