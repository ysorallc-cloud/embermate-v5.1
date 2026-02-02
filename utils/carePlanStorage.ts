// ============================================================================
// CARE PLAN STORAGE
// Persistence layer for care plans and overrides
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitDataUpdate } from '../lib/events';
import { CarePlan, CarePlanOverride, isCarePlan } from './carePlanTypes';
import { generateDefaultCarePlan } from './carePlanDefaults';

const CARE_PLAN_KEY = '@embermate_care_plan_v1';
const OVERRIDES_KEY = '@embermate_care_plan_overrides';
const DAILY_SNAPSHOT_KEY = '@embermate_care_plan_snapshot';

// ============================================================================
// CARE PLAN CRUD
// ============================================================================

/**
 * Get the current care plan
 */
export async function getCarePlan(): Promise<CarePlan | null> {
  try {
    const data = await AsyncStorage.getItem(CARE_PLAN_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    if (isCarePlan(parsed)) {
      return parsed;
    }

    console.warn('Invalid care plan data, returning null');
    return null;
  } catch (error) {
    console.error('Error getting care plan:', error);
    return null;
  }
}

/**
 * Save a care plan (full replacement)
 */
export async function saveCarePlan(plan: CarePlan): Promise<void> {
  try {
    plan.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(CARE_PLAN_KEY, JSON.stringify(plan));
    emitDataUpdate('carePlan');
  } catch (error) {
    console.error('Error saving care plan:', error);
    throw error;
  }
}

/**
 * Update parts of the care plan
 */
export async function updateCarePlan(updates: Partial<CarePlan>): Promise<CarePlan> {
  try {
    const existing = await getCarePlan();
    if (!existing) {
      throw new Error('No care plan exists to update');
    }

    const updated: CarePlan = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CARE_PLAN_KEY, JSON.stringify(updated));
    emitDataUpdate('carePlan');
    return updated;
  } catch (error) {
    console.error('Error updating care plan:', error);
    throw error;
  }
}

/**
 * Delete the care plan
 */
export async function clearCarePlan(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CARE_PLAN_KEY);
    emitDataUpdate('carePlan');
  } catch (error) {
    console.error('Error clearing care plan:', error);
    throw error;
  }
}

/**
 * Get or create a care plan (ensures one exists)
 */
export async function ensureCarePlan(): Promise<CarePlan> {
  try {
    const existing = await getCarePlan();
    if (existing) {
      return existing;
    }

    // Create default plan
    const defaultPlan = generateDefaultCarePlan();
    await saveCarePlan(defaultPlan);
    return defaultPlan;
  } catch (error) {
    console.error('Error ensuring care plan:', error);
    // Return default plan even if save fails
    return generateDefaultCarePlan();
  }
}

// ============================================================================
// DAILY SNAPSHOT
// Freeze CarePlan at start-of-day to ensure consistency throughout the day
// Edits to the CarePlan only take effect the next day
// ============================================================================

interface DailySnapshot {
  date: string;           // YYYY-MM-DD
  carePlan: CarePlan;     // Frozen copy of CarePlan for this day
  createdAt: string;      // When snapshot was created
}

/**
 * Get the daily snapshot for a specific date
 * Returns null if no snapshot exists for that date
 */
export async function getDailySnapshot(date: string): Promise<CarePlan | null> {
  try {
    const data = await AsyncStorage.getItem(DAILY_SNAPSHOT_KEY);
    if (!data) return null;

    const snapshot: DailySnapshot = JSON.parse(data);

    // Only return if snapshot is for the requested date
    if (snapshot.date === date && isCarePlan(snapshot.carePlan)) {
      return snapshot.carePlan;
    }

    return null;
  } catch (error) {
    console.error('Error getting daily snapshot:', error);
    return null;
  }
}

/**
 * Create or update the daily snapshot
 * Called at start of day or when first accessing CarePlan
 */
export async function setDailySnapshot(date: string, carePlan: CarePlan): Promise<void> {
  try {
    const snapshot: DailySnapshot = {
      date,
      carePlan: JSON.parse(JSON.stringify(carePlan)), // Deep copy
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(DAILY_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Error setting daily snapshot:', error);
    throw error;
  }
}

/**
 * Get the effective CarePlan for today
 * Returns frozen snapshot if it exists, otherwise creates one from current plan
 * This ensures CarePlan edits only take effect the next day
 */
export async function getEffectiveCarePlan(date?: string): Promise<CarePlan | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // First, check if we have a snapshot for today
    const snapshot = await getDailySnapshot(targetDate);
    if (snapshot) {
      return snapshot;
    }

    // No snapshot exists - get current plan and create snapshot
    const currentPlan = await getCarePlan();
    if (!currentPlan) {
      return null;
    }

    // Create snapshot for today (freezes the plan)
    await setDailySnapshot(targetDate, currentPlan);
    return currentPlan;
  } catch (error) {
    console.error('Error getting effective care plan:', error);
    // Fallback to current plan if snapshot fails
    return getCarePlan();
  }
}

