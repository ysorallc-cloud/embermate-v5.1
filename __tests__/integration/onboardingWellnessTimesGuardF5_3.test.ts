// ============================================================================
// F5.3 CHARACTERIZATION GUARD — onboarding → wellness.timesOfDay → instances.
//
// GREEN on the current tree by design. The original F5.3 gap ("the wizard
// writes careAreas but never wellness.timesOfDay → incomplete fresh-install
// plan") was CLOSED by the personalize work (c8c0bc0b / 03446784):
// generateCarePlanFromOnboarding now derives wellness.timesOfDay from the
// cadence and writes it in canonical shape. This is NOT a RED→GREEN bugfix —
// it LOCKS the full write→encrypt→read→render chain so a future edit can't
// silently re-drop the timing on the first screen (the end-to-end-validity rule).
//
// No mocks on the pipeline: generateCarePlanFromOnboarding → saveCarePlanConfig
// (encrypted store) → ensureDailyInstances (real sync + generate) →
// listDailyInstances (the device-facing layer Now/Care Plan read). Only the
// bottom-layer native modules (AsyncStorage / secure-store / crypto) are mocked
// globally by jest.setup.
//
// LIMITATION (banked, not tested here): onboarding hardcodes cadence
// 'morning_evening'; timing is never collected from the caregiver — only
// adjustable later via the wellness drawer. Accepted launch default.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateCarePlanFromOnboarding, type OnboardingAnswers } from '../../utils/onboardingToPlan';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { isSensitiveKey } from '../../utils/safeStorage';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length) await AsyncStorage.multiRemove(keys as string[]);
}

const WIZARD_ANSWERS: OnboardingAnswers = {
  relationship: 'parent',
  careAreas: ['medications', 'vitals', 'wellness'],
  concerns: [],
  cadence: 'morning_evening', // what the live wizard hardcodes (index.tsx)
};

/** windowLabel set of the wellness instances, sorted — the rendered shape. */
async function wellnessWindows(date: string): Promise<string[]> {
  const instances = await listDailyInstances(DEFAULT_PATIENT_ID, date);
  return instances
    .filter((i) => i.itemType === 'wellness')
    .map((i) => i.windowLabel as string)
    .sort();
}

describe('F5.3 guard — onboarding writes wellness.timesOfDay in canonical shape', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('config layer: generateCarePlanFromOnboarding writes canonical wellness.timesOfDay (TimeOfDay[])', () => {
    const config = generateCarePlanFromOnboarding(WIZARD_ANSWERS);
    expect(config.wellness.enabled).toBe(true);
    expect(config.wellness.timesOfDay).toEqual(['morning', 'evening']); // canonical TimeOfDay[], not a parallel shape
  });

  it('the care-plan-config key is sensitive-prefixed → persisted via the AES path (no plaintext)', () => {
    expect(isSensitiveKey('@embermate_careplan_config_v1:default')).toBe(true);
  });

  it('chain: wizard config → ensureDailyInstances → wellness instances render for BOTH windows', async () => {
    const today = getTodayDateString();
    await saveCarePlanConfig(generateCarePlanFromOnboarding(WIZARD_ANSWERS));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, today);

    const windows = await wellnessWindows(today);
    // The fresh-install plan is COMPLETE: both wellness windows materialize.
    expect(windows).toEqual(['evening', 'morning']);
  });

  it('onboarding ↔ editor parity: same wellness.timesOfDay → SAME wellness instances', async () => {
    const today = getTodayDateString();

    // Wizard path.
    await saveCarePlanConfig(generateCarePlanFromOnboarding(WIZARD_ANSWERS));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, today);
    const wizardWindows = await wellnessWindows(today);

    await clearAll();

    // Editor/default path: createDefaultCarePlanConfig seeds the same
    // wellness.timesOfDay (['morning','evening']) the drawer would hold.
    await saveCarePlanConfig(createDefaultCarePlanConfig('default'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, today);
    const editorWindows = await wellnessWindows(today);

    expect(wizardWindows).toEqual(editorWindows);
    expect(wizardWindows.length).toBeGreaterThan(0);
  });
});
