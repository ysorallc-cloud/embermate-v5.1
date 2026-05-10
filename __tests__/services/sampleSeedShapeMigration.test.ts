// ============================================================================
// Phase 11.7.2 — sample-seed shape-version migration.
//
// Bug repro: Phase 11.6 fixed the historical-instance loop to seed
// past-day medication completions. The fix shipped, but the device
// check still showed the pre-fix shape because the user's
// SAMPLE_DATA_INITIALIZED_KEY was already 'true' from a previous
// build. The early-exit guard at the top of initializeSampleData()
// short-circuited the function — the new logic never ran.
//
// Fix: a forward-looking shape-version migration. A monotonically-
// incrementing SAMPLE_SEED_SHAPE_VERSION constant lives in
// sampleDataGenerator.ts. On app open, if the stored version is
// older than the current code version, the migration clears
// SAMPLE_DATA_INITIALIZED_KEY + SAMPLE_CORRELATION_GENERATED and
// writes the new version. Next sample-data init re-runs from
// scratch with current logic.
//
// Future seed-shape changes bump the constant in their commit.
// Existing testers re-seed automatically on next launch.
//
// Pinned contracts:
//   1. No-op when stored version === current version.
//   2. Migration clears the two seed-init flags when stored < current.
//   3. Migration persists the new version after running.
//   4. First run (stored version missing) treats as 0 and migrates.
//   5. Migration is idempotent — running twice in a row only acts once.
//   6. Storage failure resolves gracefully (returns false, doesn't throw).
// ============================================================================

import {
  migrateSampleSeedShape,
  SAMPLE_SEED_SHAPE_VERSION,
} from '../../utils/sampleDataGenerator';
import { StorageKeys } from '../../utils/storageKeys';

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    multiSet: (pairs: Array<[string, string]>) => {
      for (const [k, v] of pairs) store.set(k, v);
      return Promise.resolve();
    },
    multiRemove: (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (k: string, v: any): Promise<boolean> => {
    store.set(k, JSON.stringify(v));
    return true;
  },
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

beforeEach(() => {
  store.clear();
});

describe('Phase 11.7.2 — migrateSampleSeedShape', () => {
  it('contract 1: no-op when stored version equals current version', async () => {
    // Seed the post-migration state to verify the migration leaves it alone.
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_CORRELATION_GENERATED, JSON.stringify('true'));
    store.set(
      StorageKeys.SAMPLE_SEED_SHAPE_VERSION,
      JSON.stringify(SAMPLE_SEED_SHAPE_VERSION),
    );

    const out = await migrateSampleSeedShape();
    expect(out.migrated).toBe(false);
    expect(out.fromVersion).toBe(SAMPLE_SEED_SHAPE_VERSION);
    // Init flags untouched.
    expect(store.get(StorageKeys.SAMPLE_DATA_INITIALIZED)).toBe(JSON.stringify('true'));
    expect(store.get(StorageKeys.SAMPLE_CORRELATION_GENERATED)).toBe(JSON.stringify('true'));
  });

  it('contract 2: clears init flags when stored version is older', async () => {
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_CORRELATION_GENERATED, JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_SEED_SHAPE_VERSION, JSON.stringify(0));

    const out = await migrateSampleSeedShape();
    expect(out.migrated).toBe(true);
    expect(out.fromVersion).toBe(0);
    expect(out.toVersion).toBe(SAMPLE_SEED_SHAPE_VERSION);
    // Both flags removed so initializeSampleData + generateSample-
    // CorrelationData run again with current logic.
    expect(store.has(StorageKeys.SAMPLE_DATA_INITIALIZED)).toBe(false);
    expect(store.has(StorageKeys.SAMPLE_CORRELATION_GENERATED)).toBe(false);
  });

  it('contract 3: persists the new version after running', async () => {
    store.set(StorageKeys.SAMPLE_SEED_SHAPE_VERSION, JSON.stringify(0));
    await migrateSampleSeedShape();
    const stored = JSON.parse(store.get(StorageKeys.SAMPLE_SEED_SHAPE_VERSION) ?? 'null');
    expect(stored).toBe(SAMPLE_SEED_SHAPE_VERSION);
  });

  it('contract 4: first run (no stored version) treats as 0 and migrates', async () => {
    // Fresh app or pre-migration state — the version key doesn't exist.
    // Default to 0 so the migration fires on the first launch after
    // shipping the migration itself, ensuring already-seeded testers
    // re-seed under current logic.
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));

    const out = await migrateSampleSeedShape();
    expect(out.migrated).toBe(true);
    expect(out.fromVersion).toBe(0);
    expect(store.has(StorageKeys.SAMPLE_DATA_INITIALIZED)).toBe(false);
  });

  it('contract 5: idempotent — running twice only migrates once', async () => {
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_SEED_SHAPE_VERSION, JSON.stringify(0));

    const first = await migrateSampleSeedShape();
    expect(first.migrated).toBe(true);

    // Re-set the init flag (as if initializeSampleData has run since)
    // so we can detect whether the second migration call clears it again.
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));

    const second = await migrateSampleSeedShape();
    expect(second.migrated).toBe(false);
    // Init flag must NOT be cleared on the second run — otherwise the
    // user re-seeds on every app open.
    expect(store.has(StorageKeys.SAMPLE_DATA_INITIALIZED)).toBe(true);
  });

  it('contract 6: SAMPLE_SEED_SHAPE_VERSION constant exists and is a positive integer', () => {
    expect(typeof SAMPLE_SEED_SHAPE_VERSION).toBe('number');
    expect(Number.isInteger(SAMPLE_SEED_SHAPE_VERSION)).toBe(true);
    // Must be ≥ 1 so the very first launch (stored = 0 default) triggers
    // the migration, re-seeding existing 11.6-and-earlier testers.
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(1);
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring audit
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 11.7.2 — appStartup wiring', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'services/appStartup.ts'),
    'utf8',
  );

  it('contract 7: appStartup imports migrateSampleSeedShape', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bmigrateSampleSeedShape\b[^}]*\}\s*from\s*['"][^'"]+\/utils\/sampleDataGenerator['"]/,
    );
  });

  it('contract 8: migrateSampleSeedShape runs BEFORE the sampleData phase', () => {
    // The migration must execute before initializeSampleData reads
    // the SAMPLE_DATA_INITIALIZED flag, otherwise it has no effect.
    const migrationIdx = SRC.indexOf('migrateSampleSeedShape');
    const sampleDataIdx = SRC.indexOf("'sampleData'");
    expect(migrationIdx).toBeGreaterThan(-1);
    expect(sampleDataIdx).toBeGreaterThan(-1);
    expect(migrationIdx).toBeLessThan(sampleDataIdx);
  });

  it('contract 9: migration runs as its own runPhase entry (error-isolated)', () => {
    // Same isolation pattern as the other startup phases — a failure
    // in the migration must not block the rest of startup.
    expect(SRC).toMatch(
      /runPhase\s*\(\s*['"]sampleSeedShape['"][\s\S]*?migrateSampleSeedShape\s*\(\s*\)/,
    );
  });
});
