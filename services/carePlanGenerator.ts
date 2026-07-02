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
  removeStaleWindowInstances,
  upsertCarePlanItem,
  deleteCarePlanItem,
  createCarePlan,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import { getCarePlanConfig } from '../storage/carePlanConfigRepo';
import { hasAnyEnabledBucket } from '../types/carePlanConfig';
import {
  MedsBucketConfig,
  MedicationPlanItem,
  TimeOfDay,
  VitalsBucketConfig,
  MealsBucketConfig,
  BucketConfig,
  CarePlanConfig,
  VITAL_TYPE_OPTIONS,
  TIME_OF_DAY_DEFAULTS,
  MVP_HIDDEN_BUCKETS,
} from '../types/carePlanConfig';
import { generateUniqueId } from '../utils/idGenerator';
import { safeGetItem } from '../utils/safeStorage';
import { DEFAULT_NOTIFICATION_CONFIG } from '../utils/notificationDefaults';
import type { NotificationConfig } from '../types/notifications';
import type { WellnessSettings } from '../types/wellnessSettings';
import {
  DEFAULT_WELLNESS_SETTINGS,
  WINDOW_LABEL_TO_WELLNESS_PERIOD,
} from '../types/wellnessSettings';
import { StorageKeys } from '../utils/storageKeys';

