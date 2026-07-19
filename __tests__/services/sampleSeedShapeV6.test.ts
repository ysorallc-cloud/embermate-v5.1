// ============================================================================
// SAMPLE_SEED_SHAPE_VERSION 5 → 6 bump — re-seed existing example accounts to
// the trimmed dataset (3 meds / BP+glucose / coherent mixed day), which the
// sample-data trim (db77de06) shipped WITHOUT bumping the version, so accounts
// stuck at v5 still carry the stale pre-trim seed.
//
// CRITICAL SAFETY: the destructive re-seed (clearSampleData + LOGS_V2 /
// INSTANCES_V2 wipe) must fire ONLY for example/sample accounts
// (sample_data_seeded === 'true'). A real caregiver's account (no flag) must be
// left completely intact — a version bump that wiped real data would be
// catastrophic. This asserts that gate behaviorally, not just by source-pin.
// ============================================================================

import { migrateSampleSeedShape, SAMPLE_SEED_SHAPE_VERSION } from '../../utils/sampleDataGenerator';
import { StorageKeys, StorageKeyPrefixes } from '../../utils/storageKeys';

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    multiRemove: (keys: string[]) => { keys.forEach((k) => store.delete(k)); return Promise.resolve(); },
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
  },
}));
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (k: string, v: any): Promise<boolean> => { store.set(k, JSON.stringify(v)); return true; },
}));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

// clearSampleData is dynamically imported inside the migration ONLY on the
// sample-account branch — mock it so we can assert whether it was reached.
const mockClearSampleData = jest.fn(async () => {});
jest.mock('../../utils/sampleDataManager', () => ({ clearSampleData: () => mockClearSampleData() }));

const LOGS_KEY = `${StorageKeyPrefixes.LOGS_V2}default:2026-07-18`;
const INSTANCES_KEY = `${StorageKeyPrefixes.INSTANCES_V2}default:2026-07-18`;

beforeEach(() => {
  store.clear();
  mockClearSampleData.mockClear();
});

describe('SAMPLE_SEED_SHAPE_VERSION 5 → 6 bump + re-seed safety', () => {
  it('the version constant is bumped to at least 6 (v5 accounts must re-migrate)', () => {
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(6);
  });

  it('SAMPLE ACCOUNT at v5 → migrates: wipes stale sample logs/instances + clears init flags + bumps version', async () => {
    store.set('sample_data_seeded', JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_SEED_SHAPE_VERSION, JSON.stringify(5));
    store.set(StorageKeys.SAMPLE_DATA_INITIALIZED, JSON.stringify('true'));
    store.set(StorageKeys.SAMPLE_CORRELATION_GENERATED, JSON.stringify('true'));
    store.set(LOGS_KEY, JSON.stringify([{ stale: true }]));       // pre-trim shape
    store.set(INSTANCES_KEY, JSON.stringify([{ stale: true }]));

    const out = await migrateSampleSeedShape();

    expect(out.migrated).toBe(true);
    expect(out.fromVersion).toBe(5);
    expect(mockClearSampleData).toHaveBeenCalledTimes(1);       // sample branch reached
    expect(store.has(LOGS_KEY)).toBe(false);                    // stale logs wiped
    expect(store.has(INSTANCES_KEY)).toBe(false);               // stale instances wiped
    expect(store.has(StorageKeys.SAMPLE_DATA_INITIALIZED)).toBe(false); // → re-seed will run
    expect(JSON.parse(store.get(StorageKeys.SAMPLE_SEED_SHAPE_VERSION)!)).toBe(SAMPLE_SEED_SHAPE_VERSION);
  });

  it('REAL ACCOUNT at v5 (no sample_data_seeded) → NEVER wiped: real logs/instances survive', async () => {
    // No 'sample_data_seeded' flag — this is a real caregiver.
    store.set(StorageKeys.SAMPLE_SEED_SHAPE_VERSION, JSON.stringify(5));
    store.set(LOGS_KEY, JSON.stringify([{ realCaregiverDose: true }]));
    store.set(INSTANCES_KEY, JSON.stringify([{ realCaregiverInstance: true }]));

    const out = await migrateSampleSeedShape();

    // The migration still runs (version bookkeeping) but the DESTRUCTIVE block
    // is skipped entirely for real accounts.
    expect(mockClearSampleData).not.toHaveBeenCalled();
    expect(store.has(LOGS_KEY)).toBe(true);                     // real data intact
    expect(store.has(INSTANCES_KEY)).toBe(true);
    expect(store.get(LOGS_KEY)).toContain('realCaregiverDose'); // untouched
    // Version bookkeeping advances so it won't re-run every launch.
    expect(JSON.parse(store.get(StorageKeys.SAMPLE_SEED_SHAPE_VERSION)!)).toBe(SAMPLE_SEED_SHAPE_VERSION);
    expect(out.migrated).toBe(true);
  });
});
