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

  it('rt-3 (GENERATOR RECONCILE — ADD WINDOW, LOAD-BEARING): adding "midday" to an existing vitals item\'s timesOfDay reconciles schedule.times to BOTH windows (closes the F5.1 audit-surfaced parity gap)', async () => {
    // THE F5.1 LOAD-BEARING CONTRACT. Pre-F5.1 the audit found that
    // vitals sync had no Pass-B-style reconciliation (compare
    // wellness's L561-632) — existing-item branches only flipped
    // .active. With the new chip set writing timesOfDay from the UI,
    // a "control doesn't control" bug would appear: the chip toggle
    // would update the config, but the existing CarePlanItem's
    // schedule.times would stay frozen. F5.1 mirrors wellness's
    // Pass-B reconciliation for the sync-vitals item; this contract
    // is RED without that fix and GREEN once it lands.
    await seedVitalsOnly({ timesOfDay: ['morning'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const item = await getVitalsItem();
      expect(item!.schedule!.times).toHaveLength(1);
    }

    // Caregiver toggles "Afternoon" chip on (internal value 'midday').
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['morning', 'midday'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(true);
    expect(item!.schedule!.times).toHaveLength(2);
    const labels = item!.schedule!.times.map((t) => t.label).sort();
    expect(labels).toEqual(['afternoon', 'morning']);
    const ats = item!.schedule!.times.map((t) => t.at).sort();
    expect(ats).toEqual(['08:00', '12:00']);
  });

  it('rt-4 (GENERATOR RECONCILE — REMOVE WINDOW): removing "morning" from timesOfDay reconciles schedule.times to the remaining windows', async () => {
    // Symmetric reverse of rt-3. Same reconciliation path, opposite
    // direction. Hide-not-delete invariant: the bucket stays enabled
    // and the item stays active (because timesOfDay is non-empty);
    // only the schedule.times array changes.
    await seedVitalsOnly({ timesOfDay: ['morning', 'midday'] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', {
      timesOfDay: ['midday'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const item = await getVitalsItem();
    expect(item).not.toBeNull();
    expect(item!.active).toBe(true);
    expect(item!.schedule!.times).toHaveLength(1);
    expect(item!.schedule!.times[0].label).toBe('afternoon');
    expect(item!.schedule!.times[0].at).toBe('12:00');
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
