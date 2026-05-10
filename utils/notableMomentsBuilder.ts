// ============================================================================
// NOTABLE MOMENTS BUILDER — Phase 11.8.2
//
// Surfaces 1-3 day-level deltas as inline call-outs beneath the
// Today recap. Each moment compares today's signal against a recent-
// history window and produces an observational sentence:
//
//   "BP 132/82 — 8 points above this week's average"
//   "Refused breakfast — first time in 14 days"
//   "Slept 9.5 hours — longest in 2 weeks"
//
// Tone: observational, not interpretive. No "concerning" / "alarming"
// / "good sign". Just the fact + the comparison. Same forbidden-vocab
// spirit as narrativeSummaryBuilder factualOnly.
//
// Priority (when more than 3 anomalies fire):
//   bp > glucose > weight > meals > sleep
//
// Patient-agnostic: builder reads no PatientContext / patient name.
// ============================================================================

import { listDailyInstancesRange, listLogsInRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getVitalsInRange } from './vitalsStorage';
import { logError } from './devLog';
import type { DailyCareInstance, LogEntry } from '../types/carePlan';
import type { VitalReading } from './vitalsStorage';

// V1 thresholds — tunable. Real-user data can adjust.
const THRESHOLDS = {
  BP_SYSTOLIC_DELTA: 8,    // points off week's avg
  GLUCOSE_DELTA: 20,       // mg/dL off week's avg
  WEIGHT_DELTA: 3,         // lbs off 14-day avg
  SLEEP_DELTA_HOURS: 1.5,  // hours off 14-day avg
} as const;

const PRIORITY_ORDER = ['bp', 'glucose', 'weight', 'meals', 'sleep'] as const;
type Priority = (typeof PRIORITY_ORDER)[number];

export interface NotableMoment {
  text: string;
  category: Priority | string;
}

export interface NotableMomentsBundle {
  hasMoments: boolean;
  moments: NotableMoment[];
}

