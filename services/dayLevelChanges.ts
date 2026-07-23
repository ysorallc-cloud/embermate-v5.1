// ============================================================================
// DAY-LEVEL CHANGES — Phase 5.12.4a.
//
// Detects significant deltas between the target day and a rolling baseline,
// per category. Powers the "WHAT CHANGED TODAY" section on Journal (5.12.b
// component lands in 4b). Each per-category detector is a pure function
// over a CareEvent[] slice — the orchestrator does the single I/O fetch
// and threads events through.
//
// Detection philosophy: under-flag rather than fatigue caregivers. Each
// category enforces a minimum baseline depth (BASELINE_REQUIREMENTS) and
// returns null when history is thin. Symptoms is the lone exception —
// novelty applies on day 1 because it is a presence check.
//
// V1 thresholds NOT clinically validated. See changeDetectionThresholds.ts.
// ============================================================================

import type { CareEvent } from '../types/event';
import {
  DAY_CHANGE_THRESHOLDS,
  BASELINE_REQUIREMENTS,
} from './changeDetectionThresholds';
import { getEventsByDateRange } from '../storage/eventRepo';
import { getSymptomEventsInRange } from '../utils/symptomEvents';
import { getActivePatientId } from '../storage/patientRegistry';
import { logError } from '../utils/devLog';

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type DayChangeCategory =
  | 'vitals'
  | 'meals'
  | 'mood'
  | 'symptoms'
  | 'sleep';

export interface DayLevelChange {
  category: DayChangeCategory;
  observation: string;
  severity: 'flag' | 'note';
}

