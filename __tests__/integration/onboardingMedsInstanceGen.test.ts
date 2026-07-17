// ============================================================================
// CHARACTERIZATION GUARD — onboarding → config → daily-instance for MEDS.
//
// This documents the exact load-bearing behavior the empty-meds discoverability
// affordance (components/now/AddMedicationsPrompt) exists for:
//
//   Onboarding's "Medications" checkbox (WatchingForScreen) enables the meds
//   bucket but collects NO drug names, so generateCarePlanFromOnboarding lands
//   config.meds.medications = []. Vitals, by contrast, lands USABLE
//   (vitalTypes = ['bp'] → a bucket-level "Check vitals" item), so vitals
//   generate a daily instance while meds generate none. That asymmetry is why
//   a caregiver who checks Medications finishes onboarding to a schedule with
//   no meds — the gap the affordance guides them out of.
//
// This is a TRIPWIRE: if someone later adds a real medication-entry step to
// onboarding (banked Option B), the "onboarding alone → med instances zero"
// assertion goes red and forces the question "is the affordance still needed?"
//
// It also proves the data path itself is correct (meds entered post-onboarding
// DO generate instances, in every ordering) — so the affordance is purely a
// discoverability fix, never a data repair.
//
// Standing round-trip pattern: exercise the REAL onboarding mapper → REAL
// storage → REAL generator, asserting on the DEVICE-FACING DailyCareInstance.
// Mocks only at the bottom-layer native modules (global in jest.setup.js).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateCarePlanFromOnboarding } from '../../utils/onboardingToPlan';
import {
  saveCarePlanConfig,
  addMedicationToPlan,
} from '../../storage/carePlanConfigRepo';
import {
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-07-17';

async function medInstances() {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
  return instances.filter((i) => i.itemType === 'medication');
}

async function vitalsInstances() {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
  return instances.filter((i) => i.itemType === 'vitals');
}

describe('onboarding (meds + vitals selected) → daily instances', () => {
  beforeEach(async () => {
    await clearAll();
  });

  // THE CHARACTERIZED GAP / TRIPWIRE: onboarding enables meds but collects no
  // drug names → zero med instances, while vitals lands usable. If onboarding
  // ever starts collecting meds (Option B), the meds assertion breaks — by
  // design, so the affordance's necessity is re-evaluated.
  it('onboarding alone → vitals instance exists, med instances are zero (the asymmetry)', async () => {
    const config = generateCarePlanFromOnboarding({
      relationship: 'parent',
      careAreas: ['medications', 'vitals'],
      concerns: [],
      cadence: 'morning_evening',
    });
    await saveCarePlanConfig(config);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    expect(await vitalsInstances()).toHaveLength(1);
    expect(await medInstances()).toHaveLength(0);
  });

  // The data path is correct: a med entered post-onboarding DOES generate an
  // instance. Proves the affordance is discoverability-only, not a data repair.
  it('onboarding (meds selected) + a medication entered → med daily-instance is generated', async () => {
    const config = generateCarePlanFromOnboarding({
      relationship: 'parent',
      careAreas: ['medications', 'vitals'],
      concerns: [],
      cadence: 'morning_evening',
    });
    await saveCarePlanConfig(config);

    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Lisinopril',
      dosage: '20mg',
      timesOfDay: ['morning'],
      customTimes: ['08:00'],
      scheduledTimeHHmm: '08:00',
      active: true,
    } as any);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const meds = await medInstances();
    expect(meds).toHaveLength(1);
    expect(meds[0].scheduledTime).toContain('08:00');
  });

  // Realistic ordering: the Now tab generates instances ONCE at onboarding
  // (meds empty → 0), and the med is added LATER. A second generation pass must
  // incorporate the new med into the already-generated date.
  it('med added AFTER first generation pass → second pass incorporates it into the same date', async () => {
    const config = generateCarePlanFromOnboarding({
      relationship: 'parent',
      careAreas: ['medications', 'vitals'],
      concerns: [],
      cadence: 'morning_evening',
    });
    await saveCarePlanConfig(config);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    expect(await medInstances()).toHaveLength(0);

    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Lisinopril',
      dosage: '20mg',
      timesOfDay: ['morning'],
      customTimes: ['08:00'],
      scheduledTimeHHmm: '08:00',
      active: true,
    } as any);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const meds = await medInstances();
    expect(meds).toHaveLength(1);
    expect(meds[0].scheduledTime).toContain('08:00');
  });
});