/**
 * Check if today's snapshot needs to be created
 * Call this on app startup to ensure snapshot exists
 */
export async function ensureDailySnapshot(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const existingSnapshot = await getDailySnapshot(today);
    if (existingSnapshot) {
      return; // Snapshot already exists for today
    }

    const currentPlan = await getCarePlan();
    if (currentPlan) {
      await setDailySnapshot(today, currentPlan);
    }
  } catch (error) {
    console.error('Error ensuring daily snapshot:', error);
  }
}

/**
 * Clear old snapshots (only keep today's)
 * Snapshots are ephemeral - we only need today's
 */
export async function clearOldSnapshots(): Promise<void> {
  // Snapshots are automatically replaced each day
  // No cleanup needed as we only store one snapshot at a time
}

// ============================================================================
// OVERRIDES CRUD
// ============================================================================

/**
 * Get all overrides (keyed by date)
 */
async function getAllOverrides(): Promise<Record<string, CarePlanOverride[]>> {
  try {
    const data = await AsyncStorage.getItem(OVERRIDES_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting overrides:', error);
    return {};
  }
}

/**
 * Save all overrides
 */
async function saveAllOverrides(overrides: Record<string, CarePlanOverride[]>): Promise<void> {
  try {
    await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Error saving overrides:', error);
    throw error;
  }
}

/**
 * Get overrides for a specific date
 */
export async function getOverrides(date: string): Promise<CarePlanOverride[]> {
  try {
    const allOverrides = await getAllOverrides();
    return allOverrides[date] || [];
  } catch (error) {
    console.error('Error getting overrides for date:', error);
    return [];
  }
}

/**
 * Set an override for a specific item
 */
export async function setOverride(override: CarePlanOverride): Promise<void> {
  try {
    const allOverrides = await getAllOverrides();
    const dateOverrides = allOverrides[override.date] || [];

    // Remove any existing override for this item
    const filteredOverrides = dateOverrides.filter(
      o => !(o.routineId === override.routineId && o.itemId === override.itemId)
    );

    // Add new override
    filteredOverrides.push(override);

    allOverrides[override.date] = filteredOverrides;
    await saveAllOverrides(allOverrides);
    emitDataUpdate('carePlan');
  } catch (error) {
    console.error('Error setting override:', error);
    throw error;
  }
}

/**
 * Remove an override for a specific item
 */
export async function removeOverride(
  date: string,
  routineId: string,
  itemId: string
): Promise<void> {
  try {
    const allOverrides = await getAllOverrides();
    const dateOverrides = allOverrides[date] || [];

    allOverrides[date] = dateOverrides.filter(
      o => !(o.routineId === routineId && o.itemId === itemId)
    );

    await saveAllOverrides(allOverrides);
    emitDataUpdate('carePlan');
  } catch (error) {
    console.error('Error removing override:', error);
    throw error;
  }
}

/**
 * Clear all overrides for a specific date
 */
export async function clearOverrides(date: string): Promise<void> {
  try {
    const allOverrides = await getAllOverrides();
    delete allOverrides[date];
    await saveAllOverrides(allOverrides);
    emitDataUpdate('carePlan');
  } catch (error) {
    console.error('Error clearing overrides:', error);
    throw error;
  }
}

/**
 * Clear old overrides (older than 30 days)
 */
export async function pruneOldOverrides(): Promise<void> {
  try {
    const allOverrides = await getAllOverrides();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const prunedOverrides: Record<string, CarePlanOverride[]> = {};
    for (const [date, overrides] of Object.entries(allOverrides)) {
      if (date >= cutoffStr) {
        prunedOverrides[date] = overrides;
      }
    }

    await saveAllOverrides(prunedOverrides);
  } catch (error) {
    console.error('Error pruning old overrides:', error);
  }
}

// ============================================================================
// ROUTINE MANAGEMENT
// ============================================================================

/**
 * Add a routine to the care plan
 */
export async function addRoutine(routine: CarePlan['routines'][0]): Promise<CarePlan> {
  const plan = await ensureCarePlan();
  plan.routines.push(routine);
  await saveCarePlan(plan);
  return plan;
}

/**
 * Update a routine in the care plan
 */
export async function updateRoutine(
  routineId: string,
  updates: Partial<CarePlan['routines'][0]>
): Promise<CarePlan> {
  const plan = await ensureCarePlan();
  const routineIndex = plan.routines.findIndex(r => r.id === routineId);

  if (routineIndex === -1) {
    throw new Error(`Routine ${routineId} not found`);
  }

  plan.routines[routineIndex] = {
    ...plan.routines[routineIndex],
    ...updates,
  };

  await saveCarePlan(plan);
  return plan;
}

/**
 * Remove a routine from the care plan
 */
export async function removeRoutine(routineId: string): Promise<CarePlan> {
  const plan = await ensureCarePlan();
  plan.routines = plan.routines.filter(r => r.id !== routineId);
  await saveCarePlan(plan);
  return plan;
}

/**
 * Add an item to a routine
 */
export async function addItemToRoutine(
  routineId: string,
  item: CarePlan['routines'][0]['items'][0]
): Promise<CarePlan> {
  const plan = await ensureCarePlan();
  const routine = plan.routines.find(r => r.id === routineId);

  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  routine.items.push(item);
  await saveCarePlan(plan);
  return plan;
}

/**
 * Remove an item from a routine
 */
export async function removeItemFromRoutine(
  routineId: string,
  itemId: string
): Promise<CarePlan> {
  const plan = await ensureCarePlan();
  const routine = plan.routines.find(r => r.id === routineId);

  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  routine.items = routine.items.filter(i => i.id !== itemId);
  await saveCarePlan(plan);
  return plan;
}

// ============================================================================
// PROGRESS TRACKING
// Functions for log screens to mark CarePlan items as complete
// ============================================================================

/**
 * Mark a CarePlan item as complete
 * Used by log screens when user logs something from a CarePlan context
 *
 * @param routineId - The routine containing the item
 * @param itemId - The item to mark as complete
 * @param date - Optional date (defaults to today)
 */
export async function completeCarePlanItem(
  routineId: string,
  itemId: string,
  date?: string
): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const override: CarePlanOverride = {
      date: targetDate,
      routineId,
      itemId,
      done: true,
      timestamp: new Date().toISOString(),
    };

    await setOverride(override);
    // emitDataUpdate is called by setOverride
  } catch (error) {
    console.error('Error completing care plan item:', error);
    throw error;
  }
}

