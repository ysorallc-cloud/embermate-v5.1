// ============================================================================
// Onboarding med-step (enrichment Piece 2) — the entered meds must land in
// config.meds.medications via the CANONICAL path (addMedicationToPlan) and
// generate real daily instances, identically to a Care Plan add. Skipping
// writes nothing.
//
// writeOnboardingMedications is a thin mapper (EnteredMed → addMedicationToPlan
// payload) over the existing canonical write — NOT a new write path.
// RED before the helper exists; GREEN after.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { writeOnboardingMedications } from '../../utils/onboardingMedsWriter';
import { getMedicationsFromPlan } from '../../storage/carePlanConfigRepo';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';

const DATE = '2026-07-18';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}
async function medInstances() {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
  return instances.filter((i) => i.itemType === 'medication');
}

describe('writeOnboardingMedications — canonical write + instance generation', () => {
  beforeEach(async () => { await clearAll(); });

  it('two entered meds → config.meds.medications has both AND they generate daily instances', async () => {
    const written = await writeOnboardingMedications([
      { name: 'Lisinopril', dose: '10mg', timeSlot: 'morning' },
      { name: 'Warfarin', dose: '5mg', timeSlot: 'evening' },
    ]);
    expect(written).toBe(2);

    const meds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
    expect(meds.map((m) => m.name).sort()).toEqual(['Lisinopril', 'Warfarin']);
    // The meds bucket auto-enables via addMedicationToPlan.
    expect(meds.every((m) => m.active)).toBe(true);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const insts = await medInstances();
    expect(insts).toHaveLength(2);
    expect(insts.map((i) => i.itemName).some((n) => n.includes('Lisinopril'))).toBe(true);
  });

  it('a free-text (unknown) med still writes + schedules', async () => {
    await writeOnboardingMedications([{ name: 'Eliquis', dose: '5mg', timeSlot: 'morning' }]);
    const meds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
    expect(meds.some((m) => m.name === 'Eliquis')).toBe(true);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    expect((await medInstances()).some((i) => i.itemName.includes('Eliquis'))).toBe(true);
  });

  it('SKIP (empty list) → config.meds.medications stays empty, no instances', async () => {
    const written = await writeOnboardingMedications([]);
    expect(written).toBe(0);
    expect(await getMedicationsFromPlan(DEFAULT_PATIENT_ID)).toHaveLength(0);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    expect(await medInstances()).toHaveLength(0);
  });

  it('a nameless entry is never written', async () => {
    const written = await writeOnboardingMedications([
      { name: '   ', dose: '5mg', timeSlot: 'morning' },
      { name: 'Metformin', dose: '500mg', timeSlot: 'morning' },
    ]);
    expect(written).toBe(1);
    expect((await getMedicationsFromPlan(DEFAULT_PATIENT_ID)).map((m) => m.name)).toEqual(['Metformin']);
  });
});