interface BuilderOptions {
  patientId?: string;
  comparisonDays?: number; // default 14
  max?: number;            // default 3
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function dateFromTimestamp(ts: string): string {
  return ts.slice(0, 10);
}

// Latest reading per type for a single date, restricted to the given
// type (used for today's value).
function latestForDate(
  readings: VitalReading[],
  type: string,
  date: string,
): VitalReading | null {
  let latest: VitalReading | null = null;
  for (const r of readings) {
    if (r.type !== type) continue;
    if (dateFromTimestamp(r.timestamp) !== date) continue;
    if (!latest || r.timestamp > latest.timestamp) latest = r;
  }
  return latest;
}

// Daily-mean per type, excluding the today date. Used as the
// comparison baseline.
function priorDailyMeans(
  readings: VitalReading[],
  type: string,
  todayDate: string,
): number[] {
  const byDay = new Map<string, number[]>();
  for (const r of readings) {
    if (r.type !== type) continue;
    const d = dateFromTimestamp(r.timestamp);
    if (d === todayDate) continue;
    if (!Number.isFinite(r.value)) continue;
    const arr = byDay.get(d) ?? [];
    arr.push(r.value);
    byDay.set(d, arr);
  }
  return Array.from(byDay.values()).map((vals) => mean(vals));
}

// ----------------------------------------------------------------------------
// Detectors
// ----------------------------------------------------------------------------

function detectBP(
  readings: VitalReading[],
  todayDate: string,
): NotableMoment | null {
  const sysToday = latestForDate(readings, 'systolic', todayDate);
  const diaToday = latestForDate(readings, 'diastolic', todayDate);
  if (!sysToday || !diaToday) return null;
  if (!Number.isFinite(sysToday.value) || !Number.isFinite(diaToday.value)) return null;

  const priorSys = priorDailyMeans(readings, 'systolic', todayDate);
  if (priorSys.length === 0) return null;
  const avgSys = mean(priorSys);
  if (!Number.isFinite(avgSys)) return null;
  const delta = sysToday.value - avgSys;
  if (Math.abs(delta) < THRESHOLDS.BP_SYSTOLIC_DELTA) return null;

  const direction = delta > 0 ? 'above' : 'below';
  const points = Math.round(Math.abs(delta));
  const text = `BP ${Math.round(sysToday.value)}/${Math.round(diaToday.value)} — ${points} points ${direction} this week's average`;
  return { text, category: 'bp' };
}

function detectGlucose(
  readings: VitalReading[],
  todayDate: string,
): NotableMoment | null {
  const today = latestForDate(readings, 'glucose', todayDate);
  if (!today || !Number.isFinite(today.value)) return null;
  const prior = priorDailyMeans(readings, 'glucose', todayDate);
  if (prior.length === 0) return null;
  const avg = mean(prior);
  if (!Number.isFinite(avg)) return null;
  const delta = today.value - avg;
  if (Math.abs(delta) < THRESHOLDS.GLUCOSE_DELTA) return null;
  const direction = delta > 0 ? 'above' : 'below';
  const points = Math.round(Math.abs(delta));
  const text = `Glucose ${Math.round(today.value)} — ${points} mg/dL ${direction} this week's average`;
  return { text, category: 'glucose' };
}

function detectWeight(
  readings: VitalReading[],
  todayDate: string,
): NotableMoment | null {
  const today = latestForDate(readings, 'weight', todayDate);
  if (!today || !Number.isFinite(today.value)) return null;
  const prior = priorDailyMeans(readings, 'weight', todayDate);
  if (prior.length === 0) return null;
  const avg = mean(prior);
  if (!Number.isFinite(avg)) return null;
  const delta = today.value - avg;
  if (Math.abs(delta) < THRESHOLDS.WEIGHT_DELTA) return null;
  const direction = delta > 0 ? 'up' : 'down';
  const lbs = Math.round(Math.abs(delta) * 10) / 10;
  const text = `Weight ${Math.round(today.value)} lbs — ${lbs} lbs ${direction} from the 2-week average`;
  return { text, category: 'weight' };
}

function detectRefusedMeal(
  instances: DailyCareInstance[],
  todayDate: string,
  comparisonDays: number,
): NotableMoment | null {
  const todayRefused = instances.find(
    (i) =>
      i.date === todayDate
      && i.itemType === 'nutrition'
      && i.status === 'skipped'
      && (i.skipReason === 'refused'),
  );
  if (!todayRefused) return null;

  // Check prior comparisonDays for any prior refusal of nutrition.
  const cutoff = new Date(`${todayDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - comparisonDays);
  const cutoffStr = ymd(cutoff);
  const priorRefused = instances.some(
    (i) =>
      i.date >= cutoffStr
      && i.date < todayDate
      && i.itemType === 'nutrition'
      && i.status === 'skipped'
      && i.skipReason === 'refused',
  );
  const mealName = todayRefused.itemName || 'meal';
  const text = priorRefused
    ? `Refused ${mealName.toLowerCase()}`
    : `Refused ${mealName.toLowerCase()} — first time in ${comparisonDays} days`;
  return { text, category: 'meals' };
}

function detectSleep(
  instances: DailyCareInstance[],
  logs: LogEntry[],
  todayDate: string,
  comparisonDays: number,
): NotableMoment | null {
  // Pair sleep instances with logs by dailyInstanceId to extract hours.
  const logByInst = new Map<string, LogEntry>();
  for (const l of logs) if (l.dailyInstanceId) logByInst.set(l.dailyInstanceId, l);

  const todayInst = instances.find(
    (i) => i.date === todayDate && i.itemType === 'sleep' && i.status === 'completed',
  );
  if (!todayInst) return null;
  const todayLog = logByInst.get(todayInst.id);
  const todayHours = (todayLog?.data as any)?.hours;
  if (typeof todayHours !== 'number' || !Number.isFinite(todayHours)) return null;

  const priorHours: number[] = [];
  for (const i of instances) {
    if (i.date === todayDate) continue;
    if (i.itemType !== 'sleep') continue;
    if (i.status !== 'completed') continue;
    const l = logByInst.get(i.id);
    const h = (l?.data as any)?.hours;
    if (typeof h === 'number' && Number.isFinite(h)) priorHours.push(h);
  }
  if (priorHours.length === 0) return null;

  const avg = mean(priorHours);
  const delta = todayHours - avg;
  if (Math.abs(delta) < THRESHOLDS.SLEEP_DELTA_HOURS) return null;

  const max = Math.max(...priorHours);
  const min = Math.min(...priorHours);
  const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

  let text: string;
  if (delta > 0) {
    if (todayHours > max) {
      text = `Slept ${fmt(todayHours)} hours — longest in 2 weeks`;
    } else {
      text = `Slept ${fmt(todayHours)} hours — ${fmt(Math.abs(delta))} hours above the 2-week average`;
    }
  } else {
    if (todayHours < min) {
      text = `Slept ${fmt(todayHours)} hours — shortest in 2 weeks`;
    } else {
      text = `Slept ${fmt(todayHours)} hours — ${fmt(Math.abs(delta))} hours below the 2-week average`;
    }
  }
  return { text, category: 'sleep' };
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

export async function buildNotableMoments(
  dateKey: string,
  options: BuilderOptions = {},
): Promise<NotableMomentsBundle> {
  try {
    const patientId = options.patientId ?? DEFAULT_PATIENT_ID;
    const comparisonDays = options.comparisonDays ?? 14;
    const max = options.max ?? 3;

    // Compute the comparison range.
    const today = new Date(`${dateKey}T12:00:00`);
    const start = new Date(today);
    start.setDate(start.getDate() - comparisonDays);
    const startStr = ymd(start);
    const startISO = new Date(`${startStr}T00:00:00`).toISOString();
    const endISO = new Date(`${dateKey}T23:59:59`).toISOString();

    const [instances, logs, vitals] = await Promise.all([
      listDailyInstancesRange(patientId, startStr, dateKey),
      listLogsInRange(patientId, startStr, dateKey),
      getVitalsInRange(startISO, endISO),
    ]);

    const detected: NotableMoment[] = [];
    const bp = detectBP(vitals, dateKey);
    if (bp) detected.push(bp);
    const glucose = detectGlucose(vitals, dateKey);
    if (glucose) detected.push(glucose);
    const weight = detectWeight(vitals, dateKey);
    if (weight) detected.push(weight);
    const meal = detectRefusedMeal(instances, dateKey, comparisonDays);
    if (meal) detected.push(meal);
    const sleep = detectSleep(instances, logs, dateKey, comparisonDays);
    if (sleep) detected.push(sleep);

    // Stable sort by priority order, then cap.
    const ranked = detected.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a.category as Priority);
      const bi = PRIORITY_ORDER.indexOf(b.category as Priority);
      const aRank = ai >= 0 ? ai : Number.POSITIVE_INFINITY;
      const bRank = bi >= 0 ? bi : Number.POSITIVE_INFINITY;
      return aRank - bRank;
    });

    const moments = ranked.slice(0, max);
    return { hasMoments: moments.length > 0, moments };
  } catch (err) {
    logError('notableMomentsBuilder.buildNotableMoments', err);
    return { hasMoments: false, moments: [] };
  }
}
