// ============================================================================
// Phase 28 Batch B MEALS post-audit (THE READ Item 2) — clean-slate seed-shape
// migration contracts.
//
// Three coupled bugs surfaced across the v3 → v4 → v5 sequence:
//
//   Pre-v4: `migrateSampleSeedShape` cleared `SAMPLE_DATA_INITIALIZED` +
//     `SAMPLE_CORRELATION_GENERATED` flags but left existing LOGS_V2
//     LogEntries in place. Each version bump's re-seed appended new
//     LogEntries on top of stale ones, inflating avgHydrationPerDay
//     from the intended ~7.5 to 13.7+ glasses/day.
//
//   v4 (commit 8ae797ce, sim + repo only — never reached TestFlight/
//   App Store): Added clearSampleData() + LOGS_V2:* wipe. Two flaws:
//     (a) wipes ran UNCONDITIONALLY when stored < code — real-mode
//         users on first launch (stored=0, code=4) would have lost
//         their care plan data. Latent destructive bug; the v3→v4
//         build never shipped externally so no real user was
//         affected, but the migration code was destructive.
//     (b) INSTANCES_V2:* entries survived clearSampleData() because
//         their auto-UUID IDs don't match the 'sample-' prefix
//         filter. Re-seed's ensureDailyInstances matched the
//         surviving v3 instances via existingMap key
//         `${itemId}:${windowId}`, status='completed' from v3 → the
//         historical loop's `inst.status !== 'pending' continue`
//         skipped every instance → no fresh LogEntries written →
//         THE READ tiles all showed "—" while THE DATA (instance-
//         sourced) read fine.
//
//   v5 fix (this contract):
//     (a) `sample_data_seeded === 'true'` guard around the heavy
//         wipes. Real-mode users skip the destructive block; only
//         the harmless init-flag clears run.
//     (b) INSTANCES_V2:* wipe alongside LOGS_V2:*. Fresh re-seed
//         starts with no carryover, ensureDailyInstances creates
//         pending instances, historical loop logs them, listLogsIn
//         Range reads the new daily buckets, THE READ populates.
//
// This file pins all three invariants. Source-level pins guard the
// migration code shape; behavioral tests against mocked AsyncStorage
// pin the actual destructive-but-guarded behavior (real-mode skip +
// sample-mode dual-wipe).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const generatorSrc = readFileSync(join(ROOT, 'utils/sampleDataGenerator.ts'), 'utf8');
const managerSrc = readFileSync(join(ROOT, 'utils/sampleDataManager.ts'), 'utf8');

// ----------------------------------------------------------------------------
// Source-level pins
// ----------------------------------------------------------------------------

