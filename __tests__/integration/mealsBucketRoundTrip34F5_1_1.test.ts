// ============================================================================
// Phase 34 F5.1.1 — Meals bucket window-level cleanup FORWARD-GUARD.
//
// Meals are structurally DIFFERENT from vitals/wellness: each meal
// gets its own CarePlanItem (sync-meal-morning, sync-meal-midday,
// sync-meal-evening, sync-meal-night), not a single multi-window
// item. So when a meal chip is removed, the corresponding sync-meal
// ITEM is deactivated — the existing removeStaleInstances
// (storage/carePlanRepo.ts:325) item-level filter already cleans
// its instances. The window-level bug F5.1.1 fixes for vitals +
// wellness does NOT apply here today.
//
// This test is a FORWARD-GUARD: pin the device-facing layer for
// meals so a future refactor that consolidates meals into a single
// sync-meals item with schedule.times = [morning, midday, ...]
// would surface the same window-level bug if it lost the
// removeStaleWindowInstances cleanup. The contract assertion
// shape mirrors vitals/wellness verbatim so the class-of-bug guard
// reads consistently across buckets.
//
// STANDING PATTERN (locked elsewhere this session): REAL save/read
// primitives, no mocks on the pipeline.
//
// STANDING RULE SHARPENED (F5.1.1): assert on the device-facing
// DailyCareInstance layer, not the intermediate template.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCarePlanConfig,
  updateBucketConfig,
} from '../../storage/carePlanConfigRepo';
import {
  listDailyInstances,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-06-05';

async function seedMealsOnly(timesOfDay: ('morning' | 'midday' | 'evening' | 'night')[]) {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
    const bucket = (cfg as any)[k];
    if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'meals') {
      (bucket as any).enabled = false;
    }
  }
  cfg.meals = {
    ...cfg.meals,
    enabled: true,
    timesOfDay: timesOfDay as any,
  };
  await saveCarePlanConfig(cfg);
}

describe('Phase 34 F5.1.1 — Meals bucket window-level cleanup FORWARD-GUARD (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (REMOVE MEAL — DEVICE-FACING LAYER): removing a meal chip → pending DailyCareInstance for that meal no longer surfaces from listDailyInstances', async () => {
    // Class-of-bug guard. Meals achieves the cleanup via item-level
    // removeStaleInstances (sync-meal-X item deactivates → its
    // instance drops out via validItemIds filter); vitals/wellness
    // achieve it via the new window-level removeStaleWindowInstances
    // pass. Different paths, same device-facing contract.
    await seedMealsOnly(['morning', 'midday', 'evening']);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      const meals = inst.filter((i) => i.itemType === 'nutrition');
      expect(meals.length).toBeGreaterThanOrEqual(3);
    }

    // Caregiver removes Lunch (internal 'midday').
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'meals', {
      timesOfDay: ['morning', 'evening'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const meals = inst.filter((i) => i.itemType === 'nutrition');
    // The midday meal instance must no longer surface.
    const middayMeal = meals.find(
      (i) => i.carePlanItemId === 'sync-meal-midday',
    );
    expect(middayMeal).toBeUndefined();
    // Morning + evening still present (sanity).
    expect(
      meals.find((i) => i.carePlanItemId === 'sync-meal-morning'),
    ).toBeDefined();
    expect(
      meals.find((i) => i.carePlanItemId === 'sync-meal-evening'),
    ).toBeDefined();
  });

  it('rt-2 (AUDIT-TRAIL PRESERVATION): a COMPLETED meal for a removed window survives the schedule change', async () => {
    // Same hide-not-delete contract as vitals/wellness. The fact
    // that meals achieves cleanup via item-level removal (rather
    // than the new window-level pass) MUST NOT mean completed
    // meals get dropped. Verifies the item-level path also
    // preserves logged-action history.
    await seedMealsOnly(['morning', 'midday', 'evening']);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const before = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const middayInst = before.find(
      (i) => i.itemType === 'nutrition' && i.carePlanItemId === 'sync-meal-midday',
    );
    expect(middayInst).toBeDefined();
    await updateDailyInstanceStatus(
      DEFAULT_PATIENT_ID,
      DATE,
      middayInst!.id,
      'completed',
    );

    // Caregiver removes Lunch from the chip set.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'meals', {
      timesOfDay: ['morning', 'evening'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const after = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const completedMidday = after.find(
      (i) => i.itemType === 'nutrition' && i.carePlanItemId === 'sync-meal-midday',
    );
    expect(completedMidday).toBeDefined();
    expect(completedMidday!.status).toBe('completed');
    // The completed instance is not tombstoned via deactivatedAt
    // — caregiver action history is preserved verbatim.
    expect(completedMidday!.deactivatedAt).toBeUndefined();
  });
});
