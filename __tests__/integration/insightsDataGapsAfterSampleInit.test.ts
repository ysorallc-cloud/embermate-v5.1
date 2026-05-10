// ============================================================================
// Phase 11.9.3 — integration: Insights data gaps disappear after a
// fresh sample-data initialization end-to-end.
//
// This is the user-visible-symptom contract for Phase 11.9.
// 11.9.1 enabled sleep + water in sample-data config.
// 11.9.2 added the hydration sync case so a CarePlanItem actually
// gets created when water.enabled === true.
// 11.9.3 bumps SAMPLE_SEED_SHAPE_VERSION so existing testers re-seed
// under both fixes on next launch — and pins the integration:
// initialize sample data → load pageData → computeDataGaps no
// longer surfaces "Sleep" / "Hydration" / "Evening wellness".
//
// Runs the full path with mocked AsyncStorage in-memory. Heavier
// than the unit tests upstream, but the behavioral assertion is
// what matters here — the chain has multiple links and only the
// integrated assertion proves all three commits compose correctly.
// ============================================================================

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
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, store.get(k) ?? null] as [string, string | null])),
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
    clear: () => { store.clear(); return Promise.resolve(); },
  },
}));

// Real safeStorage shape: JSON.stringify on write, JSON.parse on
// read. encryptedSetRaw stores raw — sample-data uses it for some
// keys; route through the same map so the round-trip works.
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
  encryptedSetRaw: async (k: string, raw: string): Promise<boolean> => {
    store.set(k, raw);
    return true;
  },
  encryptedGetRaw: async (k: string): Promise<string | null> => {
    return store.get(k) ?? null;
  },
  isSensitiveKey: () => false,
  safeJSONParse: <T,>(s: string | null, fallback: T): T => {
    if (!s) return fallback;
    try { return JSON.parse(s) as T; } catch { return fallback; }
  },
}));

// Notification service is dynamically imported inside ensureDailyInstances;
// stub it so the path doesn't try to schedule real notifications.
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

// Patient registry — the integration uses DEFAULT_PATIENT_ID.
jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

import { initializeSampleData } from '../../utils/sampleDataGenerator';
import { loadUnderstandPageData } from '../../utils/understandInsights';
import { computeDataGaps } from '../../utils/insightsDataGaps';

beforeEach(() => {
  store.clear();
  // Mark sample-data as opt-in so initializeSampleData runs.
  store.set('sample_data_seeded', JSON.stringify('true'));
});

describe('Phase 11.9.3 — Insights data gaps after sample-data init', () => {
  it('computeDataGaps does NOT include "Sleep" after fresh init', async () => {
    await initializeSampleData();
    const pageData = await loadUnderstandPageData(14);
    const gaps = computeDataGaps(pageData, 14);
    const metrics = gaps.map((g) => g.metric);
    expect(metrics).not.toContain('Sleep');
  });

  it('computeDataGaps does NOT include "Hydration" after fresh init', async () => {
    await initializeSampleData();
    const pageData = await loadUnderstandPageData(14);
    const gaps = computeDataGaps(pageData, 14);
    const metrics = gaps.map((g) => g.metric);
    expect(metrics).not.toContain('Hydration');
  });

  it('computeDataGaps does NOT include "Evening wellness" after fresh init', async () => {
    await initializeSampleData();
    const pageData = await loadUnderstandPageData(14);
    const gaps = computeDataGaps(pageData, 14);
    const metrics = gaps.map((g) => g.metric);
    expect(metrics).not.toContain('Evening wellness');
  });

  it('pageData carries non-zero avgs for the three formerly-flagged metrics', async () => {
    // Direct-cause pin: the gaps disappear because the underlying
    // averages are populated. If averages are 0, gaps surface again.
    await initializeSampleData();
    const pageData = await loadUnderstandPageData(14);
    expect(pageData.avgSleepHours).toBeGreaterThan(0);
    expect(pageData.avgHydrationPerDay).toBeGreaterThan(0);
    expect(pageData.avgWellnessPerDay).toBeGreaterThan(0);
  });
});

describe('Phase 11.9.3 — SAMPLE_SEED_SHAPE_VERSION bump', () => {
  it('SAMPLE_SEED_SHAPE_VERSION is at least 3 (forces re-migration on testers stuck at 2)', async () => {
    const { SAMPLE_SEED_SHAPE_VERSION } = await import('../../utils/sampleDataGenerator');
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(3);
  });
});
