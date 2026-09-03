// ============================================================================
// NOT.B3 missed-clobber — banked at
//   memory/project_notb3_refresh_clobbers_missed.md
//
// THE BUG: ensureDailyInstances's per-window loop reads `existing` ONCE from
// the pre-pass existingMap, then runs TWO independent blocks against that
// same (never-mutated) in-memory snapshot:
//
//   1. Missed-check (carePlanGenerator.ts ~1298-1309): if existing.status
//      === 'pending' and now is past windowEnd+grace, WRITES 'missed' to
//      storage via updateDailyInstanceStatus. `existing` itself is not
//      updated — it still reads status:'pending' in memory for the rest of
//      this loop iteration.
//   2. Time-staleness refresh (~1310-1337, wellness/medication only): if
//      existing.status === 'pending' (the STALE in-memory value — still true
//      even though storage now says 'missed') and the item's schedule time
//      has drifted since the instance was created, spreads
//      `{ ...existing, scheduledTime: fresh, ... }` and upserts — writing the
//      stale 'pending' back over the 'missed' block 1 just persisted.
//
// TRIGGER: an instance that is BOTH (a) past its grace window — the missed-
// check fires — AND (b) has a scheduledTime that has drifted from the item's
// CURRENT window `at` — e.g. a wellnessSettings time edit reconciled by
// syncOtherBucketsWithConfig's Pass A/B BEFORE the per-window loop runs (same
// mechanism wellnessFireTimeNotB3.test.ts contract 6 exercises, but that test
// deliberately keeps the clock inside the window to stay focused on the
// staleness-refresh behavior alone — see its own comment on why. Here we
// deliberately push the clock past grace too, to land both blocks in the
// same pass).
//
// A genuinely missed item silently reverting to pending is bad PERSISTED
// STATE (not a display bug) — it would resurrect on the Now screen as
// actionable, drop off the "missed" audit trail, and re-arm notifications
// against a moment that already passed.
// ============================================================================

