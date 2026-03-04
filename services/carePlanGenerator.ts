// ============================================================================
// CARE PLAN GENERATOR SERVICE
// Generates DailyCareInstance records from CarePlan regimen
// Called on app launch, tab focus, and date change
// ============================================================================

import { devLog, logError } from '../utils/devLog';
import {
  CarePlan,
  CarePlanItem,
  DailyCareInstance,
  TimeWindow,
  TimeWindowLabel,
  DEFAULT_TIME_WINDOWS,
} from '../types/carePlan';
import {
  getActiveCarePlan,
  listCarePlanItems,
  listDailyInstances,
  upsertDailyInstances,
  updateDailyInstanceStatus,
  removeStaleInstances,
  upsertCarePlanItem,
  deleteCarePlanItem,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getCarePlanConfig } from '../storage/carePlanConfigRepo';
import {
  MedsBucketConfig,
  MedicationPlanItem,
  TimeOfDay,
  VitalsBucketConfig,
  MealsBucketConfig,
  BucketConfig,
  CarePlanConfig,
  VITAL_TYPE_OPTIONS,
} from '../types/carePlanConfig';
import { generateUniqueId } from '../utils/idGenerator';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Grace period in minutes before marking as missed
const MISSED_GRACE_PERIOD_MINUTES = 120; // 2 hours

// ============================================================================
// CARE PLAN CONFIG SYNC
// Ensures CarePlanItems align with CarePlanConfig (bucket system) medications
// This handles the case where migration created items that user later removed
// ============================================================================

/**
 * Map TimeOfDay to TimeWindowLabel
 */
const TIME_OF_DAY_TO_WINDOW: Record<TimeOfDay, TimeWindowLabel> = {
  morning: 'morning',
  midday: 'afternoon',
  evening: 'evening',
  night: 'night',
  custom: 'custom',
};

/**
 * Default times for each time of day
 */
const TIME_OF_DAY_DEFAULTS: Record<TimeOfDay, string> = {
  morning: '08:00',
  midday: '12:00',
  evening: '18:00',
  night: '21:00',
  custom: '12:00',
};

/**
 * Create a CarePlanItem from a MedicationPlanItem
 */
