// ============================================================================
// BLOCKER #2 — ONBOARDING/WIZARD GAP: wellness window selections never
// reach wellness.timesOfDay.
//
// F5.3 audit finding (banked): the setup wizard writes bucket `enabled`
// flags only. The confirm step renders ONE "Wellness" toggle wired to
// setBucketEnabled('wellness', next) — it never touches
// wellness.timesOfDay. Post-F5 the rest of the app (Care Plan
// management screen, the two check-in editors, the instance generator)
// treats Morning Check-in / Evening Check-in as MEMBERSHIP on
// wellness.timesOfDay with `enabled` in lockstep (Q-34.F5.B Option (b)
// lock). Consequences:
//
//   1. New users get seed/template timesOfDay regardless of any wizard
//      choice — "wizard ignores wellness time selections."
//   2. The wizard can write the ILLEGAL state enabled=false +
//      timesOfDay=['morning','evening']. The management screen's
//      handleToggleRow then resurrects BOTH windows when the user
//      re-enables just one (currentTimes still carries the stale
//      membership).
//   3. The wizard shows the retired single-wellness model, inconsistent
//      with the five-row model (Meds / Vitals / Morning Check-in /
//      Evening Check-in / Meals) the user sees minutes later.
//
// Contract pinned here (two layers):
//
//   REPO — setWellnessWindowEnabled(patientId, window, enabled):
//     shared membership-write helper, semantics identical to the
//     management screen's handleToggleRow and to the F5.3 round-trip
//     locks (wellnessSplitRoundTripF5_3.test.ts):
//       • enable  → window appended to timesOfDay (deduped)
//       • disable → window removed; other values untouched
//                   (hide-not-delete: legacy 'midday' survives)
//       • enabled flag in lockstep: true ⟺ timesOfDay non-empty
//
//   WIZARD (source-level, per wizardStepConfirm.test.tsx convention) —
//     confirm.tsx renders wellness as the two pseudo-rows and routes
//     their toggles through the shared helper; plain
//     setBucketEnabled('wellness', …) must no longer be reachable.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOrCreateCarePlanConfig,
  saveCarePlanConfig,
  setWellnessWindowEnabled,
} from '../../storage/carePlanConfigRepo';

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

const PATIENT_ID = 'default';
const CONFIRM_PATH = join(__dirname, '../../app/care-plan/setup/confirm.tsx');

describe('Repo — setWellnessWindowEnabled membership semantics', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('disabling morning removes only morning; evening survives; enabled stays true', async () => {
    await getOrCreateCarePlanConfig(PATIENT_ID); // seed: ['morning','evening']

    const next = await setWellnessWindowEnabled(PATIENT_ID, 'morning', false);

    expect(next.wellness.timesOfDay).toEqual(['evening']);
    expect(next.wellness.enabled).toBe(true);
  });

  it('disabling the last window leaves timesOfDay=[] and flips enabled false (rt-5 parity)', async () => {
    await getOrCreateCarePlanConfig(PATIENT_ID);

    await setWellnessWindowEnabled(PATIENT_ID, 'morning', false);
    const next = await setWellnessWindowEnabled(PATIENT_ID, 'evening', false);

    expect(next.wellness.timesOfDay).toEqual([]);
    expect(next.wellness.enabled).toBe(false);
  });

  it('re-enabling one window does NOT resurrect the other', async () => {
    await getOrCreateCarePlanConfig(PATIENT_ID);
    await setWellnessWindowEnabled(PATIENT_ID, 'morning', false);
    await setWellnessWindowEnabled(PATIENT_ID, 'evening', false);

    const next = await setWellnessWindowEnabled(PATIENT_ID, 'morning', true);

    expect(next.wellness.timesOfDay).toEqual(['morning']);
    expect(next.wellness.timesOfDay).not.toContain('evening');
    expect(next.wellness.enabled).toBe(true);
  });

  it('enable is idempotent — no duplicate membership', async () => {
    await getOrCreateCarePlanConfig(PATIENT_ID);

    const next = await setWellnessWindowEnabled(PATIENT_ID, 'morning', true);

    expect(
      next.wellness.timesOfDay.filter((t: string) => t === 'morning'),
    ).toHaveLength(1);
  });

  it('hide-not-delete — legacy midday value survives window toggles (rt-2 parity)', async () => {
    const cfg = await getOrCreateCarePlanConfig(PATIENT_ID);
    cfg.wellness.timesOfDay = ['morning', 'midday', 'evening'] as any;
    await saveCarePlanConfig(cfg);

    const next = await setWellnessWindowEnabled(PATIENT_ID, 'morning', false);

    expect(next.wellness.timesOfDay).toContain('midday');
    expect(next.wellness.timesOfDay).toContain('evening');
    expect(next.wellness.timesOfDay).not.toContain('morning');
  });
});

describe('Wizard confirm — wellness routes through window membership, not plain enabled', () => {
  const src = readFileSync(CONFIRM_PATH, 'utf8');

  it('renders Morning Check-in and Evening Check-in rows', () => {
    expect(src).toMatch(/wellness-morning/);
    expect(src).toMatch(/wellness-evening/);
    expect(src).toMatch(/Morning Check-in/i);
    expect(src).toMatch(/Evening Check-in/i);
  });

  it('wires wellness toggles to the shared membership helper', () => {
    expect(src).toMatch(/setWellnessWindowEnabled/);
  });

  it('does not render a single plain "wellness" bucket toggle', () => {
    // BUCKET_TYPES mapping must exclude wellness from the plain-toggle
    // rows; the pseudo-rows replace it.
    expect(src).toMatch(/filter\([^)]*'wellness'|!==\s*'wellness'|excludeWellness|type !== 'wellness'/);
  });
});