describe('Phase 28 Batch B MEALS post-audit — migration source-level contracts', () => {
  it('SAMPLE_SEED_SHAPE_VERSION is at version 5 (or beyond)', () => {
    // Re-import inside the test so the source-level constant is read
    // after any prior test in the same suite has run. The number is
    // pinned in the source via a regex too as a defense-in-depth.
    const { SAMPLE_SEED_SHAPE_VERSION } = require('../../utils/sampleDataGenerator');
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(5);
    expect(generatorSrc).toMatch(/SAMPLE_SEED_SHAPE_VERSION\s*=\s*[5-9]\d*/);
  });

  it('clearSampleData iterates the LOGS_V2 prefix (carePlanLogs) — defensive symmetry with INSTANCES_V2 handling', () => {
    expect(managerSrc).toMatch(/SAMPLE_DATA_KEYS\.prefixes\.carePlanLogs/);
    expect(managerSrc).toMatch(
      /allKeys\.filter\([^)]*SAMPLE_DATA_KEYS\.prefixes\.carePlanLogs[^)]*\)/,
    );
  });

  it('migrateSampleSeedShape guards heavy wipes on sample_data_seeded === "true"', () => {
    // Real-mode users (no sample_data_seeded flag) must skip the
    // destructive clearSampleData() + LOGS_V2 + INSTANCES_V2 wipes.
    // Pre-v5 the wipes ran unconditionally when stored < code, which
    // would have destroyed real care plan data on first launch.
    const migrationFn = generatorSrc.slice(
      generatorSrc.indexOf('export async function migrateSampleSeedShape'),
      generatorSrc.indexOf('export async function migrateSampleSeedShape') + 4000,
    );
    expect(migrationFn).toMatch(
      /safeGetItem<[^>]+>\(\s*['"]sample_data_seeded['"]/,
    );
    expect(migrationFn).toMatch(/sampleSeeded\s*===\s*['"]true['"]/);
    // Pin: the guard wraps the clearSampleData call (guard appears
    // before clearSampleData reference inside the function).
    const guardIdx = migrationFn.indexOf("sampleSeeded === 'true'");
    const clearIdx = migrationFn.indexOf('clearSampleData()');
    expect(guardIdx).toBeGreaterThan(0);
    expect(clearIdx).toBeGreaterThan(guardIdx);
  });

  it('migrateSampleSeedShape wipes BOTH LOGS_V2 AND INSTANCES_V2 in the same multiRemove', () => {
    // The empty-THE-READ regression came from wiping LOGS_V2 but not
    // INSTANCES_V2. Without instance wipe, re-seed's existingMap reuses
    // surviving completed instances, historical loop skips them, no
    // fresh LogEntries get written. Both prefixes must wipe together.
    const migrationFn = generatorSrc.slice(
      generatorSrc.indexOf('export async function migrateSampleSeedShape'),
      generatorSrc.indexOf('export async function migrateSampleSeedShape') + 4000,
    );
    expect(migrationFn).toMatch(/StorageKeyPrefixes\.LOGS_V2/);
    expect(migrationFn).toMatch(/StorageKeyPrefixes\.INSTANCES_V2/);
    expect(migrationFn).toMatch(/AsyncStorage\.multiRemove\s*\(/);
  });

  it('migrateSampleSeedShape calls clearSampleData() before init-flag clears (positional pin)', () => {
    const migrationFn = generatorSrc.slice(
      generatorSrc.indexOf('export async function migrateSampleSeedShape'),
      generatorSrc.indexOf('export async function migrateSampleSeedShape') + 4000,
    );
    expect(migrationFn).toMatch(/await\s+clearSampleData\s*\(\s*\)/);
    const clearIdx = migrationFn.indexOf('clearSampleData');
    const initFlagIdx = migrationFn.indexOf('SAMPLE_DATA_INITIALIZED_KEY');
    expect(clearIdx).toBeGreaterThan(0);
    expect(initFlagIdx).toBeGreaterThan(0);
    expect(clearIdx).toBeLessThan(initFlagIdx);
  });
});

// ----------------------------------------------------------------------------
// Behavioral pins — mocked AsyncStorage, exercise the real destructive paths
// ----------------------------------------------------------------------------
//
// Per the user's lock: "all three THE READ bugs (meals 1.0, hydration 13.7,
// empty tiles) passed unit tests because the code was locally correct while
// the integrated data flow was wrong. A source-grep test would NOT have
// caught the empty tiles. This single behavioral assertion closes the gap."
//
// The behavioral test exercises migrateSampleSeedShape against an
// in-memory AsyncStorage mock seeded with v4-shape state (LOGS_V2 +
// INSTANCES_V2 keys present, sample_data_seeded='true'), then asserts:
//   • Sample-mode path: both prefixes are removed
//   • Real-mode path (no sample_data_seeded): both prefixes SURVIVE

// In-memory AsyncStorage stub. Module-level so the mock factory closure
// captures it. Reset between tests via __resetStore().
const __memStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => __memStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      __memStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete __memStore[key];
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) delete __memStore[k];
    }),
    getAllKeys: jest.fn(async () => Object.keys(__memStore)),
  },
}));

