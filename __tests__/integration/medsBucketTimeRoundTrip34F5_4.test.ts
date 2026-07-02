// ============================================================================
// Item 2 (Jul 2 brief) — Meds bucket TIME write → generator reconcile →
// CarePlanItem schedule → DailyCareInstance INTEGRATION round-trip.
//
// BUG: setting a custom time on an EXISTING medication in the Care Plan
// med-edit form does not take effect — the daily instance keeps the med's
// original (preset) time, so an overdue state can't be forced at the custom
// time. Root cause: syncMedicationItemsWithConfig's matched (edit) branch
// (services/carePlanGenerator.ts) upserts only { active, notification } via
// `{ ...matched, ... }`, which PRESERVES the stale schedule.times. It never
// reconciles schedule.times[].at from the config med's scheduledTimeHHmm /
// customTimes. The CREATE path (createCarePlanItemFromConfigMed) already
// honors the custom time; only EDIT is broken.
//
// This is the same "control doesn't control" gap this file's own headers
// describe for vitals (F5.1) and wellness (F5.3) — both got a Pass-B
// schedule.times reconciliation; meds ("F5.4", named in the vitals test
// header) never did. This test is the meds analog.
//
// STANDING PATTERN (locked by vitalsBucketRoundTrip34F5_1 et al.): exercise
// the REAL write fn → REAL storage → REAL generator → REAL read round-trip,
// mocks ONLY at the bottom-layer native modules (already global in
// jest.setup.js). No mocks of getCarePlanConfig / updateMedicationInPlan /
// ensureDailyInstances / listCarePlanItems / listDailyInstances here.
//
// Assert on BOTH layers per [[feedback_roundtrip_assert_device_facing_layer]]:
//   (a) CarePlanItem.schedule.times[0].at  (template)
//   (b) DailyCareInstance.scheduledTime    (what Now/overdue actually reads)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCarePlanConfig,
  getCarePlanConfig,
  addMedicationToPlan,
  updateMedicationInPlan,
} from '../../storage/carePlanConfigRepo';
import {
  getActiveCarePlan,
  listCarePlanItems,
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig, type MedsBucketConfig } from '../../types/carePlanConfig';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-07-02';

/** Baseline care-plan config with only meds enabled (every other bucket
 *  disabled) so ensureDailyInstances' enabled-bucket gate fires solely on
 *  meds and no other item types pollute the instance list. */
async function seedMedsOnly(): Promise<void> {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
    const bucket = (cfg as any)[k];
    if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'meds') {
      (bucket as any).enabled = false;
    }
  }
  (cfg.meds as MedsBucketConfig).enabled = true;
  (cfg.meds as MedsBucketConfig).medications = [];
  await saveCarePlanConfig(cfg);
}

async function getMedItem() {
  const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
  if (!carePlan) return null;
  const items = await listCarePlanItems(carePlan.id, { activeOnly: false });
  return items.find((i) => i.type === 'medication' && !i.id.startsWith('sample-')) ?? null;
}

async function getMedInstances() {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
  return instances.filter((i) => i.itemType === 'medication');
}

describe('Item 2 — custom medication time persists through the generator to the daily instance', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CREATE honors custom time — control): a NEW med with scheduledTimeHHmm 08:37 schedules the instance at 08:37', async () => {
    await seedMedsOnly();
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Atorvastatin',
      dosage: '10mg',
      timesOfDay: ['morning'],
      customTimes: ['08:37'],
      scheduledTimeHHmm: '08:37',
      active: true,
    } as any);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getMedItem();
    expect(item).not.toBeNull();
    expect(item!.schedule!.times[0].at).toBe('08:37');

    const instances = await getMedInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].scheduledTime).toContain('08:37');
  });

  it('rt-2 (EDIT — THE BUG): changing an existing med from 08:00 to custom 08:37 re-times the daily instance', async () => {
    await seedMedsOnly();
    const med = await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Atorvastatin',
      dosage: '10mg',
      timesOfDay: ['morning'],
      customTimes: ['08:00'],
      scheduledTimeHHmm: '08:00',
      active: true,
    } as any);

    // First generation — instance exists at the original preset time.
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const item = await getMedItem();
      expect(item!.schedule!.times[0].at).toBe('08:00');
      const instances = await getMedInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].scheduledTime).toContain('08:00');
    }

    // Caregiver edits the med's time to a custom 08:37 (the med-edit form
    // writes scheduledTimeHHmm + customTimes via updateMedicationInPlan).
    await updateMedicationInPlan(DEFAULT_PATIENT_ID, med.id, {
      scheduledTimeHHmm: '08:37',
      customTimes: ['08:37'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Sanity: the config side persisted the custom value.
    const cfg = await getCarePlanConfig(DEFAULT_PATIENT_ID);
    expect((cfg!.meds as MedsBucketConfig).medications[0].scheduledTimeHHmm).toBe('08:37');

    // (a) Template layer — CarePlanItem schedule reconciled to the custom time.
    const item = await getMedItem();
    expect(item).not.toBeNull();
    expect(item!.schedule!.times[0].at).toBe('08:37');

    // (b) Device-facing layer — the daily instance the Now tab / overdue
    // logic reads is re-timed to 08:37 (and there is still exactly one).
    const instances = await getMedInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].scheduledTime).toContain('08:37');
    expect(instances[0].scheduledTime).not.toContain('08:00');
  });
});
