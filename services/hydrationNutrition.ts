// ============================================================================
// HYDRATION & NUTRITION — Phase 5.10.a
//
// Aggregates hydration cup totals (from hydrationRepo) and nutrition
// instance status (from listDailyInstancesRange filtered by itemType
// 'nutrition') across the visit-prep window. Meal quality detail comes
// from meal_logged events for the appetite summary line.
//
// Returns null when both arms have no data — caller omits the section
// entirely. Hydration target hardcoded to 8 cups/day for now; the
// Patient type will gain a hydrationTarget field in a Phase 8 audit
// follow-up.
// ============================================================================

import { getHistory as getHydrationHistory } from '../storage/hydrationRepo';
// Wave-1 clinician convergence (Fix #3): meals read through the canonical
// instance reader (logged = completed||skipped; expected = plan-defined slots),
// the single source shared with the Insights tile + visit chip.
import { getCanonicalMealInstancesInRange } from '../utils/mealsCanonical';
import { getEventsByDateRange } from '../storage/eventRepo';
import type { CareEvent } from '../types/event';
import { logError } from '../utils/devLog';

// TODO Phase 8: lift to Patient.hydrationTarget. 8 cups/day is the broad
// adult default; nurse-approved minimum guidance.
const DEFAULT_HYDRATION_TARGET_CUPS = 8;
const LOW_HYDRATION_THRESHOLD_RATIO = 0.5;

export interface HydrationSummary {
  avgCupsPerDay: number;
  target: number;
  lowDays: { date: string; cups: number }[];
}

export interface MealsSummary {
  fullMealDays: number;
  partialMealDays: number;
  refusedMeals: { date: string; meal: string }[];
}

export interface HydrationNutritionSummary {
  hydration: HydrationSummary | null;
  meals: MealsSummary | null;
  appetiteSummary: string | null;
}

export interface BuildHydrationNutritionInput {
  patientId: string;
  dateRange: { start: string; end: string };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

async function buildHydration(
  patientId: string,
  start: string,
  end: string,
): Promise<HydrationSummary | null> {
  try {
    const history = await getHydrationHistory(patientId, start, end);
    const days = Object.entries(history);
    if (days.length === 0) return null;
    const totals = days.map(([, cups]) => cups);
    const recorded = totals.some((v) => v > 0);
    if (!recorded) return null; // hydration never tracked in this window
    const target = DEFAULT_HYDRATION_TARGET_CUPS;
    const avg = average(totals);
    const lowDays = days
      .filter(([, cups]) => cups < target * LOW_HYDRATION_THRESHOLD_RATIO)
      .map(([date, cups]) => ({ date, cups }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      avgCupsPerDay: avg,
      target,
      lowDays,
    };
  } catch (err) {
    logError('hydrationNutrition.buildHydration', err);
    return null;
  }
}

async function buildMeals(
  patientId: string,
  start: string,
  end: string,
): Promise<MealsSummary | null> {
  try {
    // Canonical meal slots (logged = completed||skipped; expected = plan slots).
    const slots = await getCanonicalMealInstancesInRange(start, end, patientId);
    if (slots.length === 0) return null;

    // Group by date: logged vs total scheduled slots that day.
    const byDate = new Map<string, { logged: number; total: number }>();
    for (const slot of slots) {
      if (!slot.date) continue;
      const bucket = byDate.get(slot.date) ?? { logged: 0, total: 0 };
      bucket.total += 1;
      if (slot.logged) bucket.logged += 1;
      byDate.set(slot.date, bucket);
    }

    let fullMealDays = 0;
    let partialMealDays = 0;
    for (const { logged, total } of byDate.values()) {
      if (total === 0) continue;
      if (logged === total) fullMealDays += 1;
      else if (logged > 0) partialMealDays += 1;
    }

    const refusedMeals = slots
      .filter(s => s.status === 'skipped' && s.skipReason === 'refused')
      .map(s => ({ date: s.date, meal: s.name }))
      .filter(m => m.date.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    return { fullMealDays, partialMealDays, refusedMeals };
  } catch (err) {
    logError('hydrationNutrition.buildMeals', err);
    return null;
  }
}

async function buildAppetiteSummary(
  patientId: string,
  start: string,
  end: string,
): Promise<string | null> {
  try {
    const events = await getEventsByDateRange(start, end, patientId);
    const meals = events.filter((e: CareEvent) => e.type === 'meal_logged');
    if (meals.length === 0) return null;
    const buckets = { good: 0, most: 0, some: 0, refused: 0, other: 0 };
    type QualityBucket = 'good' | 'most' | 'some' | 'refused';
    for (const e of meals) {
      // metadata is loosely-typed CareEvent payload; narrow via the
      // explicit literal guard so the bucket index stays type-safe.
      const q: unknown = (e.metadata as { quality?: unknown } | undefined)?.quality;
      if (q === 'good' || q === 'most' || q === 'some' || q === 'refused') {
        buckets[q as QualityBucket] += 1;
      } else {
        buckets.other += 1;
      }
    }
    const total = meals.length;
    const goodLike = buckets.good + buckets.most;
    if (goodLike >= Math.ceil(total * 0.7)) {
      return `Appetite consistent — ate well on ${goodLike} of ${total} logged meals.`;
    }
    if (buckets.refused >= 2) {
      return `Appetite waning — ${buckets.refused} refused meals across the window.`;
    }
    if (buckets.some + buckets.refused >= Math.ceil(total * 0.4)) {
      return `Mixed appetite — ${goodLike} of ${total} meals eaten well.`;
    }
    return `Mixed appetite — ${goodLike} of ${total} meals eaten well.`;
  } catch (err) {
    logError('hydrationNutrition.buildAppetiteSummary', err);
    return null;
  }
}

export async function buildHydrationNutrition(
  input: BuildHydrationNutritionInput,
): Promise<HydrationNutritionSummary | null> {
  const { patientId, dateRange } = input;
  const [hydration, meals, appetiteSummary] = await Promise.all([
    buildHydration(patientId, dateRange.start, dateRange.end),
    buildMeals(patientId, dateRange.start, dateRange.end),
    buildAppetiteSummary(patientId, dateRange.start, dateRange.end),
  ]);
  if (hydration === null && meals === null && appetiteSummary === null) {
    return null;
  }
  return { hydration, meals, appetiteSummary };
}