// safeStorage shells through to AsyncStorage but adds JSON parsing —
// stub it to call our mock directly so we don't have to plumb the
// JSON layer through.
jest.mock('../../utils/safeStorage', () => ({
  __esModule: true,
  safeGetItem: jest.fn(async (key: string, fallback: any) => {
    const raw = __memStore[key];
    if (raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }),
  safeSetItem: jest.fn(async (key: string, value: any) => {
    __memStore[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return true;
  }),
  encryptedSetRaw: jest.fn(async (key: string, raw: string) => {
    __memStore[key] = raw;
  }),
}));

// Stub clearSampleData so we don't have to mock its 40+ transitive deps.
// The migration's contract is "call clearSampleData first, then wipe
// LOGS_V2 + INSTANCES_V2" — the source pin above asserts the call shape;
// these behavioral tests focus on the wipe behavior and guard.
jest.mock('../../utils/sampleDataManager', () => ({
  __esModule: true,
  clearSampleData: jest.fn(async () => ({ success: true, clearedCount: 0, errors: [] })),
}));

function __resetStore() {
  for (const k of Object.keys(__memStore)) delete __memStore[k];
}

import { migrateSampleSeedShape, SAMPLE_SEED_SHAPE_VERSION } from '../../utils/sampleDataGenerator';
import { StorageKeyPrefixes } from '../../utils/storageKeys';

describe('Phase 28 Batch B MEALS post-audit — migration behavioral contracts', () => {
  beforeEach(() => {
    __resetStore();
  });

  it('sample-mode path: wipes BOTH LOGS_V2 and INSTANCES_V2 keys + clears init flags', async () => {
    // Pre-state: stored at v4 (or any prior), sample_data_seeded set,
    // LOGS_V2 + INSTANCES_V2 keys populated with stale data.
    __memStore['@embermate_sample_seed_shape_version'] = JSON.stringify(4);
    __memStore['sample_data_seeded'] = JSON.stringify('true');
    __memStore[`${StorageKeyPrefixes.LOGS_V2}default-patient:2026-05-15`] =
      JSON.stringify([{ id: 'stale-log-1' }]);
    __memStore[`${StorageKeyPrefixes.LOGS_V2}default-patient:2026-05-16`] =
      JSON.stringify([{ id: 'stale-log-2' }]);
    __memStore[`${StorageKeyPrefixes.INSTANCES_V2}default-patient:2026-05-15`] =
      JSON.stringify([{ id: 'stale-instance-1', status: 'completed' }]);
    __memStore[`${StorageKeyPrefixes.INSTANCES_V2}default-patient:2026-05-16`] =
      JSON.stringify([{ id: 'stale-instance-2', status: 'completed' }]);
    __memStore['@embermate_sample_data_initialized'] = JSON.stringify('true');

    const result = await migrateSampleSeedShape();

    expect(result.migrated).toBe(true);
    expect(result.toVersion).toBe(SAMPLE_SEED_SHAPE_VERSION);

    // Both prefixes fully wiped
    const remainingLogKeys = Object.keys(__memStore).filter((k) =>
      k.startsWith(StorageKeyPrefixes.LOGS_V2),
    );
    const remainingInstanceKeys = Object.keys(__memStore).filter((k) =>
      k.startsWith(StorageKeyPrefixes.INSTANCES_V2),
    );
    expect(remainingLogKeys).toHaveLength(0);
    expect(remainingInstanceKeys).toHaveLength(0);

    // Init flag cleared so the next initializeSampleData() runs
    expect(__memStore['@embermate_sample_data_initialized']).toBeUndefined();
  });

  it('real-mode path: NO sample_data_seeded flag → wipes are SKIPPED, real data SURVIVES', async () => {
    // Pre-state: stored at v0 (first launch on the v5 build for a
    // real-mode user), no sample_data_seeded flag, LOGS_V2 + INSTANCES_V2
    // populated with REAL user data.
    __memStore['@embermate_sample_seed_shape_version'] = JSON.stringify(0);
    // sample_data_seeded INTENTIONALLY absent
    __memStore[`${StorageKeyPrefixes.LOGS_V2}default-patient:2026-05-15`] =
      JSON.stringify([{ id: 'real-log-1', source: 'record' }]);
    __memStore[`${StorageKeyPrefixes.INSTANCES_V2}default-patient:2026-05-15`] =
      JSON.stringify([{ id: 'real-instance-1', status: 'completed' }]);

    const result = await migrateSampleSeedShape();

    expect(result.migrated).toBe(true);

    // Real-user data SURVIVES — guard prevented the heavy wipes
    const remainingLogKeys = Object.keys(__memStore).filter((k) =>
      k.startsWith(StorageKeyPrefixes.LOGS_V2),
    );
    const remainingInstanceKeys = Object.keys(__memStore).filter((k) =>
      k.startsWith(StorageKeyPrefixes.INSTANCES_V2),
    );
    expect(remainingLogKeys).toHaveLength(1);
    expect(remainingInstanceKeys).toHaveLength(1);
  });

  it('already-current version: early-return with no wipes regardless of mode', async () => {
    __memStore['@embermate_sample_seed_shape_version'] =
      JSON.stringify(SAMPLE_SEED_SHAPE_VERSION);
    __memStore['sample_data_seeded'] = JSON.stringify('true');
    __memStore[`${StorageKeyPrefixes.LOGS_V2}default-patient:2026-05-15`] =
      JSON.stringify([{ id: 'log-1' }]);

    const result = await migrateSampleSeedShape();

    expect(result.migrated).toBe(false);
    // No wipe — version already current
    expect(
      Object.keys(__memStore).filter((k) => k.startsWith(StorageKeyPrefixes.LOGS_V2)),
    ).toHaveLength(1);
  });
});
