// ============================================================================
// Phase 34 F5.1 — INTEGRATION ROUND-TRIP for the Vitals bucket
// timesOfDay write → generator reconcile → CarePlanItem schedule pipeline.
//
// Closes the F2.1-banked "Vitals When-surface gap" + the pre-existing
// generator reconciliation parity gap surfaced during F5.1's audit:
// the wellness sync had Pass-B reconciliation (carePlanGenerator.ts:
// L561-632) but vitals only handled the FRESH-state branch
// (L281-310) + reactivate / deactivate (L271-280, L311-319). With
// no UI writing vitals.timesOfDay pre-F5.1, the gap was latent. F5.1
// surfaces the chip set AND closes the reconciliation in the same
// commit so the new control doesn't silently fail to control —
// "the When surface works" is one atomic slice.
//
// STANDING PATTERN (locked by reflectionRoundTrip35S3C /
// vitalsRoundTrip35S3C / logEntryNotesRoundTrip35S3A /
// logEntrySoftDelete35S3D headers, applies here verbatim):
//
//   For any user-visible action that writes data which another
//   surface will later read, an integration test must exercise the
//   REAL write fn → REAL storage layer → REAL read fn round-trip,
//   with mocks ONLY at the bottom-layer native modules
//   (AsyncStorage, expo-secure-store, expo-crypto — already mocked
//   globally in jest.setup.js with realistic in-memory
//   implementations).
//
//   Mocks of `saveCarePlanConfig` / `updateBucketConfig` /
//   `setBucketEnabled` / `ensureDailyInstances` /
//   `syncOtherBucketsWithConfig` / `listCarePlanItems` /
//   `getActiveCarePlan` / `safeStorage` / `secureStorage` are
//   FORBIDDEN in this file. Any future maintainer adding such a mock
//   undoes the guard the standing pattern exists to enforce.
//
//   The existing __tests__/services/wellnessReconciliation34F3.test.ts
//   uses heavy storage-layer mocks — that is the OLD pattern and
//   should not be propagated. This file IS the F5 round-trip
//   template for the subsequent bucket adoptions (F5.2 Meals,
//   F5.3 Wellness split, F5.4 Meds).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCarePlanConfig,
  getCarePlanConfig,
  updateBucketConfig,
  setBucketEnabled,
} from '../../storage/carePlanConfigRepo';
import {
  getActiveCarePlan,
  listCarePlanItems,
  listDailyInstances,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig, type VitalsBucketConfig } from '../../types/carePlanConfig';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-06-05';

/** Build a baseline care-plan config with only vitals enabled (all
 *  other buckets disabled) to isolate vitals-bucket behavior under
 *  the integration test. */
async function seedVitalsOnly(opts: Partial<VitalsBucketConfig> = {}): Promise<void> {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  // Disable every non-vitals bucket so ensureDailyInstances'
  // hasAnyEnabledBucket gate fires solely on vitals.
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
    const bucket = (cfg as any)[k];
    if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'vitals') {
      (bucket as any).enabled = false;
    }
  }
  cfg.vitals = {
    ...cfg.vitals,
    enabled: true,
    vitalTypes: ['bp', 'hr', 'weight'],
    ...opts,
  };
  await saveCarePlanConfig(cfg);
}

async function getVitalsItem() {
  const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
  if (!carePlan) return null;
  const items = await listCarePlanItems(carePlan.id);
  return items.find((i) => i.type === 'vitals' && !i.id.startsWith('sample-')) ?? null;
}

