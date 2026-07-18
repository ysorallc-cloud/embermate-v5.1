// ============================================================================
// Piece 2 (Shape 1) — medication-confirm custom-add → medication-form.
//
// A custom med added from the log screen must become a proper SCHEDULED regimen
// med (config.meds.medications → generates daily instances) AND the dose the
// caregiver was logging must be recorded (marked taken + med-log entry). This
// exercises the shipped helper (createScheduledMedAndLogDose) that medication-
// form's save calls in the logDose path, against REAL storage (global native
// mocks only), asserting BOTH halves + the duplicate guard.
//
// RED before the helper exists (module-not-found); GREEN after.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScheduledMedAndLogDose } from '../../utils/medDoseLog';
import {
  saveCarePlanConfig,
  getMedicationsFromPlan,
} from '../../storage/carePlanConfigRepo';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { getMedicationLogs } from '../../utils/centralStorage';
import {
  createDefaultCarePlanConfig,
  type MedsBucketConfig,
  type MedicationPlanItem,
} from '../../types/carePlanConfig';
import type { Medication } from '../../utils/medicationStorage';

const DATE = '2026-07-18';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

/** meds-enabled config with an empty medication list (post-onboarding state). */
async function seedMedsEnabledEmpty(existing: MedicationPlanItem[] = []): Promise<void> {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  (cfg.meds as MedsBucketConfig).enabled = true;
  (cfg.meds as MedsBucketConfig).medications = existing;
  await saveCarePlanConfig(cfg);
}

function planMed(name: string, dosage: string): Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    dosage,
    timesOfDay: ['morning'],
    customTimes: ['08:00'],
    scheduledTimeHHmm: '08:00',
    active: true,
  };
}

function legacyMed(name: string, dosage: string): Omit<Medication, 'id' | 'createdAt'> {
  return {
    name,
    dosage,
    time: '8:00 AM',
    timeSlot: 'morning',
    notes: '',
    active: true,
    taken: false,
  };
}

async function medInstances() {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
  return instances.filter((i) => i.itemType === 'medication');
}

describe('Piece 2 — custom med from confirm→form becomes scheduled AND logs the dose', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('BOTH halves: (a) scheduled config med → daily instance, (b) dose logged/marked taken', async () => {
    await seedMedsEnabledEmpty();

    await createScheduledMedAndLogDose(planMed('Ibuprofen', '200mg'), legacyMed('Ibuprofen', '200mg'));

    // (a) It is now a scheduled regimen med that generates a daily instance.
    const meds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
    expect(meds.some((m) => m.name === 'Ibuprofen')).toBe(true);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const insts = await medInstances();
    expect(insts.length).toBe(1);
    expect(insts[0].itemName).toContain('Ibuprofen');

    // (b) The dose the caregiver was logging is recorded.
    const logs = await getMedicationLogs(DEFAULT_PATIENT_ID);
    expect(logs.length).toBe(1);
  });

  it('duplicate guard: a med already in config is NOT added twice (no doubled daily instance)', async () => {
    const now = new Date('2026-07-18T00:00:00Z').toISOString();
    await seedMedsEnabledEmpty([
      {
        id: 'existing-ibu',
        name: 'Ibuprofen',
        dosage: '200mg',
        timesOfDay: ['morning'],
        customTimes: ['08:00'],
        scheduledTimeHHmm: '08:00',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await createScheduledMedAndLogDose(planMed('Ibuprofen', '200mg'), legacyMed('Ibuprofen', '200mg'));

    // Still exactly one Ibuprofen in config — no second scheduled med.
    const meds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
    expect(meds.filter((m) => m.name === 'Ibuprofen')).toHaveLength(1);

    // And exactly one daily instance for it.
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const insts = await medInstances();
    expect(insts.filter((i) => i.itemName.includes('Ibuprofen'))).toHaveLength(1);

    // The dose is still logged.
    const logs = await getMedicationLogs(DEFAULT_PATIENT_ID);
    expect(logs.length).toBe(1);
  });
});