/**
 * Mark a CarePlan item as incomplete (undo completion)
 * Used when user deletes a log entry
 *
 * @param routineId - The routine containing the item
 * @param itemId - The item to mark as incomplete
 * @param date - Optional date (defaults to today)
 */
export async function uncompleteCarePlanItem(
  routineId: string,
  itemId: string,
  date?: string
): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    await removeOverride(targetDate, routineId, itemId);
    // emitDataUpdate is called by removeOverride
  } catch (error) {
    console.error('Error uncompleting care plan item:', error);
    throw error;
  }
}

/**
 * Get the completion status of a CarePlan item for a specific date
 *
 * @param routineId - The routine containing the item
 * @param itemId - The item to check
 * @param date - Optional date (defaults to today)
 * @returns true if item has a "done" override
 */
export async function isCarePlanItemComplete(
  routineId: string,
  itemId: string,
  date?: string
): Promise<boolean> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const overrides = await getOverrides(targetDate);
    const override = overrides.find(
      o => o.routineId === routineId && o.itemId === itemId
    );
    return override?.done === true;
  } catch (error) {
    console.error('Error checking care plan item completion:', error);
    return false;
  }
}

/**
 * Track that progress was made on a CarePlan item
 * This is called automatically when logging meds/vitals/meals/mood
 * The actual completion is derived from the logged data
 *
 * Note: For most items, completion is "derived" from actual logged data
 * (e.g., meds are complete when all meds for that time slot are taken)
 * This function is for tracking manual overrides only
 */
export async function trackCarePlanProgress(
  routineId: string,
  itemId: string,
  meta?: { logId?: string; logType?: string }
): Promise<void> {
  // For now, this is a no-op as progress is derived from actual logs
  // This function exists as a hook point for future audit trail functionality
  if (__DEV__) {
    console.log(`[CarePlan] Progress tracked for ${routineId}/${itemId}`, meta);
  }
}
