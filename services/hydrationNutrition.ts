// ============================================================================
// HYDRATION & NUTRITION — Phase 5.10.a
//
// Aggregates hydration cup totals (from hydrationRepo) and nutrition
// instance status (from listDailyInstancesRange filtered by itemType
// 'nutrition') across the visit-prep window.
//
// Returns null when both arms have no data — caller omits the section
// entirely. Hydration target hardcoded to 8 cups/day for now; the
// Patient type will gain a hydrationTarget field in a Phase 8 audit
// follow-up.
//
// Appetite-half-feature removal — the appetite summary line was removed
// (buildAppetiteSummary bucketed on CareEvent.metadata.quality, a field no
// writer has ever populated; it silently returned the same "Mixed
// appetite — 0 of N meals eaten well" line for every non-empty window,
// which is worse than no data — it looked like a real, if unflattering,
// reading). See project_appetite_dormant_half_feature memory.
// ============================================================================

import { getHistory as getHydrationHistory } from '../storage/hydrationRepo';
// Wave-1 clinician convergence (Fix #3): meals read through the canonical
// instance reader (logged = completed||skipped; expected = plan-defined slots),
// the single source shared with the Insights tile + visit chip.
import { getCanonicalMealInstancesInRange } from '../utils/mealsCanonical';
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

export async function buildHydrationNutrition(
  input: BuildHydrationNutritionInput,
): Promise<HydrationNutritionSummary | null> {
  const { patientId, dateRange } = input;
  const [hydration, meals] = await Promise.all([
    buildHydration(patientId, dateRange.start, dateRange.end),
    buildMeals(patientId, dateRange.start, dateRange.end),
  ]);
  if (hydration === null && meals === null) {
    return null;
  }
  return { hydration, meals };
}
