// ============================================================================
// CANONICAL MEALS — single source of truth for meals surfaces (VP report,
// visit-prep chip, Insights tile). Mirrors adherenceCanonical / vitalsCanonical.
//
// Wave-1 clinician-artifact convergence (Fix #3). The unit is the meal
// INSTANCE — the scheduled breakfast/lunch/dinner slots Now/Journal render and
// mark logged/missed — NOT raw LogEntries (counting LogEntries produced the
// Insights 4.4/day overcount). Source = DailyCareInstance (itemType
// 'nutrition') via listDailyInstancesRange (carePlanRepo → safeStorage →
// SecureStore: same AES path Now/Journal read, no plaintext).
//
// LOCKED DEFINITIONS (settled with Amber before implementation):
//   • logged  = instances with a caregiver-acted status: 'completed' OR
//     'skipped'. A skipped meal IS logged — it records a real outcome
//     (refused / didn't eat). Matches Now's getTypeStats.
//   • expected = the nutrition instances the CARE PLAN actually generates in
//     range (each instance = one plan-defined slot, materialized by
//     ensureDailyInstances). Plan-driven by construction — NOT hardcoded 3/day.
// ============================================================================

import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import type { DailyCareInstance, DailyInstanceStatus } from '../types/carePlan';
import { logError } from './devLog';

/** A meal slot is "logged" when the caregiver acted on it. */
export function isMealLogged(status: DailyInstanceStatus): boolean {
  return status === 'completed' || status === 'skipped';
}

export interface MealSlot {
  date: string;
  name: string;
  status: DailyInstanceStatus;
  scheduledTime: string;
  /** status ∈ {completed, skipped} */
  logged: boolean;
  /** present only when status === 'skipped' */
  skipReason?: DailyCareInstance['skipReason'];
}

export interface MealsLoggedCount {
  /** nutrition instances with completed||skipped status in range. */
  logged: number;
  /** ALL nutrition instances in range (plan-defined scheduled slots). */
  expected: number;
}

/** Per-day meal slots with status — for the Visit Prep report. */
export async function getCanonicalMealInstancesInRange(
  startDate: string,
  endDate: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<MealSlot[]> {
  try {
    const instances = await listDailyInstancesRange(patientId, startDate, endDate);
    return instances
      .filter(i => i.itemType === 'nutrition')
      .map(i => ({
        date: i.date,
        name: i.itemName,
        status: i.status,
        scheduledTime: i.scheduledTime,
        logged: isMealLogged(i.status),
        skipReason: i.skipReason,
      }));
  } catch (err) {
    logError('mealsCanonical.getCanonicalMealInstancesInRange', err);
    return [];
  }
}

/** { logged, expected } on the instance unit — for the Insights tile + chip. */
export async function countCanonicalMealsLoggedInRange(
  startDate: string,
  endDate: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<MealsLoggedCount> {
  const slots = await getCanonicalMealInstancesInRange(startDate, endDate, patientId);
  return {
    logged: slots.filter(s => s.logged).length,
    expected: slots.length,
  };
}