function createCarePlanItemFromConfigMed(
  configMed: MedicationPlanItem,
  carePlanId: string
): CarePlanItem {
  const now = new Date().toISOString();

  // Build time windows from timesOfDay
  const times: TimeWindow[] = configMed.timesOfDay.map((tod, index) => ({
    id: generateUniqueId(),
    kind: 'exact' as const,
    label: TIME_OF_DAY_TO_WINDOW[tod],
    at: configMed.scheduledTimeHHmm || configMed.customTimes?.[index] || TIME_OF_DAY_DEFAULTS[tod],
  }));

  // If no times specified, default to morning
  if (times.length === 0) {
    times.push({
      id: generateUniqueId(),
      kind: 'exact',
      label: 'morning',
      at: '08:00',
    });
  }

  return {
    id: generateUniqueId(),
    carePlanId,
    type: 'medication',
    name: `${configMed.name} ${configMed.dosage}`.trim(),
    instructions: configMed.instructions || undefined,
    priority: 'required',
    active: configMed.active,
    schedule: {
      frequency: 'daily',
      times,
    },
    medicationDetails: {
      medicationId: configMed.id,
      dose: configMed.dosage,
      instructions: configMed.instructions || undefined,
    },
    emoji: '💊',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Sync CarePlanItems with CarePlanConfig medications
 * - Creates CarePlanItems for config medications that don't have items
 * - Deactivates CarePlanItems that aren't in the current config
 * @returns true if any changes were made
 */
async function syncMedicationItemsWithConfig(
  carePlanId: string,
  patientId: string
): Promise<boolean> {
  let changed = false;
  try {
    // Get current CarePlanConfig (user's actual selections)
    const config = await getCarePlanConfig(patientId);

    // If no config or meds bucket disabled, deactivate all medication items
    const medsConfig = config?.meds as MedsBucketConfig | undefined;
    const configMedications = medsConfig?.enabled ? (medsConfig.medications || []) : [];
    const activeConfigMeds = configMedications.filter(m => m.active);

    // Build lookup of config medication names (lowercase for matching)
    const activeMedNames = new Set(
      activeConfigMeds.map(m => m.name.toLowerCase().trim())
    );

    // Get all CarePlanItems (including inactive)
    const allItems = await listCarePlanItems(carePlanId, { activeOnly: false });
    const medicationItems = allItems.filter(item => item.type === 'medication');

    // Build lookup of existing items by medicationId AND by exact composed name
    const existingByMedId = new Map<string, CarePlanItem>();
    const existingByName = new Map<string, CarePlanItem>();
    for (const item of medicationItems) {
      if (item.medicationDetails?.medicationId) {
        existingByMedId.set(item.medicationDetails.medicationId, item);
      }
      existingByName.set(item.name.toLowerCase().trim(), item);
    }

    // 1. CREATE: Add CarePlanItems for config medications that don't have items
    for (const configMed of activeConfigMeds) {
      // Match by medicationId (most reliable)
      const matchById = existingByMedId.get(configMed.id);
      // Match by exact composed name ("Name Dosage")
      const composedName = `${configMed.name} ${configMed.dosage}`.trim().toLowerCase();
      const matchByName = existingByName.get(composedName);

      if (!matchById && !matchByName) {
        const newItem = createCarePlanItemFromConfigMed(configMed, carePlanId);
        devLog('[syncMedicationItemsWithConfig] Creating CarePlanItem for config med:', configMed.name);
        await upsertCarePlanItem(newItem);
        changed = true;
      }
    }

    // 2. DEACTIVATE: Remove CarePlanItems that aren't in config
    for (const item of medicationItems) {
      // Check by medicationId first (most reliable)
      const medId = item.medicationDetails?.medicationId;
      if (medId && activeMedNames.size > 0) {
        const matchesById = activeConfigMeds.some(cm => cm.id === medId);
        if (matchesById) continue; // Item matches config — keep it
      }

      // Fallback: check if item name matches any config med's composed name
      const itemNameLower = item.name.toLowerCase().trim();
      const matchesByName = activeConfigMeds.some(cm => {
        const composed = `${cm.name} ${cm.dosage}`.trim().toLowerCase();
        return itemNameLower === composed || itemNameLower === cm.name.toLowerCase().trim();
      });

      if (!matchesByName && item.active) {
        devLog('[syncMedicationItemsWithConfig] Deactivating stale medication item:', item.name);
        await upsertCarePlanItem({
          ...item,
          active: false,
        });
        changed = true;
      }
    }
  } catch (error) {
    logError('carePlanGenerator.syncMedicationItemsWithConfig', error);
    // Don't throw - this is a cleanup operation, shouldn't block instance generation
  }
  return changed;
}

/**
 * Sync CarePlanItems with other bucket types (vitals, meals, wellness)
 * Creates items when bucket is enabled, deactivates when disabled
 * IMPORTANT: Only creates items if NONE of that type exist (to prevent duplicates)
 * @returns true if any changes were made
 */
async function syncOtherBucketsWithConfig(
  carePlanId: string,
  patientId: string
): Promise<boolean> {
  let changed = false;
  try {
    const config = await getCarePlanConfig(patientId);
    if (!config) return false;

    const allItems = await listCarePlanItems(carePlanId, { activeOnly: false });
    const now = new Date().toISOString();

    // ===== VITALS SYNC =====
    const vitalsConfig = config.vitals as VitalsBucketConfig;
    const vitalsEnabled = vitalsConfig?.enabled && vitalsConfig.vitalTypes?.length > 0;
    // Check for ANY vitals items (by type only, not name)
    const existingVitalsItems = allItems.filter(i => i.type === 'vitals');
    const hasActiveVitalsItem = existingVitalsItems.some(i => i.active);

    if (vitalsEnabled && existingVitalsItems.length === 0) {
      // Only create if NO vitals items exist at all
      const vitalsTimesOfDay = vitalsConfig.timesOfDay || ['morning'];
      const times: TimeWindow[] = vitalsTimesOfDay.map(tod => ({
        id: generateUniqueId(),
        kind: 'exact' as const,
        label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
        at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '08:00',
      }));

      const vitalsItem: CarePlanItem = {
        id: generateUniqueId(),
        carePlanId,
        type: 'vitals',
        name: 'Check vitals',
        instructions: vitalsConfig.vitalTypes?.map(t => {
          const opt = VITAL_TYPE_OPTIONS.find(o => o.value === t);
          return opt?.label || t;
        }).join(', '),
        priority: vitalsConfig.priority || 'recommended',
        active: true,
        schedule: { frequency: 'daily', times },
        emoji: '📊',
        createdAt: now,
        updatedAt: now,
      };

      devLog('[syncOtherBucketsWithConfig] Creating vitals CarePlanItem');
      await upsertCarePlanItem(vitalsItem);
      changed = true;
    } else if (!vitalsEnabled && hasActiveVitalsItem) {
      // Deactivate all vitals items
      for (const item of existingVitalsItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false });
          changed = true;
        }
      }
    }

    // ===== MOOD CLEANUP =====
    // Mood check-ins are now captured within wellness checks (morning + evening).
    // Deactivate any existing standalone mood items.
    const existingMoodItems = allItems.filter(i => i.type === 'mood');
    for (const item of existingMoodItems) {
      if (item.active) {
        await upsertCarePlanItem({ ...item, active: false });
        changed = true;
      }
    }

    // ===== MEALS SYNC =====
    const mealsConfig = config.meals as MealsBucketConfig;
    const mealsEnabled = mealsConfig?.enabled;
    const allNutritionItems = allItems.filter(i => i.type === 'nutrition');
    // Only sync-meal-* items are managed by this sync; sample/other meal items are deactivated
    const syncMealItems = allNutritionItems.filter(i => i.id.startsWith('sync-meal-'));
    const nonSyncMealItems = allNutritionItems.filter(i => !i.id.startsWith('sync-meal-'));

    // Deactivate any non-sync nutrition items (e.g. sample-meal-breakfast) to prevent duplicates
    // But first, migrate any completed/skipped instances to the corresponding sync-meal item
    // so that completions are not lost when the old item is deactivated and its instances removed.
    const today = getTodayDateString();
    const todayInstances = await listDailyInstances(patientId, today);

    for (const item of nonSyncMealItems) {
      if (item.active) {
        // Determine which sync-meal item this maps to based on name
        const itemName = item.name?.toLowerCase() || '';
        let targetTod: string | null = null;
        if (itemName.includes('breakfast')) targetTod = 'morning';
        else if (itemName.includes('lunch')) targetTod = 'midday';
        else if (itemName.includes('dinner') || itemName.includes('supper')) targetTod = 'evening';
        else if (itemName.includes('snack')) targetTod = 'night';
        // Fallback: check schedule window labels
        if (!targetTod && item.schedule?.times?.[0]?.label) {
          const label = item.schedule.times[0].label;
          if (label === 'morning') targetTod = 'morning';
          else if (label === 'afternoon') targetTod = 'midday';
          else if (label === 'evening') targetTod = 'evening';
        }

        const syncTargetId = targetTod ? `sync-meal-${targetTod}` : null;
        const syncTargetTimeId = targetTod ? `sync-meal-${targetTod}-time` : null;

        if (syncTargetId && syncTargetTimeId) {
          // Find non-pending instances from the old item
          const oldInstances = todayInstances.filter(
            i => i.carePlanItemId === item.id && i.status !== 'pending'
          );
          // Check if sync target already has an instance for today
          const syncAlreadyHasInstance = todayInstances.some(i => i.carePlanItemId === syncTargetId);

          if (oldInstances.length > 0 && !syncAlreadyHasInstance) {
            // Migrate: remap the first completed instance to the sync item
            const migrated = oldInstances.map(inst => ({
              ...inst,
              carePlanItemId: syncTargetId,
              windowId: syncTargetTimeId,
            }));
            await upsertDailyInstances(patientId, today, migrated);
            devLog('[syncOtherBucketsWithConfig] Migrated', migrated.length, 'instance(s) from', item.id, 'to', syncTargetId);
          }
        }

        devLog('[syncOtherBucketsWithConfig] Deactivating non-sync meal item:', item.id);
        await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
        changed = true;
      }
    }

    if (mealsEnabled) {
      const mealTimesOfDay = mealsConfig.timesOfDay || ['morning', 'midday', 'evening'];

      const mealNames: Record<string, string> = {
        morning: 'Breakfast',
        midday: 'Lunch',
        evening: 'Dinner',
        night: 'Evening snack',
      };

      // Reactivate/deactivate existing sync-meal items based on configured times
      for (const item of syncMealItems) {
        const itemTod = item.id.replace('sync-meal-', '');
        const shouldBeActive = mealTimesOfDay.includes(itemTod as TimeOfDay);
        if (shouldBeActive && !item.active) {
          devLog('[syncOtherBucketsWithConfig] Reactivating meal:', item.name);
          await upsertCarePlanItem({ ...item, active: true, updatedAt: now });
          changed = true;
        } else if (!shouldBeActive && item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }

      // Create sync-meal items for any configured times that don't have one yet
      for (const tod of mealTimesOfDay) {
        if (!syncMealItems.some(i => i.id === `sync-meal-${tod}`)) {
          const mealItem: CarePlanItem = {
            id: `sync-meal-${tod}`,
            carePlanId,
            type: 'nutrition',
            name: mealNames[tod] || 'Meal',
            priority: mealsConfig.priority || 'recommended',
            active: true,
            schedule: {
              frequency: 'daily',
              times: [{
                id: `sync-meal-${tod}-time`,
                kind: 'exact' as const,
                label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
                at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '12:00',
              }],
            },
            emoji: tod === 'morning' ? '🍳' : tod === 'midday' ? '🥗' : '🍽️',
            createdAt: now,
            updatedAt: now,
          };
          devLog('[syncOtherBucketsWithConfig] Creating meal CarePlanItem:', mealItem.name);
          await upsertCarePlanItem(mealItem);
          changed = true;
        }
      }
    } else if (!mealsEnabled) {
      // Deactivate all sync meal items
      for (const item of syncMealItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== WELLNESS SYNC =====
    // Wellness is always-on — not gated by bucket enabled flag
    const existingWellnessItems = allItems.filter(i => i.type === 'wellness');
    if (existingWellnessItems.length === 0) {
      // Create "Morning wellness check" item
      const morningItem: CarePlanItem = {
        id: 'sync-wellness-morning',
        carePlanId,
        type: 'wellness',
        name: 'Morning wellness check',
        priority: 'recommended',
        active: true,
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'sync-wellness-morning-time',
            kind: 'exact' as const,
            label: 'morning',
            at: '07:00',
          }],
        },
        emoji: '🌅',
        createdAt: now,
        updatedAt: now,
      };

      // Create "Evening wellness check" item
      const eveningItem: CarePlanItem = {
        id: 'sync-wellness-evening',
        carePlanId,
        type: 'wellness',
        name: 'Evening wellness check',
        priority: 'recommended',
        active: true,
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'sync-wellness-evening-time',
            kind: 'exact' as const,
            label: 'evening',
            at: '20:00',
          }],
        },
        emoji: '🌙',
        createdAt: now,
        updatedAt: now,
      };

      // Create "Afternoon wellness check" item
      const afternoonItem: CarePlanItem = {
        id: 'sync-wellness-afternoon',
        carePlanId,
        type: 'wellness',
        name: 'Afternoon wellness check',
        priority: 'recommended',
        active: true,
        schedule: {
          frequency: 'daily',
          times: [{
            id: 'sync-wellness-afternoon-time',
            kind: 'exact' as const,
            label: 'afternoon',
            at: '13:00',
          }],
        },
        emoji: '☀️',
        createdAt: now,
        updatedAt: now,
      };

      devLog('[syncOtherBucketsWithConfig] Creating wellness CarePlanItems (morning + afternoon + evening)');
      await upsertCarePlanItem(morningItem);
      await upsertCarePlanItem(afternoonItem);
      await upsertCarePlanItem(eveningItem);
      changed = true;
    } else {
      // Migrate existing items from old names to standardized "wellness check" naming
      for (const item of existingWellnessItems) {
        const oldName = item.name.toLowerCase();
        let newName: string | null = null;
        if (oldName === 'morning check-in') newName = 'Morning wellness check';
        else if (oldName === 'evening check-in') newName = 'Evening wellness check';
        if (newName && item.name !== newName) {
          await upsertCarePlanItem({ ...item, name: newName, updatedAt: now });
          changed = true;
        }
      }

      // Migration: add afternoon wellness check for existing users who only have morning + evening
      const hasAfternoon = existingWellnessItems.some(i => i.id === 'sync-wellness-afternoon');
      if (!hasAfternoon) {
        const afternoonItem: CarePlanItem = {
          id: 'sync-wellness-afternoon',
          carePlanId,
          type: 'wellness',
          name: 'Afternoon wellness check',
          priority: 'recommended',
          active: true,
          schedule: {
            frequency: 'daily',
            times: [{
              id: 'sync-wellness-afternoon-time',
              kind: 'exact' as const,
              label: 'afternoon',
              at: '13:00',
            }],
          },
          emoji: '☀️',
          createdAt: now,
          updatedAt: now,
        };
        devLog('[syncOtherBucketsWithConfig] Migration: adding afternoon wellness check');
        await upsertCarePlanItem(afternoonItem);
        changed = true;
      }
    }

  } catch (error) {
    logError('carePlanGenerator.syncOtherBucketsWithConfig', error);
  }
  return changed;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Ensure daily instances exist for a given date
 * This is the main entry point - call on app launch, tab focus, date change
 *
 * Algorithm:
 * 1. Fetch active care plan + active items
 * 2. Fetch existing instances for date
 * 3. For each item, compute required instances based on schedule
 * 4. Create new instances only if they don't exist
 * 5. Mark missed instances (past window + grace period)
 * 6. Return all instances sorted by time
 */