describe('Phase 34 F5.1 — Vitals bucket timesOfDay write → generator reconcile INTEGRATION round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CORE WRITE): updateBucketConfig vitals.timesOfDay round-trips through carePlanConfig storage', async () => {
    // The bottom-layer storage contract. The F5.1 drawer reads/writes
    // through useCarePlanConfig.updateBucket which delegates to
    // updateBucketConfig. If THIS round-trip doesn't preserve the
    // array, every downstream contract is unreachable.
    await seedVitalsOnly({ timesOfDay: ['morning'] });

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['morning', 'midday', 'evening', 'night'],
    });

    const fetched = await getCarePlanConfig(DEFAULT_PATIENT_ID);
    expect(fetched).not.toBeNull();
    expect((fetched!.vitals as VitalsBucketConfig).timesOfDay).toEqual([
      'morning',
      'midday',
      'evening',
      'night',
    ]);
  });

  it('rt-2 (GENERATOR FRESH-STATE): enabling vitals with timesOfDay=[morning] creates a sync-vitals CarePlanItem with one morning time window at 08:00', async () => {
    // The fresh-state branch (services/carePlanGenerator.ts:281-310)
    // honors timesOfDay. Pre-F5.1 the only writer of vitals timesOfDay
    // was DEFAULT_BUCKET_CONFIG / onboarding; F5.1 makes the drawer a
    // first-class writer. Pin the fresh-state happy path so a future
    // refactor of the chip set can't quietly stop seeding the item.
    await seedVitalsOnly({ timesOfDay: ['morning'] });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(true);
    expect(item!.schedule?.times).toHaveLength(1);
    expect(item!.schedule!.times[0].label).toBe('morning');
    expect(item!.schedule!.times[0].at).toBe('08:00');
  });

  it('rt-3 (GENERATOR RECONCILE — ADD WINDOW, LOAD-BEARING): adding "midday" → schedule.times reconciles AND a new DailyCareInstance appears for the added window (device-facing layer)', async () => {
    // THE F5.1 LOAD-BEARING CONTRACT. F5.1.1 refinement: the
    // original rt-3 only asserted on CarePlanItem.schedule.times
    // (the intermediate storage template). The F5.1 device walk
    // surfaced that the device-facing surface (DailyCareInstance via
    // listDailyInstances → Now tab) was the layer that actually
    // mattered. Standing rule sharpened: round-trip integration
    // tests must assert on what the device-facing screen reads,
    // NOT intermediate storage templates.
    //
    // Both layers asserted here:
    //   (a) schedule.times on the CarePlanItem (template)
    //   (b) DailyCareInstance for the added window exists on
    //       listDailyInstances (what Now actually shows)
    await seedVitalsOnly({ timesOfDay: ['morning'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const item = await getVitalsItem();
      expect(item!.schedule!.times).toHaveLength(1);
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      const vitalsInstances = instances.filter((i) => i.itemType === 'vitals');
      expect(vitalsInstances).toHaveLength(1);
      expect(vitalsInstances[0].windowId).toBe('sync-vitals-morning-time');
    }

    // Caregiver toggles "Afternoon" chip on (internal value 'midday').
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['morning', 'midday'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Layer (a) — schedule template.
    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(true);
    expect(item!.schedule!.times).toHaveLength(2);
    const labels = item!.schedule!.times.map((t) => t.label).sort();
    expect(labels).toEqual(['afternoon', 'morning']);

    // Layer (b) — device-facing DailyCareInstance state.
    const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const vitalsInstances = instances.filter((i) => i.itemType === 'vitals');
    expect(vitalsInstances).toHaveLength(2);
    const windowIds = vitalsInstances.map((i) => i.windowId).sort();
    expect(windowIds).toEqual(['sync-vitals-midday-time', 'sync-vitals-morning-time']);
  });

  it('rt-4 (GENERATOR RECONCILE — REMOVE WINDOW, LOAD-BEARING): removing "morning" → the pending morning DailyCareInstance is soft-deactivated and no longer surfaces from listDailyInstances (device-facing layer)', async () => {
    // F5.1 walk failure pin. Pre-F5.1.1 the test only asserted on
    // CarePlanItem.schedule.times (template layer). The device
    // showed a lingering morning instance because removeStaleInstances
    // (storage/carePlanRepo.ts:325) is item-level — keeps any
    // instance whose carePlanItemId is active, regardless of
    // windowId. F5.1.1's removeStaleWindowInstances pass closes the
    // gap by soft-deactivating instances whose windowId is no
    // longer in their item's current schedule.times.
    //
    // Q-34.F5.1.1 lock: hide-not-delete via deactivatedAt
    // (parallels Slice 3-D LogEntry.deletedAt). Default
    // listDailyInstances reads filter `!i.deactivatedAt`;
    // includeDeactivated opt-in surfaces the audit trail.
    await seedVitalsOnly({ timesOfDay: ['morning', 'midday'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      const vitalsInstances = instances.filter((i) => i.itemType === 'vitals');
      expect(vitalsInstances).toHaveLength(2);
    }

    // Caregiver removes "Morning" chip — only Afternoon remains.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['midday'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Layer (a) — schedule template reconciled.
    const item = await getVitalsItem();
    expect(item!.active).toBe(true);
    expect(item!.schedule!.times).toHaveLength(1);
    expect(item!.schedule!.times[0].label).toBe('afternoon');

    // Layer (b) — device-facing read. The morning pending instance
    // must NOT surface; only the midday instance remains visible.
    const visible = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const visibleVitals = visible.filter((i) => i.itemType === 'vitals');
    expect(visibleVitals).toHaveLength(1);
    expect(visibleVitals[0].windowId).toBe('sync-vitals-midday-time');
    // Defensive: no remnant morning instance in the visible read.
    expect(
      visibleVitals.find((i) => i.windowId === 'sync-vitals-morning-time'),
    ).toBeUndefined();

    // Audit-trail layer — opt-in includeDeactivated surfaces the
    // soft-deactivated morning instance with a deactivatedAt
    // timestamp. The instance was preserved in storage (hide-not-
    // delete); the default reader just doesn't see it.
    const raw = await listDailyInstances(DEFAULT_PATIENT_ID, DATE, {
      includeDeactivated: true,
    });
    const morningRaw = raw.find(
      (i) => i.windowId === 'sync-vitals-morning-time' && i.itemType === 'vitals',
    );
    expect(morningRaw).toBeDefined();
    expect(typeof morningRaw!.deactivatedAt).toBe('string');
    expect(morningRaw!.deactivatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('rt-7 (AUDIT-TRAIL PRESERVATION): when a window is removed, a COMPLETED instance for that window is PRESERVED (not deactivated) — caregiver action history survives schedule changes', async () => {
    // Q-34.F5.1.1 hide-not-delete refinement: completed/skipped/
    // missed instances carry caregiver action history. Even though
    // the schedule that produced them changed, removing them would
    // silently drop logged work from Journal Section 2 + handoff
    // PDF + any other surface reading per-day instances. The new
    // pass MUST tombstone only the unactioned (pending) placeholders;
    // actioned instances stay visible verbatim.
    await seedVitalsOnly({ timesOfDay: ['morning', 'midday'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Caregiver completes the morning vitals instance.
    const beforeComplete = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const morningInst = beforeComplete.find(
      (i) => i.itemType === 'vitals' && i.windowId === 'sync-vitals-morning-time',
    );
    expect(morningInst).toBeDefined();
    await updateDailyInstanceStatus(
      DEFAULT_PATIENT_ID,
      DATE,
      morningInst!.id,
      'completed',
    );

    // Later that same day caregiver removes "Morning" from the chip set.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['midday'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // The completed morning instance MUST survive in the visible read
    // — caregiver action history is preserved regardless of the
    // schedule change. Only the unactioned placeholder for a removed
    // window would be tombstoned; rt-7 pins the opposite case.
    const after = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const afterVitals = after.filter((i) => i.itemType === 'vitals');
    const completedMorning = afterVitals.find(
      (i) => i.windowId === 'sync-vitals-morning-time',
    );
    expect(completedMorning).toBeDefined();
    expect(completedMorning!.status).toBe('completed');
    expect(completedMorning!.deactivatedAt).toBeUndefined();
    // Midday pending instance also present (current schedule).
    const middayPending = afterVitals.find(
      (i) => i.windowId === 'sync-vitals-midday-time',
    );
    expect(middayPending).toBeDefined();
  });

  it('rt-5 (EMPTY ARRAY): timesOfDay=[] on an enabled vitals bucket deactivates the item (no time windows = nothing to schedule)', async () => {
    // Edge case: bucket stays enabled (the caregiver hasn't toggled
    // it off) but the When set is empty. The generator treats this
    // as "no windows" and the item deactivates — instances stop
    // generating. Mirrors wellness's `targetActive =
    // wellnessTimesOfDay.length > 0` predicate (L568).
    await seedVitalsOnly({ timesOfDay: ['morning'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const item = await getVitalsItem();
      expect(item!.active).toBe(true);
    }

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', { timesOfDay: [] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(false);
  });

  it('rt-6 (GENERATOR FALLBACK): undefined timesOfDay on the vitals config defaults to ["morning"] at the generator (forward-guard against the fallback being dropped)', async () => {
    // Pre-F5.1 the only fallback was the `|| ['morning']` at
    // L283 inside the fresh-state branch. F5.1's reconciliation pass
    // must preserve the same fallback so a stored config with an
    // explicitly-undefined timesOfDay (legacy migrations,
    // hand-edited storage) still gets a usable morning instance.
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
      if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
      const bucket = (cfg as any)[k];
      if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'vitals') {
        (bucket as any).enabled = false;
      }
    }
    // Explicitly strip timesOfDay to simulate legacy / migrated config.
    cfg.vitals = {
      ...cfg.vitals,
      enabled: true,
      vitalTypes: ['bp'],
    } as VitalsBucketConfig;
    delete (cfg.vitals as any).timesOfDay;
    await saveCarePlanConfig(cfg);

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(true);
    expect(item!.schedule!.times).toHaveLength(1);
    expect(item!.schedule!.times[0].label).toBe('morning');
  });
});