// Phase 34 NOT.B3 — wellness fire-time resolver. Single source of
// truth used at all three wellness sync sites (Pass B sync-wellness
// reconcile, Pass B legacy reconcile, Pass C fresh-state creation),
// mirroring the F1 "single source of truth" de-dup pattern (TIME_OF_DAY
// _DEFAULTS itself was de-duped that way).
//
// Composes TIME_OF_DAY_TO_WINDOW → WINDOW_LABEL_TO_WELLNESS_PERIOD →
// wellnessSettings.{period}.time. Q-34.NOT.B.2 lock — only morning /
// afternoon (= midday) / evening have a period mapping; night and
// custom fall back to TIME_OF_DAY_DEFAULTS (no caregiver toggle =
// no caregiver-editable time, but the item still needs a display time
// — don't crash, don't invent one).
function resolveWellnessTime(
  tod: TimeOfDay,
  wellnessSettings: WellnessSettings,
): string {
  const windowLabel = TIME_OF_DAY_TO_WINDOW[tod];
  const period = WINDOW_LABEL_TO_WELLNESS_PERIOD[windowLabel];
  if (period) {
    const periodSettings = wellnessSettings[period];
    if (periodSettings?.time) {
      return periodSettings.time;
    }
  }
  return TIME_OF_DAY_DEFAULTS[tod] || '08:00';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Grace period in minutes before marking as missed (after the window END).
// Exported so the shared status helper (utils/careItemStatus.ts) derives the
// SAME windowed boundary live — no parallel threshold.
export const MISSED_GRACE_PERIOD_MINUTES = 120; // 2 hours

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

// Phase 34 F1 — TIME_OF_DAY_DEFAULTS de-duplication. Single source of
// truth lives in types/carePlanConfig.ts; the generator imports it
// instead of declaring a parallel const. Pre-F1 the local copy carried
// a drifted `custom: '12:00'` value; canonical is `custom: ''` which
// preserves the `|| customTimes[i] || TIME_OF_DAY_DEFAULTS[tod]`
// fall-through chain in the `at:` field assembly (the empty string
// short-circuits to the next fallback rather than locking the time
// to noon).

// Phase 34 NOT.A1 — per-med notification wiring. Closes gap C of the
// three reminder write-without-consequence gaps the slice targets.
// Q-34.NOT.A.1 (a) lock: honor stored timing values. F6's master-toggle-
// only UI implicitly produces 'at_time' via the medication default,
// not via hard-coding. NotificationConfig.followUp is set from the
// medication default; the scheduler does NOT yet read followUp (banked
// as project_notification_latent_traps trap 5 — feature decision, not
// closed by this slice).
function buildMedicationNotificationConfig(
  configMed: MedicationPlanItem
): NotificationConfig {
  const defaults = DEFAULT_NOTIFICATION_CONFIG.medication;
  const timing = configMed.reminderTiming ?? defaults.timing;
  const config: NotificationConfig = {
    enabled: configMed.notificationsEnabled ?? defaults.enabled,
    timing,
    followUp: defaults.followUp,
  };
  if (timing === 'custom' && configMed.reminderCustomMinutes !== undefined) {
    config.customMinutesBefore = configMed.reminderCustomMinutes;
  }
  return config;
}

function notificationConfigEquals(
  a: NotificationConfig | undefined,
  b: NotificationConfig
): boolean {
  if (!a) return false;
  return (
    a.enabled === b.enabled &&
    a.timing === b.timing &&
    a.customMinutesBefore === b.customMinutesBefore &&
    a.followUp?.enabled === b.followUp?.enabled &&
    a.followUp?.intervalMinutes === b.followUp?.intervalMinutes &&
    a.followUp?.maxAttempts === b.followUp?.maxAttempts
  );
}

// Phase 34 NOT.A2 — predicate for "should this med save trigger a
// reschedule of the OS notification queue?". Used by medication-form's
// handleSave to avoid thrashing the queue on non-notification edits
// (rename, dosage change). before=null is add mode (always true; new
// med means a new instance to schedule). For edit mode, folds both
// sides through buildMedicationNotificationConfig so legacy meds (no
// reminder fields) compare equal to explicit-default-set meds, per
// Q-34.NOT.A.1 (a) honor-stored-values lock + defaults-fold.
export function medicationNotificationChanged(
  before: MedicationPlanItem | null,
  after: MedicationPlanItem
): boolean {
  if (!before) return true;
  const beforeConfig = buildMedicationNotificationConfig(before);
  const afterConfig = buildMedicationNotificationConfig(after);
  return !notificationConfigEquals(beforeConfig, afterConfig);
}

/**
 * Create a CarePlanItem from a MedicationPlanItem
 */
// Shared med time-window resolver — the single derivation used by BOTH the
// fresh-create path and the matched-edit reconciliation, so a med's time
// (custom scheduledTimeHHmm / customTimes, else the timesOfDay default) is
// mapped one way and the two paths can't drift. When existingTimes is passed
// (the edit path), window ids are reused positionally so the DailyCareInstance
// re-bakes its scheduledTime (carePlanGenerator re-bake path) rather than
// thrashing a fresh windowId.
function buildMedTimeWindows(
  configMed: MedicationPlanItem,
  existingTimes?: TimeWindow[]
): TimeWindow[] {
  const times: TimeWindow[] = configMed.timesOfDay.map((tod, index) => ({
    id: existingTimes?.[index]?.id ?? generateUniqueId(),
    kind: 'exact' as const,
    label: TIME_OF_DAY_TO_WINDOW[tod],
    at: configMed.scheduledTimeHHmm || configMed.customTimes?.[index] || TIME_OF_DAY_DEFAULTS[tod],
  }));

  // If no times specified, default to morning
  if (times.length === 0) {
    times.push({
      id: existingTimes?.[0]?.id ?? generateUniqueId(),
      kind: 'exact',
      label: 'morning',
      at: '08:00',
    });
  }

  return times;
}

function createCarePlanItemFromConfigMed(
  configMed: MedicationPlanItem,
  carePlanId: string
): CarePlanItem {
  const now = new Date().toISOString();

  // Build time windows from timesOfDay (shared resolver — see buildMedTimeWindows)
  const times = buildMedTimeWindows(configMed);

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
    notification: buildMedicationNotificationConfig(configMed),
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

    // Also check by base medication name (without dosage) to catch mismatches
    const existingByBaseName = new Map<string, CarePlanItem>();
    for (const item of medicationItems) {
      const baseName = item.name.split(/\s+\d/)[0].toLowerCase().trim();
      if (!existingByBaseName.has(baseName)) {
        existingByBaseName.set(baseName, item);
      }
    }

    // 1. CREATE: Add CarePlanItems for config medications that don't have items
    for (const configMed of activeConfigMeds) {
      // Match by medicationId (most reliable)
      const matchById = existingByMedId.get(configMed.id);
      // Match by exact composed name ("Name Dosage")
      const composedName = `${configMed.name} ${configMed.dosage}`.trim().toLowerCase();
      const matchByName = existingByName.get(composedName);
      // Match by base medication name
      const configBaseName = configMed.name.toLowerCase().trim();
      const matchByBaseName = existingByBaseName.get(configBaseName);

      const matched = matchById || matchByName || matchByBaseName;

      if (matched) {
        // Phase 34 NOT.A1 — propagate notification-config changes too.
        // Pre-NOT.A1 this branch only reactivated inactive items; toggling
        // notificationsEnabled / reminderTiming on the config side never
        // reached the existing CarePlanItem the scheduler reads. Load-
        // bearing for the "I toggled it but nothing changed" trust class.
        const freshNotification = buildMedicationNotificationConfig(configMed);
        const notificationChanged = !notificationConfigEquals(
          matched.notification,
          freshNotification,
        );
        const activeChanged = matched.active === false;

        // Reconcile schedule.times so a TIME edit (custom or preset) on an
        // existing med actually re-times the CarePlanItem the scheduler reads.
        // Pre-fix this branch propagated only notification + active and spread
        // `...matched`, PRESERVING the stale schedule.times — the "custom time
        // doesn't apply / overdue can't be forced" bug (Jul 2 brief item 2).
        // Mirrors the vitals (F5.1, L370+) and wellness (F5.3, L678+) Pass-B
        // reconciliation; meds ("F5.4") were the last bucket without it.
        const expectedTimes = buildMedTimeWindows(configMed, matched.schedule?.times);
        const currentTimes = matched.schedule?.times ?? [];
        const timesChanged =
          currentTimes.length !== expectedTimes.length ||
          expectedTimes.some(
            (et, i) => currentTimes[i]?.label !== et.label || currentTimes[i]?.at !== et.at,
          );

        if (notificationChanged || activeChanged || timesChanged) {
          if (activeChanged) {
            devLog('[syncMedicationItemsWithConfig] Reactivating inactive medication item:', matched.name);
          }
          if (notificationChanged) {
            devLog('[syncMedicationItemsWithConfig] Updating notification config for:', matched.name);
          }
          if (timesChanged) {
            devLog('[syncMedicationItemsWithConfig] Reconciling schedule.times for:', matched.name);
          }
          await upsertCarePlanItem({
            ...matched,
            active: true,
            notification: freshNotification,
            schedule: timesChanged
              ? { ...matched.schedule, frequency: 'daily', times: expectedTimes }
              : matched.schedule,
          });
          changed = true;
        }
        continue;
      }

      const newItem = createCarePlanItemFromConfigMed(configMed, carePlanId);
      devLog('[syncMedicationItemsWithConfig] Creating CarePlanItem for config med:', configMed.name);
      await upsertCarePlanItem(newItem);
      changed = true;
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
export async function syncOtherBucketsWithConfig(
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
    // Phase 34 F5.1 — symmetric with the wellness sync below (Pass B
    // reconciliation pattern at L561-632). Pre-F5.1 vitals only had
    // a fresh-state branch + reactivate / deactivate (no schedule.times
    // reconciliation). With the F5.1 When chip set writing
    // vitalsConfig.timesOfDay, the gap would have surfaced as a
    // "control doesn't control" bug — pinned by
    // __tests__/integration/vitalsBucketRoundTrip34F5_1.test.ts rt-3/4/5.
    const vitalsConfig = config.vitals as VitalsBucketConfig;
    const vitalsEnabled = vitalsConfig?.enabled && vitalsConfig.vitalTypes?.length > 0;
    // F5.1 — lift timesOfDay derivation to the top so Pass A + Pass B
    // share the same fallback (preserves the `|| ['morning']`
    // contract at rt-6).
    const vitalsTimesOfDay = vitalsConfig?.timesOfDay || ['morning'];

    // Deactivate stale sample-vitals items so sync items take over.
    const sampleVitalsItems = allItems.filter(i => i.type === 'vitals' && i.id.startsWith('sample-'));
    for (const item of sampleVitalsItems) {
      if (item.active) {
        devLog('[syncOtherBucketsWithConfig] Deactivating stale sample vitals item:', item.id);
        await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
        changed = true;
      }
    }
    const existingVitalsItems = allItems.filter(i => i.type === 'vitals' && !i.id.startsWith('sample-'));

    // Pass A — reconciliation pass for the consolidated 'sync-vitals'
    // item. Atomically reactivate-or-deactivate AND reconcile
    // schedule.times based on vitalsTimesOfDay membership. Mirrors
    // wellness's Pass B at L561-590. Closes the F5.1-surfaced
    // "control doesn't control" gap.
    //
    //   targetActive = vitalsEnabled && vitalsTimesOfDay.length > 0
    //
    //   • bucket disabled OR vitalTypes empty → vitalsEnabled false → deactivate
    //   • timesOfDay empty                    → no windows to schedule → deactivate
    //   • else → reactivate (if needed) + reconcile schedule.times to
    //     the canonical shape derived from timesOfDay via the shared
    //     resolver (TIME_OF_DAY_TO_WINDOW + TIME_OF_DAY_DEFAULTS).
    //
    // Non-canonical id forms (future renamed items) → leave untouched.
    // No silent misroute; the future maintainer who adds an alternate
    // id form must explicitly extend this block.
    for (const item of existingVitalsItems) {
      if (item.id === 'sync-vitals') {
        const targetActive = vitalsEnabled && vitalsTimesOfDay.length > 0;
        const expectedTimes: TimeWindow[] = vitalsTimesOfDay.map((tod: TimeOfDay) => ({
          id: `sync-vitals-${tod}-time`,
          kind: 'exact' as const,
          label: TIME_OF_DAY_TO_WINDOW[tod],
          at: TIME_OF_DAY_DEFAULTS[tod] || '08:00',
        }));
        const currentTimes = item.schedule?.times ?? [];
        const sameShape = currentTimes.length === expectedTimes.length &&
          expectedTimes.every((et: TimeWindow) =>
            currentTimes.some((ct: TimeWindow) =>
              ct.label === et.label && ct.at === et.at));
        if (item.active !== targetActive || (targetActive && !sameShape)) {
          devLog('[syncOtherBucketsWithConfig] Reconciling vitals item:', item.id);
          await upsertCarePlanItem({
            ...item,
            active: targetActive,
            schedule: { ...item.schedule, frequency: 'daily', times: expectedTimes },
            updatedAt: now,
          });
          changed = true;
        }
        continue;
      }
      // Unknown id form — leave untouched.
    }

    // Pass B — fresh-state creation. Only when ZERO vitals items
    // exist at all AND the bucket is enabled with a non-empty
    // timesOfDay. Existing fresh-state behavior preserved verbatim.
    if (vitalsEnabled && existingVitalsItems.length === 0 && vitalsTimesOfDay.length > 0) {
      const times: TimeWindow[] = vitalsTimesOfDay.map(tod => ({
        id: `sync-vitals-${tod}-time`,
        kind: 'exact' as const,
        label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
        at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '08:00',
      }));

      const vitalsItem: CarePlanItem = {
        id: 'sync-vitals',
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
    }

    // ===== MOOD SYNC =====
    // Mood check-ins are now captured within wellness checks (morning + evening).
    // Deactivate any existing standalone mood items.
    const existingMoodItems = allItems.filter(i => i.type === 'mood');
    for (const item of existingMoodItems) {
      if (item.active) {
        await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
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

    // Helper: map a nutrition item to a time-of-day based on name or schedule label
    const nutritionItemTod = (item: CarePlanItem): string | null => {
      const itemName = item.name?.toLowerCase() || '';
      if (itemName.includes('breakfast')) return 'morning';
      if (itemName.includes('lunch')) return 'midday';
      if (itemName.includes('dinner') || itemName.includes('supper')) return 'evening';
      if (itemName.includes('snack')) return 'night';
      const label = item.schedule?.times?.[0]?.label;
      if (label === 'morning') return 'morning';
      if (label === 'afternoon') return 'midday';
      if (label === 'evening') return 'evening';
      if (label === 'night') return 'night';
      return null;
    };

    const configuredMealTods = new Set(
      mealsEnabled ? (mealsConfig.timesOfDay || ['morning', 'midday', 'evening']) : []
    );
    for (const item of nonSyncMealItems) {
      // If meals are enabled and this item matches a configured slot,
      // reactivate (if inactive) and preserve it — do not deactivate.
      if (mealsEnabled) {
        const tod = nutritionItemTod(item);
        if (tod && configuredMealTods.has(tod as TimeOfDay)) {
          if (!item.active) {
            devLog('[syncOtherBucketsWithConfig] Reactivating non-sync meal item:', item.name);
            await upsertCarePlanItem({ ...item, active: true, updatedAt: now });
            changed = true;
          }
          continue;
        }
      }
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
    // Wellness is normally always-on, but respects an explicit disable in config
    // (primarily so tests / callers can opt out when not using wellness at all).
    const wellnessConfig = (config as any).wellness;
    const wellnessEnabled = wellnessConfig ? wellnessConfig.enabled !== false : true;
    // Phase 34 NOT.B3 — load wellnessSettings once for the resolver
    // used at the three sync sites + the instance-refresh path below.
    // Falls back to DEFAULT_WELLNESS_SETTINGS for first-launch users
    // who haven't touched the drawer yet (defaults have all three
    // periods with sensible times).
    const wellnessSettings = await safeGetItem<WellnessSettings>(
      StorageKeys.WELLNESS_SETTINGS,
      DEFAULT_WELLNESS_SETTINGS,
    );
    // First, deactivate stale sample-wellness items so sync items take over
    const sampleWellnessItems = allItems.filter(i => i.type === 'wellness' && i.id.startsWith('sample-'));
    for (const item of sampleWellnessItems) {
      if (item.active) {
        devLog('[syncOtherBucketsWithConfig] Deactivating stale sample wellness item:', item.id);
        await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
        changed = true;
      }
    }
    const existingWellnessItems = allItems.filter(i => i.type === 'wellness' && !i.id.startsWith('sample-'));
    if (!wellnessEnabled) {
      // Bucket OFF — deactivate all wellness items (hide-not-delete).
      for (const item of existingWellnessItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    } else {
      // Bucket ON — Phase 34 F3 unified reconciliation pass.
      //
      // Replaces the pre-F3 four-branch ladder (deactivate /
      // F2.1-reactivate-only / F2-fresh-create / migration-block).
      // Every existing wellness item routes through the shared
      // resolver (TIME_OF_DAY_TO_WINDOW + TIME_OF_DAY_DEFAULTS) +
      // checked against carePlanConfig.wellness.timesOfDay:
      //   • TimeOfDay in user's selection → reactivate +
      //     reconcile schedule.times to canonical (resolves the
      //     legacy-times artifact F2.1 flagged where pre-F2 items
      //     reactivated at OLD 07:00/13:00/20:00 stored times).
      //   • TimeOfDay NOT in user's selection → deactivate
      //     (hide-not-delete; the force-add-afternoon bypass that
      //     was the F3-bound exception in F1 contract 6).
      //   • Unknown id-suffix (future renamed/added id form) →
      //     LEFT UNTOUCHED. The bridge map below returns null for
      //     unknown keys; no silent default-to-morning misroute.
      //
      // The id-suffix bridge below is PARSE-ONLY — it reads
      // legacy ids to derive their TimeOfDay. No write path
      // creates a new per-period legacy-form id post-F3; the
      // fresh-state branch below writes only the consolidated
      // 'sync-wellness' id. Pinned by F3 contract 9 + 10.
      const wellnessTimesOfDay =
        wellnessConfig?.timesOfDay ?? ['morning', 'midday', 'evening'];

      // Legacy id-suffix → TimeOfDay. Bridges the pre-F2 ids
      // (which were named after the TimeWindowLabel like 'afternoon')
      // back to the TimeOfDay storage key (e.g. 'midday') that the
      // shared resolver consumes. Returns undefined for unknown
      // suffixes — caller treats that as "leave untouched."
      const ID_SUFFIX_TO_TOD: Record<string, TimeOfDay> = {
        morning: 'morning',
        afternoon: 'midday',
        evening: 'evening',
      };

      // Pass A — legacy name migration ("morning check-in" → "Morning
      // wellness check"). Preserved for very-old devices; touches
      // name strings only, not TimeWindowLabel literals (outside
      // F1 contract 6's scope).
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

      // Pass B — reconciliation pass. Per-item: reactivate +
      // canonical-time-reconcile OR deactivate based on
      // timesOfDay membership.
      for (const item of existingWellnessItems) {
        if (item.id === 'sync-wellness') {
          // Post-F2 consolidated item — reconcile its schedule.times
          // to match current timesOfDay via the shared resolver.
          const targetActive = wellnessTimesOfDay.length > 0;
          const expectedTimes: TimeWindow[] = wellnessTimesOfDay.map((tod: TimeOfDay) => ({
            id: `sync-wellness-${tod}-time`,
            kind: 'exact' as const,
            label: TIME_OF_DAY_TO_WINDOW[tod],
            // Phase 34 NOT.B3 — Pass B sync-wellness reconcile.
            at: resolveWellnessTime(tod, wellnessSettings),
          }));
          const currentTimes = item.schedule?.times ?? [];
          const sameShape = currentTimes.length === expectedTimes.length &&
            expectedTimes.every((et: TimeWindow) =>
              currentTimes.some((ct: TimeWindow) =>
                ct.label === et.label && ct.at === et.at));
          if (item.active !== targetActive || (targetActive && !sameShape)) {
            await upsertCarePlanItem({
              ...item,
              active: targetActive,
              schedule: { ...item.schedule, frequency: 'daily', times: expectedTimes },
              updatedAt: now,
            });
            changed = true;
          }
          continue;
        }

        // Legacy per-period item — derive TimeOfDay from id-suffix.
        const suffix = item.id.replace(/^sync-wellness-/, '');
        const todForItem = ID_SUFFIX_TO_TOD[suffix];
        if (!todForItem) {
          // Unknown id-suffix (future renamed/added form). Leave
          // untouched — no silent misroute. The future maintainer
          // who adds a new suffix must explicitly extend the map.
          continue;
        }

        const inSelection = wellnessTimesOfDay.includes(todForItem);
        if (inSelection) {
          const canonicalTime: TimeWindow = {
            id: `${item.id}-time`,
            kind: 'exact' as const,
            label: TIME_OF_DAY_TO_WINDOW[todForItem],
            // Phase 34 NOT.B3 — Pass B legacy per-period reconcile.
            at: resolveWellnessTime(todForItem, wellnessSettings),
          };
          const currentTime = item.schedule?.times?.[0];
          const drifted = !currentTime ||
            currentTime.label !== canonicalTime.label ||
            currentTime.at !== canonicalTime.at;
          if (!item.active || drifted) {
            devLog('[syncOtherBucketsWithConfig] Reconciling wellness item:', item.id);
            await upsertCarePlanItem({
              ...item,
              active: true,
              schedule: { ...item.schedule, frequency: 'daily', times: [canonicalTime] },
              updatedAt: now,
            });
            changed = true;
          }
        } else {
          // Not in user's selection — deactivate (hide-not-delete).
          if (item.active) {
            devLog('[syncOtherBucketsWithConfig] Deactivating out-of-selection wellness item:', item.id);
            await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
            changed = true;
          }
        }
      }

      // Pass C — fresh-state creation (F2 path). Only fires when
      // ZERO wellness items exist at all. ONE consolidated
      // CarePlanItem with N times, routed through the shared
      // resolver, id 'sync-wellness'. Empty timesOfDay = explicit
      // user "no wellness windows" → no instance created.
      if (existingWellnessItems.length === 0 && wellnessTimesOfDay.length > 0) {
        const times: TimeWindow[] = wellnessTimesOfDay.map((tod: TimeOfDay) => ({
          id: `sync-wellness-${tod}-time`,
          kind: 'exact' as const,
          label: TIME_OF_DAY_TO_WINDOW[tod],
          // Phase 34 NOT.B3 — Pass C fresh-state creation.
          at: resolveWellnessTime(tod, wellnessSettings),
        }));
        const wellnessItem: CarePlanItem = {
          id: 'sync-wellness',
          carePlanId,
          type: 'wellness',
          name: 'Wellness check',
          priority: wellnessConfig?.priority || 'recommended',
          active: true,
          schedule: { frequency: 'daily', times },
          emoji: '🌅',
          createdAt: now,
          updatedAt: now,
        };
        devLog(
          '[syncOtherBucketsWithConfig] Creating wellness CarePlanItem from timesOfDay:',
          wellnessTimesOfDay.join(', '),
        );
        await upsertCarePlanItem(wellnessItem);
        changed = true;
      }
    }

    // ===== SLEEP SYNC =====
    // Phase 5.13.3 — single sync item per bucket, mirrors the vitals
    // pattern. Sleep is new and has no legacy non-sync items, so the
    // logic is the simpler reactivate / create / deactivate triad.
    const sleepConfig = (config as any).sleep as BucketConfig | undefined;
    // Phase 34 F4 — gate generation on the v1-hidden set. A hidden
    // bucket with config.enabled=true (existing user) reads as NOT
    // enabled here, so the deactivate branch fires (items preserved,
    // active:false). config.enabled itself is untouched. v1.1 unhide
    // → this gate opens → the F2.1 reactivation branch resurrects.
    const sleepEnabled = sleepConfig?.enabled === true && !MVP_HIDDEN_BUCKETS.includes('sleep');
    const existingSleepItems = allItems.filter(i => i.type === 'sleep');
    const hasActiveSleepItem = existingSleepItems.some(i => i.active);

    if (sleepEnabled && existingSleepItems.length > 0 && !hasActiveSleepItem) {
      for (const item of existingSleepItems) {
        if (!item.active) {
          devLog('[syncOtherBucketsWithConfig] Reactivating sleep item:', item.id);
          await upsertCarePlanItem({ ...item, active: true, updatedAt: now });
          changed = true;
        }
      }
    } else if (sleepEnabled && existingSleepItems.length === 0) {
      const sleepTimesOfDay = sleepConfig?.timesOfDay || ['morning'];
      const times: TimeWindow[] = sleepTimesOfDay.map(tod => ({
        id: `sync-sleep-${tod}-time`,
        kind: 'exact' as const,
        label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
        at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '08:00',
      }));

      const sleepItem: CarePlanItem = {
        id: 'sync-sleep',
        carePlanId,
        type: 'sleep',
        name: 'Log sleep',
        priority: sleepConfig?.priority || 'recommended',
        active: true,
        schedule: { frequency: 'daily', times },
        emoji: '😴',
        createdAt: now,
        updatedAt: now,
      };

      devLog('[syncOtherBucketsWithConfig] Creating sleep CarePlanItem');
      await upsertCarePlanItem(sleepItem);
      changed = true;
    } else if (!sleepEnabled && hasActiveSleepItem) {
      for (const item of existingSleepItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== HYDRATION SYNC =====
    // Phase 11.9.2 — water bucket previously had no sync case here,
    // so even with water.enabled === true no CarePlanItem of type
    // 'hydration' was ever created. Insights kept surfacing
    // "Hydration · 14 days missing" because the historical seed
    // loop never saw a hydration instance to write a payload to.
    // Mirrors the sleep block: reactivate / create / deactivate
    // triad. Bucket key is 'water' on CarePlanConfig; CarePlanItem
    // type is 'hydration' (matching LogEntryData.type and the
    // aggregator's data?.type === 'hydration' check).
    const waterConfig = (config as any).water as BucketConfig | undefined;
    // Phase 34 F4 — v1-hidden gate (see sleep block above).
    const waterEnabled = waterConfig?.enabled === true && !MVP_HIDDEN_BUCKETS.includes('water');
    const existingHydrationItems = allItems.filter(i => i.type === 'hydration');
    const hasActiveHydrationItem = existingHydrationItems.some(i => i.active);

    if (waterEnabled && existingHydrationItems.length > 0 && !hasActiveHydrationItem) {
      for (const item of existingHydrationItems) {
        if (!item.active) {
          devLog('[syncOtherBucketsWithConfig] Reactivating hydration item:', item.id);
          await upsertCarePlanItem({ ...item, active: true, updatedAt: now });
          changed = true;
        }
      }
    } else if (waterEnabled && existingHydrationItems.length === 0) {
      const waterTimesOfDay = waterConfig?.timesOfDay || ['midday'];
      const times: TimeWindow[] = waterTimesOfDay.map(tod => ({
        id: `sync-hydration-${tod}-time`,
        kind: 'exact' as const,
        label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
        at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '12:00',
      }));

      const hydrationItem: CarePlanItem = {
        id: 'sync-hydration',
        carePlanId,
        type: 'hydration',
        name: 'Log water',
        priority: waterConfig?.priority || 'recommended',
        active: true,
        schedule: { frequency: 'daily', times },
        emoji: '💧',
        createdAt: now,
        updatedAt: now,
      };

      devLog('[syncOtherBucketsWithConfig] Creating hydration CarePlanItem');
      await upsertCarePlanItem(hydrationItem);
      changed = true;
    } else if (!waterEnabled && hasActiveHydrationItem) {
      for (const item of existingHydrationItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== ACTIVITY SYNC =====
    const activityConfig = (config as any).activity as BucketConfig | undefined;
    // Phase 34 F4 — v1-hidden gate (see sleep block above).
    const activityEnabled = activityConfig?.enabled === true && !MVP_HIDDEN_BUCKETS.includes('activity');
    const existingActivityItems = allItems.filter(i => i.type === 'activity');
    const hasActiveActivityItem = existingActivityItems.some(i => i.active);

    if (activityEnabled && existingActivityItems.length > 0 && !hasActiveActivityItem) {
      for (const item of existingActivityItems) {
        if (!item.active) {
          devLog('[syncOtherBucketsWithConfig] Reactivating activity item:', item.id);
          await upsertCarePlanItem({ ...item, active: true, updatedAt: now });
          changed = true;
        }
      }
    } else if (activityEnabled && existingActivityItems.length === 0) {
      const activityTimesOfDay = activityConfig?.timesOfDay || ['evening'];
      const times: TimeWindow[] = activityTimesOfDay.map(tod => ({
        id: `sync-activity-${tod}-time`,
        kind: 'exact' as const,
        label: TIME_OF_DAY_TO_WINDOW[tod as TimeOfDay],
        at: TIME_OF_DAY_DEFAULTS[tod as TimeOfDay] || '18:00',
      }));

      const activityItem: CarePlanItem = {
        id: 'sync-activity',
        carePlanId,
        type: 'activity',
        name: 'Log activity',
        priority: activityConfig?.priority || 'recommended',
        active: true,
        schedule: { frequency: 'daily', times },
        emoji: '🚶',
        createdAt: now,
        updatedAt: now,
      };

      devLog('[syncOtherBucketsWithConfig] Creating activity CarePlanItem');
      await upsertCarePlanItem(activityItem);
      changed = true;
    } else if (!activityEnabled && hasActiveActivityItem) {
      for (const item of existingActivityItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== ERRANDS SYNC =====
    const errandsEnabled = (config as any).errands?.enabled;
    const existingErrandItems = allItems.filter(i => i.type === 'errand');

    if (errandsEnabled) {
      // Load errand config items from storage
      const errandConfigs = await safeGetItem<any[]>('@embermate_errands_config', []);
      for (const ec of errandConfigs) {
        const syncId = `sync-errand-${ec.id}`;
        if (!existingErrandItems.some(i => i.id === syncId)) {
          const todLabel = ec.timeOfDay || 'morning';
          const errandItem: CarePlanItem = {
            id: syncId,
            carePlanId,
            type: 'errand' as any,
            name: ec.name,
            priority: 'optional',
            active: true,
            schedule: {
              frequency: ec.frequency === 'daily' ? 'daily' : 'daily',
              times: [{
                id: `${syncId}-time`,
                kind: 'exact' as const,
                label: TIME_OF_DAY_TO_WINDOW[todLabel as TimeOfDay] || 'morning',
                at: TIME_OF_DAY_DEFAULTS[todLabel as TimeOfDay] || '09:00',
              }],
            },
            emoji: '📋',
            createdAt: now,
            updatedAt: now,
          };
          devLog('[syncOtherBucketsWithConfig] Creating errand CarePlanItem:', errandItem.name);
          await upsertCarePlanItem(errandItem);
          changed = true;
        }
      }
    } else {
      for (const item of existingErrandItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== SHIFTS SYNC =====
    const shiftsEnabled = (config as any).shifts?.enabled;
    const existingShiftItems = allItems.filter(i => i.type === 'shift');

    if (shiftsEnabled) {
      const shiftConfigs = await safeGetItem<any[]>('@embermate_shifts_config', []);
      for (const sc of shiftConfigs) {
        const syncId = `sync-shift-${sc.id}`;
        if (!existingShiftItems.some(i => i.id === syncId)) {
          const shiftItem: CarePlanItem = {
            id: syncId,
            carePlanId,
            type: 'shift' as any,
            name: `${sc.caregiverName}'s shift`,
            instructions: `${sc.startTime} – ${sc.endTime}`,
            priority: 'recommended',
            active: true,
            schedule: {
              frequency: 'daily',
              times: [{
                id: `${syncId}-time`,
                kind: 'exact' as const,
                label: 'morning',
                at: sc.startTime || '08:00',
              }],
            },
            emoji: '🔄',
            createdAt: now,
            updatedAt: now,
          };
          devLog('[syncOtherBucketsWithConfig] Creating shift CarePlanItem:', shiftItem.name);
          await upsertCarePlanItem(shiftItem);
          changed = true;
        }
      }
    } else {
      for (const item of existingShiftItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
      }
    }

    // ===== SELF-CARE SYNC =====
    const selfCareEnabled = (config as any).self_care?.enabled;
    const existingSelfCareItems = allItems.filter(i => i.type === 'self_care');

    if (selfCareEnabled) {
      const selfCareConfigs = await safeGetItem<any[]>('@embermate_self_care_config', []);
      for (const sc of selfCareConfigs) {
        const syncId = `sync-selfcare-${sc.id}`;
        if (!existingSelfCareItems.some(i => i.id === syncId)) {
          const todLabel = sc.timeOfDay || 'afternoon';
          const scItem: CarePlanItem = {
            id: syncId,
            carePlanId,
            type: 'self_care' as any,
            name: sc.name,
            priority: 'optional',
            active: true,
            schedule: {
              frequency: 'daily',
              times: [{
                id: `${syncId}-time`,
                kind: 'exact' as const,
                label: TIME_OF_DAY_TO_WINDOW[todLabel as TimeOfDay] || 'afternoon',
                at: TIME_OF_DAY_DEFAULTS[todLabel as TimeOfDay] || '14:00',
              }],
            },
            emoji: '💛',
            createdAt: now,
            updatedAt: now,
          };
          devLog('[syncOtherBucketsWithConfig] Creating self-care CarePlanItem:', scItem.name);
          await upsertCarePlanItem(scItem);
          changed = true;
        }
      }
    } else {
      for (const item of existingSelfCareItems) {
        if (item.active) {
          await upsertCarePlanItem({ ...item, active: false, updatedAt: now });
          changed = true;
        }
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
// Concurrency guard — prevents two simultaneous calls from creating duplicate items.
// This is the root cause of the duplicate medication/meal/wellness issue: during
// onboarding, initializeSampleData calls ensureDailyInstances while the Now screen
// mounts and also calls it, creating a race where both see "no items" and both create.
let _ensureLock: Promise<DailyCareInstance[]> | null = null;

export async function ensureDailyInstances(
  patientId: string = DEFAULT_PATIENT_ID,
  date: string
): Promise<DailyCareInstance[]> {
  // Serialize calls — if one is in progress, wait for it then run ours.
  // This prevents the race condition where onboarding + Now screen both
  // call sync simultaneously, each seeing "no items" and creating duplicates.
  if (_ensureLock) {
    await _ensureLock;
  }
  const work = _ensureDailyInstancesCore(patientId, date);
  _ensureLock = work;
  try {
    return await work;
  } finally {
    _ensureLock = null;
  }
}

async function _ensureDailyInstancesCore(
  patientId: string,
  date: string
): Promise<DailyCareInstance[]> {
  // 1. Get active care plan — auto-create one if config exists with at least
  // one enabled bucket but no regimen has been provisioned yet. This keeps
  // the bucket-config UX decoupled from explicit regimen creation.
  let carePlan = await getActiveCarePlan(patientId);
  if (!carePlan) {
    const config = await getCarePlanConfig(patientId);
    if (!config || !hasAnyEnabledBucket(config)) {
      return [];
    }
    carePlan = await createCarePlan(patientId);
  }

  // 1.4 Pre-sync cleanup of duplicate items
  const preSyncCleanup = await cleanupDuplicateCarePlanItems(patientId);
  if (preSyncCleanup.removedCount > 0) {
    devLog(`[ensureDailyInstances] Pre-sync cleanup removed ${preSyncCleanup.removedCount} duplicate items`);
  }

  // 1.5 Sync medication items with CarePlanConfig
  // This ensures items match what user has configured in the bucket system
  const medsChanged = await syncMedicationItemsWithConfig(carePlan.id, patientId);
  const bucketsChanged = await syncOtherBucketsWithConfig(carePlan.id, patientId);

  // 1.6 ALWAYS run post-sync dedup — sync can create duplicates even when
  // it doesn't report changes (e.g. matching logic passes but a different
  // code path created items). This is the primary defense against duplicates.
  const postSyncCleanup = await cleanupDuplicateCarePlanItems(patientId);
  if (postSyncCleanup.removedCount > 0) {
    devLog(`[ensureDailyInstances] Post-sync cleanup removed ${postSyncCleanup.removedCount} duplicates`);
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
        // Phase 34 NOT.B3 — instance-time staleness refresh.
        // The existing-instance match keyed by ${itemId}:${windowId}
        // skips regeneration when windowId is unchanged. But when the
        // window's `at` changes (a wellnessSettings time edit, OR a
        // medication time edit reconciled by syncMedicationItemsWithConfig
        // — Jul 2 brief item 2), the instance's baked scheduledTime stays
        // stale and the scheduler / overdue logic fires at the old time.
        // Refresh wellness + medication instances (both edit their window
        // `at` in place, preserving windowId); vitals / meals change their
        // window SET (add/remove), handled by the stale-window pass below.
        // Only fires when the time actually drifted, to avoid spurious
        // writes (and the corresponding emit churn). Only refresh PENDING
        // instances; caregiver-acted statuses (completed/skipped/partial)
        // preserve the time they actually happened at.
        if (
          (item.type === 'wellness' || item.type === 'medication') &&
          existing.status === 'pending'
        ) {
          const freshScheduledTime = computeScheduledTime(timeWindow, date);
          if (existing.scheduledTime !== freshScheduledTime) {
            const refreshed: DailyCareInstance = {
              ...existing,
              scheduledTime: freshScheduledTime,
              updatedAt: new Date().toISOString(),
            };
            await upsertDailyInstances(patientId, date, [refreshed]);
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

  // 6.1 Phase 34 F5.1.1 — soft-deactivate stale-window instances.
  // For multi-window buckets (vitals + wellness + any future bucket
  // with ONE CarePlanItem holding multiple time windows), a chip
  // removed from the editor shrinks item.schedule.times. The
  // item-level removeStaleInstances pass above doesn't catch
  // instances whose windowId is no longer in their item's current
  // schedule (the item is still active — only one of its windows
  // is gone). F5.1's vitals chip set surfaced this latent class-of-
  // bug; F5.1.1 closes it for every multi-window bucket uniformly
  // at the generator layer. Hide-not-delete: only PENDING stale-
  // window instances are tombstoned; completed/skipped/missed
  // preserve caregiver action history regardless of schedule
  // changes. Pinned by vitalsBucketRoundTrip34F5_1 rt-4/rt-7 +
  // wellnessBucketRoundTrip34F5_1_1 rt-2/rt-3.
  const validWindowIdsByItem = new Map<string, Set<string>>();
  for (const item of items) {
    if (!item.schedule?.times) continue;
    validWindowIdsByItem.set(
      item.id,
      new Set(item.schedule.times.map((t) => t.id)),
    );
  }
  await removeStaleWindowInstances(patientId, date, validWindowIdsByItem);

  // 6.5 Reschedule notifications if items changed (AFTER instances exist)
  if (medsChanged || bucketsChanged) {
    try {
      const { rescheduleAllNotifications } = await import('../utils/notificationService');
      await rescheduleAllNotifications(patientId);
    } catch (error) {
      devLog('[ensureDailyInstances] Notification reschedule skipped:', error);
    }
  }

  // 7. Return all valid instances sorted by time, with final dedup safety net
  const allInstances = await listDailyInstances(patientId, date);
  
  // Instance-level dedup: if two instances share the same carePlanItemId + windowId,
  // keep only the first. This catches any duplication the item-level cleanup missed.
  const seenInstanceKeys = new Set<string>();
  const dedupedInstances = allInstances.filter(inst => {
    const key = `${inst.carePlanItemId}:${inst.windowId}`;
    if (seenInstanceKeys.has(key)) {
      devLog(`[ensureDailyInstances] Removing duplicate instance: ${inst.itemName} (${key})`);
      return false;
    }
    seenInstanceKeys.add(key);
    return true;
  });

  return dedupedInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
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
export function getDefaultWindowEnd(label: TimeWindowLabel): string {
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
    id: `inst-${date}-${item.id}-${window.id}`,
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
  return toLocalDateString(new Date());
}

/**
 * Format any Date as local-timezone YYYY-MM-DD
 * Use this instead of date.toISOString().split('T')[0] which returns UTC
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