// Flag to ensure duplicate cleanup only runs once per app session
let duplicateCleanupCompleted = false;

export async function ensureDailyInstances(
  patientId: string = DEFAULT_PATIENT_ID,
  date: string
): Promise<DailyCareInstance[]> {
  // 1. Get active care plan
  const carePlan = await getActiveCarePlan(patientId);
  if (!carePlan) {
    return [];
  }

  // 1.4 One-time cleanup of duplicate items (runs once per app session)
  if (!duplicateCleanupCompleted) {
    duplicateCleanupCompleted = true;
    const cleanup = await cleanupDuplicateCarePlanItems(patientId);
    if (cleanup.removedCount > 0) {
      devLog(`[ensureDailyInstances] Cleaned up ${cleanup.removedCount} duplicate items`);
    }
  }

  // 1.5 Sync medication items with CarePlanConfig
  // This ensures items match what user has configured in the bucket system
  const medsChanged = await syncMedicationItemsWithConfig(carePlan.id, patientId);
  const bucketsChanged = await syncOtherBucketsWithConfig(carePlan.id, patientId);

  // 1.6 If sync changed items, re-run dedup to catch any newly created duplicates
  if (medsChanged) {
    const postSyncCleanup = await cleanupDuplicateCarePlanItems(patientId);
    if (postSyncCleanup.removedCount > 0) {
      devLog(`[ensureDailyInstances] Post-sync cleanup removed ${postSyncCleanup.removedCount} duplicates`);
    }
  }

  // 2. Get active items (after sync to reflect current config)
  const items = await listCarePlanItems(carePlan.id, { activeOnly: true });
  if (items.length === 0) {
    return [];
  }

  // 3. Get existing instances for this date
  const existingInstances = await listDailyInstances(patientId, date);
  const existingMap = new Map<string, DailyCareInstance>();
  for (const instance of existingInstances) {
    // Key by itemId + windowId to detect duplicates
    const key = `${instance.carePlanItemId}:${instance.windowId}`;
    existingMap.set(key, instance);
  }

  // 4. Generate instances for each item
  const newInstances: DailyCareInstance[] = [];
  const now = new Date();

  for (const item of items) {
    // Check if this item should have instances on this date
    if (!shouldGenerateOnDate(item, date)) {
      continue;
    }

    // Generate instance for each time window
    for (const timeWindow of item.schedule.times) {
      const key = `${item.id}:${timeWindow.id}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Instance exists - check if we need to mark it as missed
        if (existing.status === 'pending' && !existing.logId) {
          const instanceTime = parseScheduledTime(existing.scheduledTime, date);
          const endTime = getWindowEndTime(timeWindow, date);

          // Check if past grace period
          const graceEnd = new Date(endTime.getTime() + MISSED_GRACE_PERIOD_MINUTES * 60 * 1000);
          if (now > graceEnd) {
            await updateDailyInstanceStatus(patientId, date, existing.id, 'missed');
          }
        }
      } else {
        // Create new instance
        const scheduledTime = computeScheduledTime(timeWindow, date);
        const instance = createInstance(item, carePlan, timeWindow, date, scheduledTime);
        newInstances.push(instance);
      }
    }
  }

  // 5. Save new instances
  if (newInstances.length > 0) {
    await upsertDailyInstances(patientId, date, newInstances);
  }

  // 6. Build set of valid item IDs and remove stale instances from storage
  const validItemIds = new Set(items.map(item => item.id));
  await removeStaleInstances(patientId, date, validItemIds);

  // 6.5 Reschedule notifications if items changed (AFTER instances exist)
  if (medsChanged || bucketsChanged) {
    try {
      const { rescheduleAllNotifications } = await import('../utils/notificationService');
      await rescheduleAllNotifications(patientId);
    } catch (error) {
      devLog('[ensureDailyInstances] Notification reschedule skipped:', error);
    }
  }

  // 7. Return all valid instances sorted by time
  const allInstances = await listDailyInstances(patientId, date);
  return allInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ============================================================================
// SCHEDULE MATCHING
// ============================================================================

/**
 * Check if an item should generate instances on a given date
 */
function shouldGenerateOnDate(item: CarePlanItem, date: string): boolean {
  const { frequency, daysOfWeek, skipDates } = item.schedule;

  // Check skip dates
  if (skipDates?.includes(date)) {
    return false;
  }

  // Check frequency rules
  switch (frequency) {
    case 'daily':
      return true;

    case 'weekly':
    case 'custom':
      if (!daysOfWeek || daysOfWeek.length === 0) {
        return true; // No restriction = all days
      }
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      return daysOfWeek.includes(dayOfWeek);

    default:
      return true;
  }
}

// ============================================================================
// TIME COMPUTATION
// ============================================================================

/**
 * Compute the scheduled time for an instance
 */
function computeScheduledTime(window: TimeWindow, date: string): string {
  if (window.kind === 'exact' && window.at) {
    return `${date}T${window.at}:00`;
  }

  // For window kind, use the start time
  const startTime = window.start || getDefaultWindowStart(window.label);
  return `${date}T${startTime}:00`;
}

/**
 * Get the end time for a window
 */
function getWindowEndTime(window: TimeWindow, date: string): Date {
  if (window.kind === 'exact' && window.at) {
    // For exact times, end is same as start
    return new Date(`${date}T${window.at}:00`);
  }

  const endTime = window.end || getDefaultWindowEnd(window.label);
  return new Date(`${date}T${endTime}:00`);
}

/**
 * Get default start time for a window label
 */
function getDefaultWindowStart(label: TimeWindowLabel): string {
  switch (label) {
    case 'morning': return DEFAULT_TIME_WINDOWS.morning.start;
    case 'afternoon': return DEFAULT_TIME_WINDOWS.afternoon.start;
    case 'evening': return DEFAULT_TIME_WINDOWS.evening.start;
    case 'night': return DEFAULT_TIME_WINDOWS.night.start;
    default: return '09:00';
  }
}

/**
 * Get default end time for a window label
 */
function getDefaultWindowEnd(label: TimeWindowLabel): string {
  switch (label) {
    case 'morning': return DEFAULT_TIME_WINDOWS.morning.end;
    case 'afternoon': return DEFAULT_TIME_WINDOWS.afternoon.end;
    case 'evening': return DEFAULT_TIME_WINDOWS.evening.end;
    case 'night': return DEFAULT_TIME_WINDOWS.night.end;
    default: return '17:00';
  }
}

/**
 * Parse a scheduled time string to Date
 */
function parseScheduledTime(scheduledTime: string, date: string): Date {
  if (scheduledTime.includes('T')) {
    return new Date(scheduledTime);
  }
  // Assume HH:mm format
  return new Date(`${date}T${scheduledTime}:00`);
}

// ============================================================================
// INSTANCE CREATION
// ============================================================================

/**
 * Create a new DailyCareInstance
 */
function createInstance(
  item: CarePlanItem,
  carePlan: CarePlan,
  window: TimeWindow,
  date: string,
  scheduledTime: string
): DailyCareInstance {
  const now = new Date().toISOString();

  return {
    id: generateUniqueId(),
    carePlanId: carePlan.id,
    carePlanItemId: item.id,
    patientId: carePlan.patientId,
    date,
    scheduledTime,
    windowLabel: window.label,
    windowId: window.id,
    status: 'pending',
    generatedFromVersion: carePlan.version,

    // Denormalized for display
    itemName: item.name,
    itemType: item.type,
    itemEmoji: item.emoji,
    priority: item.priority,
    instructions: item.instructions,
    itemDosage: item.medicationDetails?.dose, // For medications

    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a time is within a window
 */
export function isTimeInWindow(
  time: Date,
  window: TimeWindow,
  date: string
): boolean {
  if (window.kind === 'exact' && window.at) {
    const exactTime = new Date(`${date}T${window.at}:00`);
    // Within 30 minutes of exact time
    const diff = Math.abs(time.getTime() - exactTime.getTime());
    return diff <= 30 * 60 * 1000;
  }

  const start = window.start || getDefaultWindowStart(window.label);
  const end = window.end || getDefaultWindowEnd(window.label);

  const startTime = new Date(`${date}T${start}:00`);
  const endTime = new Date(`${date}T${end}:00`);

  return time >= startTime && time <= endTime;
}

/**
 * Get current window label based on time
 */
export function getCurrentWindowLabel(time: Date = new Date()): TimeWindowLabel {
  const hours = time.getHours();

  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 20) return 'evening';
  return 'night';
}

/**
 * Regenerate instances for today (force refresh)
 */
export async function regenerateTodayInstances(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<DailyCareInstance[]> {
  const today = getTodayDateString();
  return ensureDailyInstances(patientId, today);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate instances for multiple days (e.g., for calendar view)
 */
export async function ensureInstancesForDateRange(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, DailyCareInstance[]>> {
  const result = new Map<string, DailyCareInstance[]>();

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const instances = await ensureDailyInstances(patientId, dateStr);
    result.set(dateStr, instances);
  }

  return result;
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Remove duplicate CarePlanItems, keeping only the first of each type/name
 * Also clears today's instances so they regenerate correctly
 */
export async function cleanupDuplicateCarePlanItems(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<{ removedCount: number; types: string[] }> {
  const carePlan = await getActiveCarePlan(patientId);
  if (!carePlan) {
    return { removedCount: 0, types: [] };
  }

  const allItems = await listCarePlanItems(carePlan.id, { activeOnly: false });
  const seenByTypeAndName = new Map<string, CarePlanItem>();
  const duplicateIds: string[] = [];
  const affectedTypes: Set<string> = new Set();

  // For medications, also track by medicationId to catch duplicates with
  // slightly different names but the same underlying medication
  const seenByMedId = new Map<string, CarePlanItem>();

  // For each item, keep the first one and mark others as duplicates
  for (const item of allItems) {
    // Use type + name as key so items of the same type but different names
    // (e.g. Breakfast, Lunch, Dinner) are NOT treated as duplicates
    const key = `${item.type}:${item.name.toLowerCase()}`;

    if (seenByTypeAndName.has(key)) {
      // Exact name duplicate
      duplicateIds.push(item.id);
      affectedTypes.add(item.type);
    } else if (
      item.type === 'medication' &&
      item.medicationDetails?.medicationId &&
      seenByMedId.has(item.medicationDetails.medicationId)
    ) {
      // Same medication ID but different name (e.g. dosage changed) — duplicate
      duplicateIds.push(item.id);
      affectedTypes.add(item.type);
    } else {
      seenByTypeAndName.set(key, item);
      if (item.type === 'medication' && item.medicationDetails?.medicationId) {
        seenByMedId.set(item.medicationDetails.medicationId, item);
      }
    }
  }

  // Delete duplicates
  for (const id of duplicateIds) {
    await deleteCarePlanItem(carePlan.id, id);
  }

  // Clear today's instances so they regenerate from the cleaned-up items
  if (duplicateIds.length > 0) {
    const today = getTodayDateString();
    // Get remaining valid item IDs
    const remainingItems = await listCarePlanItems(carePlan.id, { activeOnly: true });
    const validItemIds = new Set(remainingItems.map(i => i.id));
    await removeStaleInstances(patientId, today, validItemIds);
  }

  devLog(`[cleanupDuplicateCarePlanItems] Removed ${duplicateIds.length} duplicates for types:`, Array.from(affectedTypes));

  return {
    removedCount: duplicateIds.length,
    types: Array.from(affectedTypes),
  };
}
