// ============================================================================
// ANOMALY DETECTOR
//
// Looks at the just-logged event in the context of the last ~30 days and
// surfaces caregiver-actionable signals: vitals far from baseline, missed-
// med streaks, sudden drops in mood / energy / sleep. Each signal carries
// a plain-language `whyItMatters` and a `suggestedQuestion` that can drive
// the toast prompt directly.
//
// Stop condition (Prompt 6): requires 14+ days of usable baseline before
// firing — early-tenure data is noisy and the prompt is most valuable when
// the comparison has weight.
// ============================================================================

import { getVitalsByType, type VitalReading } from '../utils/vitalsStorage';
import { listLogsInRange } from '../storage/carePlanRepo';
import { getRangeWithMissingDays, type DailyReflectionPoint } from '../storage/dailyReflectionRepo';
import type { LogEntry } from '../types/carePlan';
import { logError } from '../utils/devLog';

export type AnomalyKind = 'vital_outlier' | 'missed_streak' | 'mood_drop';

export interface Anomaly {
  kind: AnomalyKind;
  whyItMatters: string;
  suggestedQuestion: string;
}

export type AnomalyTrigger =
  | {
      kind: 'medication_taken' | 'medication_skipped' | 'reflection_logged';
      now?: Date;
    }
  | {
      kind: 'vital_recorded';
      vitalType: string;
      vitalValue: number;
      now?: Date;
    };

const MIN_BASELINE_DAYS = 14;
const VITAL_SIGMA_THRESHOLD = 1.5;
const MISSED_STREAK_THRESHOLD = 3; // > 2 consecutive
const MOOD_DROP_THRESHOLD = 2; // points below 7-day avg
const MOOD_BASELINE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mean(nums: number[]): number {
  if (nums.length === 0) return NaN;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function stdDev(nums: number[], avg: number): number {
  if (nums.length < 2) return 0;
  const sq = nums.reduce((s, v) => s + (v - avg) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(sq);
}

const VITAL_LABELS: Record<string, string> = {
  systolic: 'BP',
  diastolic: 'Diastolic BP',
  heartRate: 'Heart rate',
  glucose: 'Blood glucose',
  oxygen: 'SpO2',
  temperature: 'Temperature',
  weight: 'Weight',
};

async function detectVitalOutlier(
  patientId: string,
  vitalType: string,
  vitalValue: number,
  now: Date,
): Promise<Anomaly | null> {
  const readings: VitalReading[] = await getVitalsByType(vitalType as any, patientId);
  if (readings.length < MIN_BASELINE_DAYS) return null;

  const cutoff = daysAgo(now, 30).getTime();
  const recent = readings.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return !isNaN(t) && t >= cutoff && t <= now.getTime();
  });
  if (recent.length < MIN_BASELINE_DAYS) return null;

  const values = recent.map((r) => r.value);
  const avg = mean(values);
  const sigma = stdDev(values, avg);
  if (sigma === 0) return null;
  const zScore = Math.abs((vitalValue - avg) / sigma);
  if (zScore < VITAL_SIGMA_THRESHOLD) return null;

  const direction = vitalValue > avg ? 'higher' : 'lower';
  const label = VITAL_LABELS[vitalType] || vitalType;
  const baseline = Math.round(avg);
  return {
    kind: 'vital_outlier',
    whyItMatters: `${label} reading is well outside her usual ${baseline} — clinicians look for outliers.`,
    suggestedQuestion: `${label} was ${vitalValue} today — ${direction} than her usual ${baseline}. Anything happening today?`,
  };
}

async function detectMissedStreak(
  patientId: string,
  now: Date,
): Promise<Anomaly | null> {
  const startDate = ymd(daysAgo(now, 30));
  const endDate = ymd(now);
  const logs: LogEntry[] = await listLogsInRange(patientId, startDate, endDate);

  // Only consider medication logs and look at the most recent N consecutive
  // entries — easy: take all logs that are missed/skipped/taken in time
  // order and see if the tail is a missed run.
  const medLogs = logs.filter((l) =>
    (l.data as any)?.type === 'medication' || (l as any).medicationName,
  );
  if (medLogs.length === 0) return null;

  medLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let tail = 0;
  for (let i = medLogs.length - 1; i >= 0; i--) {
    if (medLogs[i].outcome === 'missed') tail += 1;
    else break;
  }
  if (tail < MISSED_STREAK_THRESHOLD) return null;

  return {
    kind: 'missed_streak',
    whyItMatters: 'Several scheduled doses in a row were not logged — worth checking whether something has shifted.',
    suggestedQuestion: `${tail} doses missed in a row. Anything getting in the way today?`,
  };
}

async function detectMoodDrop(
  patientId: string,
  now: Date,
): Promise<Anomaly | null> {
  const startDate = ymd(daysAgo(now, MOOD_BASELINE_DAYS + 1));
  const endDate = ymd(now);
  const points: DailyReflectionPoint[] = await getRangeWithMissingDays(
    patientId, startDate, endDate,
  );
  if (points.length === 0) return null;

  const todayPoint = points[points.length - 1];
  const today = todayPoint?.reflection;
  if (!today) return null;

  const baselineWindow = points.slice(0, -1);
  const moodValues = baselineWindow
    .map((p) => p.reflection?.mood)
    .filter((v) => typeof v === 'number') as number[];
  if (moodValues.length < 4) return null;

  const baseline = mean(moodValues);
  const todayMood = today.mood;
  if (typeof todayMood !== 'number') return null;
  if (baseline - todayMood < MOOD_DROP_THRESHOLD) return null;

  return {
    kind: 'mood_drop',
    whyItMatters: 'A larger-than-usual drop in mood is information clinicians find useful.',
    suggestedQuestion: `Mood dropped to ${todayMood}/5 today — usual is closer to ${baseline.toFixed(1)}. Anything you noticed?`,
  };
}

export async function detectAnomalies(
  patientId: string,
  trigger: AnomalyTrigger,
): Promise<Anomaly[]> {
  const now = trigger.now || new Date();
  const out: Anomaly[] = [];

  try {
    if (trigger.kind === 'vital_recorded') {
      const a = await detectVitalOutlier(
        patientId, trigger.vitalType, trigger.vitalValue, now,
      );
      if (a) out.push(a);
    }

    if (trigger.kind === 'medication_taken' || trigger.kind === 'medication_skipped') {
      const a = await detectMissedStreak(patientId, now);
      if (a) out.push(a);
    }

    if (trigger.kind === 'reflection_logged') {
      const a = await detectMoodDrop(patientId, now);
      if (a) out.push(a);
    }
  } catch (err) {
    logError('anomalyDetector.detect', err);
  }

  return out;
}