export interface DayLevelChangesResult {
  changes: DayLevelChange[];
  hasSignificantChange: boolean;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function dateOnly(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function eventsOn(events: CareEvent[], dateKey: string): CareEvent[] {
  return events.filter((e) => dateOnly(e.timestamp) === dateKey);
}

function eventsBefore(events: CareEvent[], dateKey: string): CareEvent[] {
  return events.filter((e) => dateOnly(e.timestamp) < dateKey);
}

function distinctDayCount(events: CareEvent[]): number {
  const days = new Set<string>();
  for (const e of events) days.add(dateOnly(e.timestamp));
  return days.size;
}

// ============================================================================
// VITALS — BP/HR > 15% above rolling avg
// ============================================================================

export function detectVitalsChange(
  events: CareEvent[],
  targetDate: string,
): DayLevelChange | null {
  const vitals = events.filter((e) => e.type === 'vitals_recorded');
  const today = eventsOn(vitals, targetDate);
  if (today.length === 0) return null;

  const baselineCutoff = addDays(targetDate, -BASELINE_REQUIREMENTS.vitals.window);
  const baseline = eventsBefore(vitals, targetDate).filter(
    (e) => dateOnly(e.timestamp) >= baselineCutoff,
  );
  if (distinctDayCount(baseline) < BASELINE_REQUIREMENTS.vitals.minDays) {
    return null;
  }

  const reading = today[0];
  const meta = (reading.metadata || {}) as Record<string, any>;
  const todaySys = Number(meta.systolic);
  const todayDia = Number(meta.diastolic);
  if (!Number.isFinite(todaySys) || !Number.isFinite(todayDia)) return null;

  const baselineSys = baseline
    .map((e) => Number((e.metadata as any)?.systolic))
    .filter(Number.isFinite);
  const baselineDia = baseline
    .map((e) => Number((e.metadata as any)?.diastolic))
    .filter(Number.isFinite);
  if (baselineSys.length === 0 || baselineDia.length === 0) return null;

  const avgSys = baselineSys.reduce((a, b) => a + b, 0) / baselineSys.length;
  const avgDia = baselineDia.reduce((a, b) => a + b, 0) / baselineDia.length;
  const threshold = 1 + DAY_CHANGE_THRESHOLDS.vitals.deviationPercent / 100;

  if (todaySys > avgSys * threshold || todayDia > avgDia * threshold) {
    const points = Math.round(todaySys - avgSys);
    return {
      category: 'vitals',
      observation: `BP ${todaySys}/${todayDia} — ${points} points above the rolling average`,
      severity: 'flag',
    };
  }
  return null;
}

// ============================================================================
// MEALS — refused meal in a 7-day gap
// ============================================================================

function isRefusedMeal(e: CareEvent): boolean {
  const meta = (e.metadata || {}) as Record<string, any>;
  if (meta.refused === true) return true;
  if (typeof meta.quality === 'string' && meta.quality.toLowerCase() === 'refused') {
    return true;
  }
  return false;
}

export function detectMealsChange(
  events: CareEvent[],
  targetDate: string,
): DayLevelChange | null {
  const meals = events.filter((e) => e.type === 'meal_logged');
  const today = eventsOn(meals, targetDate);
  if (today.length === 0) return null;

  const todayRefused = today.some(isRefusedMeal);
  if (!todayRefused) return null;

  const baselineCutoff = addDays(targetDate, -BASELINE_REQUIREMENTS.meals.window);
  const baseline = eventsBefore(meals, targetDate).filter(
    (e) => dateOnly(e.timestamp) >= baselineCutoff,
  );
  if (distinctDayCount(baseline) < BASELINE_REQUIREMENTS.meals.minDays) {
    return null;
  }

  // Gap check: was there a refusal anywhere in the window? If yes, this
  // is not a "first refusal in a gap" — return null.
  const hadRecentRefusal = baseline.some(isRefusedMeal);
  if (hadRecentRefusal) return null;

  return {
    category: 'meals',
    observation: 'Refused a meal — first time in the past week',
    severity: 'flag',
  };
}

// ============================================================================
// MOOD — drop ≥ 2 points from baseline
// ============================================================================

export function detectMoodChange(
  events: CareEvent[],
  targetDate: string,
): DayLevelChange | null {
  const mood = events.filter((e) => e.type === 'mood_logged');
  const today = eventsOn(mood, targetDate);
  if (today.length === 0) return null;

  const todayScores = today
    .map((e) => Number((e.metadata as any)?.score))
    .filter(Number.isFinite);
  if (todayScores.length === 0) return null;
  const todayScore = todayScores[todayScores.length - 1];

  const baselineCutoff = addDays(targetDate, -BASELINE_REQUIREMENTS.mood.window);
  const baseline = eventsBefore(mood, targetDate).filter(
    (e) => dateOnly(e.timestamp) >= baselineCutoff,
  );
  if (distinctDayCount(baseline) < BASELINE_REQUIREMENTS.mood.minDays) {
    return null;
  }

  const baselineScores = baseline
    .map((e) => Number((e.metadata as any)?.score))
    .filter(Number.isFinite);
  if (baselineScores.length === 0) return null;
  const avg = baselineScores.reduce((a, b) => a + b, 0) / baselineScores.length;

  if (avg - todayScore >= DAY_CHANGE_THRESHOLDS.mood.dropPoints) {
    const drop = Math.round((avg - todayScore) * 10) / 10;
    return {
      category: 'mood',
      observation: `Mood drop of ${drop} points from the rolling average`,
      severity: 'flag',
    };
  }
  return null;
}

// ============================================================================
// SYMPTOMS — novelty within the prior 14 days
// ============================================================================

function symptomName(e: CareEvent): string | null {
  const meta = (e.metadata || {}) as Record<string, any>;
  const name = meta.symptomName;
  return typeof name === 'string' && name.trim().length > 0
    ? name.trim().toLowerCase()
    : null;
}

export function detectSymptomsChange(
  events: CareEvent[],
  targetDate: string,
): DayLevelChange | null {
  const symptoms = events.filter((e) => e.type === 'symptom_reported');
  const today = eventsOn(symptoms, targetDate);
  if (today.length === 0) return null;

  const todayNames = new Set<string>();
  for (const e of today) {
    const name = symptomName(e);
    if (name) todayNames.add(name);
  }
  if (todayNames.size === 0) return null;

  const baselineCutoff = addDays(targetDate, -BASELINE_REQUIREMENTS.symptoms.window);
  const baseline = eventsBefore(symptoms, targetDate).filter(
    (e) => dateOnly(e.timestamp) >= baselineCutoff,
  );
  // Symptoms.minDays is 0 by spec — novelty is a presence check.

  const baselineNames = new Set<string>();
  for (const e of baseline) {
    const name = symptomName(e);
    if (name) baselineNames.add(name);
  }

  const novel: string[] = [];
  for (const name of todayNames) {
    if (!baselineNames.has(name)) novel.push(name);
  }
  if (novel.length === 0) return null;

  const display = novel.join(', ');
  const noveltyDays = DAY_CHANGE_THRESHOLDS.symptoms.noveltyDays;
  return {
    category: 'symptoms',
    observation: `New symptom: ${display} — not seen in ${noveltyDays} days`,
    severity: 'flag',
  };
}

// ============================================================================
// SLEEP — ≥ 2hr below rolling avg
// ============================================================================

export function detectSleepChange(
  events: CareEvent[],
  targetDate: string,
): DayLevelChange | null {
  const sleep = events.filter((e) => e.type === 'sleep_logged');
  const today = eventsOn(sleep, targetDate);
  if (today.length === 0) return null;

  const todayHours = today
    .map((e) => Number((e.metadata as any)?.hours))
    .filter(Number.isFinite);
  if (todayHours.length === 0) return null;
  const todayValue = todayHours[todayHours.length - 1];

  const baselineCutoff = addDays(targetDate, -BASELINE_REQUIREMENTS.sleep.window);
  const baseline = eventsBefore(sleep, targetDate).filter(
    (e) => dateOnly(e.timestamp) >= baselineCutoff,
  );
  if (distinctDayCount(baseline) < BASELINE_REQUIREMENTS.sleep.minDays) {
    return null;
  }

  const baselineHours = baseline
    .map((e) => Number((e.metadata as any)?.hours))
    .filter(Number.isFinite);
  if (baselineHours.length === 0) return null;
  const avg = baselineHours.reduce((a, b) => a + b, 0) / baselineHours.length;

  if (avg - todayValue >= DAY_CHANGE_THRESHOLDS.sleep.deviationHours) {
    const drop = Math.round((avg - todayValue) * 10) / 10;
    return {
      category: 'sleep',
      observation: `Sleep ${todayValue}h — ${drop}h below the rolling average`,
      severity: 'note',
    };
  }
  return null;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Detect day-level changes for the target date. Single I/O fetch over
 * the maximum baseline window (14 days) feeds every per-category
 * detector. `hasSignificantChange` is true only when at least one
 * detector flagged a 'flag'-severity change — a 'note' alone (e.g.
 * sleep below baseline) does not raise the section's eyebrow color.
 */
export async function detectDayLevelChanges(
  dateKey: string,
): Promise<DayLevelChangesResult> {
  try {
    const patientId = await getActivePatientId();
    const start = addDays(dateKey, -14);
    // symptom_reported is never in eventRepo — merge the live symptom store so
    // detectSymptomsChange (new-symptom detection) sees real logged symptoms.
    const [eventLog, symptomEvents] = await Promise.all([
      getEventsByDateRange(start, dateKey, patientId),
      getSymptomEventsInRange(patientId, start, dateKey),
    ]);
    const events = [...eventLog, ...symptomEvents];

    const detectors: (DayLevelChange | null)[] = [
      detectVitalsChange(events, dateKey),
      detectMealsChange(events, dateKey),
      detectMoodChange(events, dateKey),
      detectSymptomsChange(events, dateKey),
      detectSleepChange(events, dateKey),
    ];
    const changes = detectors.filter(
      (c): c is DayLevelChange => c !== null,
    );
    return {
      changes,
      hasSignificantChange: changes.some((c) => c.severity === 'flag'),
    };
  } catch (error) {
    logError('dayLevelChanges.detectDayLevelChanges', error);
    return { changes: [], hasSignificantChange: false };
  }
}