import {
  ensureDailyInstances,
} from '../../services/carePlanGenerator';
import { listDailyInstances, upsertDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { addMedicationToPlan, updateMedicationInPlan } from '../../storage/carePlanConfigRepo';
import { safeSetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import {
  seedDeviceState,
  makeWellnessItem,
  makeVitalsItem,
} from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';
import type { CarePlanItem, DailyCareInstance } from '../../types/carePlan';

const DATE = '2026-06-29';
const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00`);

function useControlledClock() {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: [
        'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance',
      ],
    });
  });
  afterEach(() => { jest.useRealTimers(); });
}

function configWithWellnessMorning(): CarePlanConfig {
  const base = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  return {
    ...base,
    wellness: { ...base.wellness, enabled: true, timesOfDay: ['morning'] as any },
  };
}

async function setWellnessMorningTime(time: string) {
  await safeSetItem(StorageKeys.WELLNESS_SETTINGS, {
    morning: { enabled: true, time, checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
    afternoon: { enabled: true, time: '13:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
    evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
  });
}

async function readInstance(id: string): Promise<DailyCareInstance | undefined> {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.id === id);
}

describe('NOT.B3 — refresh must not clobber a same-pass missed-mark back to pending', () => {
  useControlledClock();

  it('wellness: instance is past grace (windowEnd 10:00 + 120min = 12:00) AND its scheduledTime has drifted from the reconciled item time → ends the pass MISSED, not pending', async () => {
    // Item seeded with the OLD time (08:00, makeWellnessItem's default).
    // wellnessSettings carries a DIFFERENT time (09:00) — syncOtherBucketsWithConfig's
    // Pass A reconciles the item's schedule.times[...].at to 09:00 BEFORE the
    // per-window loop runs, so by the time the loop compares
    // existing.scheduledTime (still baked at 08:00, from seed time) against
    // computeScheduledTime(timeWindow, date) (now 09:00), they differ — the
    // drift trigger.
    const staleItem = makeWellnessItem({ timesOfDay: ['morning'] });
    await setWellnessMorningTime('09:00');

    jest.setSystemTime(at('08:00'));
    await seedDeviceState({
      date: DATE,
      config: configWithWellnessMorning(),
      items: [staleItem],
      instances: [
        { itemId: staleItem.id, windowId: staleItem.schedule.times[0].id, status: 'pending' },
      ],
    });

    // Past windowEnd(10:00) + grace(120min) = 12:00 — the missed-check fires.
    jest.setSystemTime(at('12:30'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(
      `inst-${DATE}-${staleItem.id}-${staleItem.schedule.times[0].id}`,
    );
    expect(inst).toBeDefined();
    // THE ASSERTION THAT CATCHES THE CLOBBER: the missed-check wrote
    // 'missed' to storage; the refresh block (drift trigger fired: 08:00 !==
    // 09:00) must not spread the stale in-memory 'pending' back over it.
    expect(inst!.status).toBe('missed');
  });

  it('medication: instance is past grace (exact `at` + 120min) AND its scheduledTime has drifted from a caregiver time edit → ends the pass MISSED, not pending', async () => {
    // Two-phase (mirrors missedMarkingWindowedWriter.test.ts's medication
    // case): add the med + generate BEFORE the dose time so the instance is
    // born un-skipped, THEN edit the time (the drift trigger —
    // syncMedicationItemsWithConfig reconciles schedule.times[...].at on
    // the next ensureDailyInstances call, before the per-window loop runs,
    // while the existing instance still carries its original scheduledTime)
    // and advance the clock past the NEW time's grace cutoff — landing both
    // the missed-check and the refresh's drift trigger in the same call.
    jest.setSystemTime(at('06:00'));
    const med = await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
      customTimes: ['08:00'], scheduledTimeHHmm: '08:00', active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const born = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
      .find((i) => i.itemType === 'medication');
    expect(born).toBeDefined();
    expect(born!.status).toBe('pending');
    expect(born!.scheduledTime).toContain('T08:00');

    await updateMedicationInPlan(DEFAULT_PATIENT_ID, med.id, {
      customTimes: ['09:00'], scheduledTimeHHmm: '09:00',
    } as any);

    // Past the NEW time's exact+grace cutoff (09:00 + 120min = 11:00).
    jest.setSystemTime(at('11:30'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const after = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
      .find((i) => i.id === born!.id);
    expect(after).toBeDefined();
    expect(after!.status).toBe('missed');
  });
});

// ============================================================================
// STEP 3 — STANDING INVARIANT: no path in a single ensureDailyInstances pass
// can write 'pending' over an already-'missed' instance. Generic across every
// item type the per-window loop touches, not just the wellness trigger above.
//
// This is the stronger, more general form: rather than only re-proving the
// specific transition (pending → missed → [bug] → pending) for the two types
// that have a drift-refresh path today, it seeds instances that are ALREADY
// 'missed' entering the pass (system-marked by a prior run) and asserts
// NOTHING in ensureDailyInstances — the refresh block, the sync/reconcile
// passes, the stale-window sweep — ever reverts that status, regardless of
// what else fires in the same pass. Medication/wellness additionally carry
// an active drift trigger (the exact shape that caused the bug); vitals/
// meals have no drift-refresh mechanism today (their window SET changes
// instead of an existing window's `at` — see the comment in
// carePlanGenerator.ts), so these are forward guards: if a future slice
// gives them one, this net is already watching for the same clobber shape.
// ============================================================================

describe('STANDING INVARIANT — an already-missed instance survives a full generation pass, any type', () => {
  useControlledClock();

  it('wellness (with active drift trigger): already-missed instance stays missed', async () => {
    const staleItem = makeWellnessItem({ timesOfDay: ['morning'] });
    await setWellnessMorningTime('09:00'); // drift trigger: item baked at 08:00, settings say 09:00

    jest.setSystemTime(at('12:30')); // irrelevant to an already-missed instance, but past grace anyway
    await seedDeviceState({
      date: DATE,
      config: configWithWellnessMorning(),
      items: [staleItem],
      instances: [
        { itemId: staleItem.id, windowId: staleItem.schedule.times[0].id, status: 'missed' },
      ],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(
      `inst-${DATE}-${staleItem.id}-${staleItem.schedule.times[0].id}`,
    );
    expect(inst).toBeDefined();
    expect(inst!.status).toBe('missed');
  });

  it('medication (with active drift trigger): already-missed instance stays missed', async () => {
    jest.setSystemTime(at('06:00'));
    const med = await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
      customTimes: ['08:00'], scheduledTimeHHmm: '08:00', active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const born = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
      .find((i) => i.itemType === 'medication')!;

    // System-mark it missed directly (simulating a prior pass's result),
    // independent of this pass's own missed-check.
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [
      { ...born, status: 'missed' },
    ]);

    // Drift trigger — caregiver edits the time after it was already missed.
    await updateMedicationInPlan(DEFAULT_PATIENT_ID, med.id, {
      customTimes: ['09:00'], scheduledTimeHHmm: '09:00',
    } as any);

    jest.setSystemTime(at('11:30'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const after = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
      .find((i) => i.id === born.id);
    expect(after).toBeDefined();
    expect(after!.status).toBe('missed');
  });

  it('vitals (no drift mechanism today — forward guard): already-missed instance stays missed through a full pass', async () => {
    const item = makeVitalsItem({ timesOfDay: ['morning'] });
    const config: CarePlanConfig = {
      ...createDefaultCarePlanConfig(DEFAULT_PATIENT_ID),
      vitals: {
        ...createDefaultCarePlanConfig(DEFAULT_PATIENT_ID).vitals,
        enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'],
      } as any,
    };

    jest.setSystemTime(at('12:30'));
    await seedDeviceState({
      date: DATE,
      config,
      items: [item],
      instances: [
        { itemId: item.id, windowId: item.schedule.times[0].id, status: 'missed' },
      ],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(`inst-${DATE}-${item.id}-${item.schedule.times[0].id}`);
    expect(inst).toBeDefined();
    expect(inst!.status).toBe('missed');
  });

  it('meals (no drift mechanism today — forward guard): already-missed instance stays missed through a full pass', async () => {
    const now = `${DATE}T00:00:00`;
    const mealItem: CarePlanItem = {
      id: 'sync-meal-midday',
      carePlanId: 'placeholder',
      type: 'nutrition',
      name: 'Lunch',
      priority: 'recommended',
      active: true,
      schedule: {
        frequency: 'daily',
        times: [{ id: 'sync-meal-midday-time', kind: 'exact', label: 'afternoon', at: '12:00' }],
      },
      emoji: '🍽️',
      createdAt: now,
      updatedAt: now,
    };
    const config: CarePlanConfig = {
      ...createDefaultCarePlanConfig(DEFAULT_PATIENT_ID),
      meals: { ...createDefaultCarePlanConfig(DEFAULT_PATIENT_ID).meals, enabled: true, timesOfDay: ['midday'] } as any,
    };

    jest.setSystemTime(at('16:30')); // afternoon windowEnd 14:00 + grace 120min = 16:00
    await seedDeviceState({
      date: DATE,
      config,
      items: [mealItem],
      instances: [
        { itemId: mealItem.id, windowId: mealItem.schedule.times[0].id, status: 'missed' },
      ],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(`inst-${DATE}-${mealItem.id}-${mealItem.schedule.times[0].id}`);
    expect(inst).toBeDefined();
    expect(inst!.status).toBe('missed');
  });
});
