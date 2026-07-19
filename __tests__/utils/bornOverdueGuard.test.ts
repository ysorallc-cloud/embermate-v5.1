// ============================================================================
// Born-overdue guard — a med the caregiver JUST added must not be born overdue.
//
// At generation, ensureDailyInstances skips creating a TODAY instance for a dose
// time that had already passed when the item was ADDED (item.createdAt >
// scheduledTime). A med added this afternoon doesn't "miss" its morning dose —
// it didn't exist yet; its schedule starts at the next occurrence. Scoped to
// today, and item.createdAt is the real add-time (inherited from the config med)
// so backdated/existing meds still generate their (possibly-missed) doses.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addMedicationToPlan,
  getMedicationsFromPlan,
} from '../../storage/carePlanConfigRepo';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig, type VitalsBucketConfig, type CarePlanConfig } from '../../types/carePlanConfig';
import { seedDeviceState } from '../integration/_helpers/seedDeviceState';
import type { CarePlanItem } from '../../types/carePlan';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}
async function medInstances(date: string) {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, date)).filter((i) => i.itemType === 'medication');
}
async function vitalsInstances(date: string) {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, date)).filter((i) => i.itemType === 'vitals');
}

/** Vitals-only enabled config so ensureDailyInstances keeps the sync-vitals item
 *  active (and doesn't deactivate it for a disabled bucket). */
function vitalsOnlyConfig(): CarePlanConfig {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    const bucket = (cfg as any)[k];
    if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'vitals') {
      (bucket as any).enabled = false;
    }
  }
  cfg.vitals = { ...(cfg.vitals as VitalsBucketConfig), enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] };
  return cfg;
}

// Dose times ~60min before / after now (clamped into the day) so the born-past
// vs upcoming distinction is deterministic regardless of when the test runs.
function hhmm(totalMin: number): string {
  const clamped = Math.max(1, Math.min(1438, totalMin));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}
const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
const PAST = hhmm(nowMin - 60);
const FUTURE = hhmm(nowMin + 60);

const TODAY = getTodayDateString();

describe('born-overdue guard — a just-added med is not born overdue', () => {
  beforeEach(async () => { await clearAll(); });

  it('a med added AFTER its dose time today → NO today instance (not born overdue), but it IS saved', async () => {
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Lisinopril', dosage: '10mg', timesOfDay: ['morning'],
      customTimes: [PAST], scheduledTimeHHmm: PAST, active: true,
    } as any);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    expect(await medInstances(TODAY)).toHaveLength(0); // born-past slot skipped today
    // The med is still on the plan (it appears at its next occurrence).
    expect((await getMedicationsFromPlan(DEFAULT_PATIENT_ID)).some((m) => m.name === 'Lisinopril')).toBe(true);
  });

  it('a med whose dose is still ahead today → today instance IS created (upcoming)', async () => {
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['evening'],
      customTimes: [FUTURE], scheduledTimeHHmm: FUTURE, active: true,
    } as any);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const insts = await medInstances(TODAY);
    expect(insts).toHaveLength(1);
    expect(insts[0].itemName).toContain('Warfarin');
  });

  // Existing/backdated meds (created before their dose time) still generate their
  // passed doses — that's the genuine-miss case, covered by the sample-data
  // generation suite (backdated sample meds continue to seed today's schedule).
});

// VITALS get the SAME skip-and-preview rule as meds (FIX A). upsertCarePlanItem
// stamps createdAt=now for a new item, so — exactly like the meds cases above —
// we offset the vitals WINDOW time (PAST/FUTURE relative to now) to make the
// born-past distinction deterministic. A non-'sync-vitals' id keeps the sync
// reconcile from rewriting our custom time back to the 08:00 bucket default.
function customVitalsItem(at: string): CarePlanItem {
  return {
    id: 'test-vitals', // NOT 'sync-vitals' → sync leaves the custom time untouched
    carePlanId: 'placeholder',
    type: 'vitals',
    name: 'Check vitals',
    priority: 'recommended',
    active: true,
    schedule: { frequency: 'daily', times: [{ id: 'test-vitals-time', kind: 'exact', label: 'morning', at }] },
    vitalsDetails: { vitalTypes: ['bp'] },
    emoji: '📊',
    createdAt: `${TODAY}T00:00:00`, // ignored by upsert (stamped = now)
    updatedAt: `${TODAY}T00:00:00`,
  };
}

describe('born-overdue guard — vitals get skip-and-preview like meds', () => {
  beforeEach(async () => { await clearAll(); });

  it('a vitals check whose time had passed at setup → NO today instance (not born overdue)', async () => {
    await seedDeviceState({ config: vitalsOnlyConfig(), date: TODAY, items: [customVitalsItem(PAST)] });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    // createdAt (now) > scheduled (now-60min) → born-past slot skipped today.
    expect(await vitalsInstances(TODAY)).toHaveLength(0);
  });

  it('a vitals check whose time is still ahead today → today instance IS created (regression)', async () => {
    await seedDeviceState({ config: vitalsOnlyConfig(), date: TODAY, items: [customVitalsItem(FUTURE)] });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    // createdAt (now) < scheduled (now+60min) → genuine upcoming reading, instance generates.
    expect(await vitalsInstances(TODAY)).toHaveLength(1);
  });
});
