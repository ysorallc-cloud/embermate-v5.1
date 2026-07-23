// ============================================================================
// FUNCTIONAL ISSUE EXTRACTION
//
// Surfaces the 3-5 most caregiver-actionable functional issues over the Visit
// Prep period. Pulls from the daily reflection store (mood + energy) and the
// event log (appetite from meal logs, mobility from symptom events).
//
// Severity heuristics:
//   • urgent     — direct safety signal (≥2 falls in the period; mood ≤ 2 avg
//                  with steady decline)
//   • concerning — sustained low signal (mood/energy avg < 3; appetite poor
//                  in ≥40% of meals)
//   • watch      — softer signal, included for caregiver awareness
//
// All severity calls are conservative — the PDF is meant to support a clinic
// conversation, not pre-diagnose. Where data is sparse, the issue is omitted
// rather than asserted with low confidence.
// ============================================================================

import { getRangeWithMissingDays, type DailyReflectionPoint } from '../storage/dailyReflectionRepo';
import { getEventsByDateRange } from '../storage/eventRepo';
import { getSymptomEventsInRange } from '../utils/symptomEvents';
import type { CareEvent } from '../types/event';
import { logError } from '../utils/devLog';

export type FunctionalCategory = 'mood' | 'energy' | 'appetite' | 'mobility';
export type FunctionalSeverity = 'watch' | 'concerning' | 'urgent';

export interface FunctionalIssue {
  category: FunctionalCategory;
  observation: string;
  severity: FunctionalSeverity;
}

export interface DateRange {
  start: string;
  end: string;
}

const MAX_RESULTS = 5;
const MOOD_LOW_THRESHOLD = 3;
const ENERGY_LOW_THRESHOLD = 3;
const APPETITE_POOR_RATIO = 0.4;
const FALL_URGENT_COUNT = 2;
const MOBILITY_KEYWORDS = ['fall', 'unsteady', 'gait', 'balance', 'weakness'];

function avg(nums: number[]): number {
  if (nums.length === 0) return NaN;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function moodIssue(points: DailyReflectionPoint[]): FunctionalIssue | null {
  const moods = points
    .map((p) => p.reflection?.mood)
    .filter((v) => typeof v === 'number') as number[];
  if (moods.length < 3) return null;
  const mean = avg(moods);
  if (mean >= MOOD_LOW_THRESHOLD) return null;
  const severity: FunctionalSeverity = mean <= 2 ? 'urgent' : 'concerning';
  return {
    category: 'mood',
    observation:
      `Mood averaged ${mean.toFixed(1)}/5 across ${moods.length} reflections — ` +
      `caregivers reported persistently low mood.`,
    severity,
  };
}

function energyIssue(points: DailyReflectionPoint[]): FunctionalIssue | null {
  const energies = points
    .map((p) => p.reflection?.energyLevel)
    .filter((v) => typeof v === 'number') as number[];
  if (energies.length < 3) return null;
  const mean = avg(energies);
  if (mean >= ENERGY_LOW_THRESHOLD) return null;
  const severity: FunctionalSeverity = mean <= 2 ? 'concerning' : 'watch';
  return {
    category: 'energy',
    observation:
      `Energy averaged ${mean.toFixed(1)}/5 across ${energies.length} reflections — ` +
      `low energy across the period.`,
    severity,
  };
}

function appetiteIssue(events: CareEvent[]): FunctionalIssue | null {
  const meals = events.filter((e) => e.type === 'meal_logged');
  if (meals.length < 3) return null;
  const poor = meals.filter((e) => {
    const a = (e.metadata as any)?.appetite;
    return a === 'poor' || a === 'refused';
  }).length;
  const ratio = poor / meals.length;
  if (ratio < APPETITE_POOR_RATIO) return null;
  const severity: FunctionalSeverity = ratio >= 0.6 ? 'concerning' : 'watch';
  return {
    category: 'appetite',
    observation:
      `${poor} of ${meals.length} meals logged with poor or refused appetite ` +
      `(${Math.round(ratio * 100)}%).`,
    severity,
  };
}

function mobilityIssue(events: CareEvent[]): FunctionalIssue | null {
  const matches = events.filter((e) => {
    if (e.type !== 'symptom_reported') return false;
    const name = (e.metadata as any)?.symptomName;
    if (typeof name !== 'string') return false;
    const lower = name.toLowerCase();
    return MOBILITY_KEYWORDS.some((kw) => lower.includes(kw));
  });
  if (matches.length === 0) return null;
  const fallCount = matches.filter((e) =>
    ((e.metadata as any)?.symptomName ?? '').toLowerCase().includes('fall'),
  ).length;
  const severity: FunctionalSeverity = fallCount >= FALL_URGENT_COUNT
    ? 'urgent'
    : fallCount >= 1
      ? 'concerning'
      : 'watch';
  return {
    category: 'mobility',
    observation: fallCount > 0
      ? `${fallCount} fall${fallCount === 1 ? '' : 's'} or near-fall events reported in the period.`
      : `${matches.length} mobility-related event${matches.length === 1 ? '' : 's'} reported.`,
    severity,
  };
}

export async function extractFunctionalIssues(
  patientId: string,
  range: DateRange,
): Promise<FunctionalIssue[]> {
  let reflectionPoints: DailyReflectionPoint[] = [];
  let events: CareEvent[] = [];

  try {
    reflectionPoints = await getRangeWithMissingDays(patientId, range.start, range.end);
  } catch (err) {
    logError('functionalIssueExtraction.reflections', err);
  }

  try {
    events = await getEventsByDateRange(range.start, range.end, patientId);
  } catch (err) {
    logError('functionalIssueExtraction.events', err);
  }

  // symptom_reported is NEVER written to eventRepo (symptoms live in
  // symptomStorage) — merge the live symptom store in so mobilityIssue sees real
  // data. (appetiteIssue still reads meal_logged.appetite, which is dormant — no
  // writer captures appetite; left as-is per the appetite-capture bank.)
  try {
    const symptomEvents = await getSymptomEventsInRange(patientId, range.start, range.end);
    events = [...events, ...symptomEvents];
  } catch (err) {
    logError('functionalIssueExtraction.symptoms', err);
  }

  const issues: FunctionalIssue[] = [];

  const m = moodIssue(reflectionPoints);
  if (m) issues.push(m);

  const e = energyIssue(reflectionPoints);
  if (e) issues.push(e);

  const a = appetiteIssue(events);
  if (a) issues.push(a);

  const mob = mobilityIssue(events);
  if (mob) issues.push(mob);

  // Severity-first ordering so urgent items always head the list.
  const SEV_ORDER: Record<FunctionalSeverity, number> = {
    urgent: 0,
    concerning: 1,
    watch: 2,
  };
  issues.sort((x, y) => SEV_ORDER[x.severity] - SEV_ORDER[y.severity]);

  return issues.slice(0, MAX_RESULTS);
}
