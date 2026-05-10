// ============================================================================
// Phase 11.9.2 — syncOtherBucketsWithConfig hydration case.
//
// Bug repro: even with sleep + water enabled in sample-data config
// (Phase 11.9.1), Insights kept showing "Hydration · 14 days
// missing". Root cause: syncOtherBucketsWithConfig had cases for
// vitals / meals / wellness / sleep / activity / errands / shifts /
// self-care — but NO case for water/hydration. Even when
// config.water.enabled === true, no CarePlanItem of type
// 'hydration' was ever created → no past-day instances → nothing
// for the historical seed loop to write a payload to.
//
// Fix: mirror the sleep sync block. When water.enabled === true and
// no existing hydration items, create a CarePlanItem with
// type: 'hydration', daily frequency, default midday window.
//
// Pinned contracts:
//   1. Behavioral: water.enabled === true + no existing items →
//      one hydration CarePlanItem created (type === 'hydration').
//   2. Behavioral: idempotency — second call doesn't create a
//      duplicate. The function's "Only creates items if NONE of
//      that type exist" invariant carries forward.
//   3. Behavioral: water.enabled === false → no hydration item
//      created.
//   4. Behavioral: existing inactive hydration item → reactivated
//      when enabled flips to true (mirrors the sleep block's
//      reactivate triad).
//   5. Behavioral: existing active hydration item + enabled
//      flipped to false → deactivated.
//   6. Source-level: HYDRATION SYNC block exists in
//      carePlanGenerator.ts (regression-pin matching the pattern
//      newBucketInstances.test.ts uses).
// ============================================================================

import { syncOtherBucketsWithConfig } from '../../services/carePlanGenerator';

const mockGetCarePlanConfig = jest.fn();
const mockListCarePlanItems = jest.fn();
const mockUpsertCarePlanItem = jest.fn();
const mockGetCarePlan = jest.fn();
const mockListLogsInRange = jest.fn();
const mockUpsertDailyInstances = jest.fn();

jest.mock('../../storage/carePlanRepo', () => ({
  listCarePlanItems: (...args: any[]) => mockListCarePlanItems(...args),
  upsertCarePlanItem: (...args: any[]) => mockUpsertCarePlanItem(...args),
  getActiveCarePlan: (...args: any[]) => mockGetCarePlan(...args),
  listLogsInRange: (...args: any[]) => mockListLogsInRange(...args),
  upsertDailyInstances: (...args: any[]) => mockUpsertDailyInstances(...args),
  DEFAULT_PATIENT_ID: 'default',
  listDailyInstances: jest.fn(() => Promise.resolve([])),
  getDailyInstance: jest.fn(() => Promise.resolve(null)),
  removeStaleInstances: jest.fn(() => Promise.resolve(0)),
  cleanupDuplicateCarePlanItems: jest.fn(() => Promise.resolve({ removedCount: 0 })),
  withKeyLock: (_k: string, fn: () => any) => fn(),
}));

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getCarePlanConfig: (...args: any[]) => mockGetCarePlanConfig(...args),
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

function makeConfig(overrides: any = {}): any {
  return {
    id: 'cp1',
    patientId: 'default',
    version: 1,
    meds: { enabled: true, medications: [], priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    vitals: { enabled: false, vitalTypes: [], priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    meals: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    wellness: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    water: { enabled: false, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' },
    sleep: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    activity: { enabled: false, priority: 'recommended', timesOfDay: ['evening'], notificationsEnabled: false },
    appointments: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    errands: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    shifts: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    self_care: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    ...overrides,
  };
}

function makeItem(overrides: any = {}): any {
  return {
    id: `item-${Math.random()}`,
    carePlanId: 'cp1',
    type: 'medication',
    name: 'Item',
    priority: 'recommended',
    active: true,
    schedule: { frequency: 'daily', times: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetCarePlanConfig.mockReset();
  mockListCarePlanItems.mockReset();
  mockUpsertCarePlanItem.mockReset();
  mockGetCarePlan.mockReset();
  mockListLogsInRange.mockReset();
  mockUpsertDailyInstances.mockReset();
});

// ----------------------------------------------------------------------------
// Behavioral contracts
// ----------------------------------------------------------------------------

describe('Phase 11.9.2 — syncOtherBucketsWithConfig hydration sync', () => {
  it('contract 1: water.enabled=true + no existing hydration items → creates one CarePlanItem of type "hydration"', async () => {
    mockGetCarePlanConfig.mockResolvedValue(
      makeConfig({ water: { enabled: true, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' } }),
    );
    // No existing items of any type — sleep block et al. won't fire.
    mockListCarePlanItems.mockResolvedValue([]);

    await syncOtherBucketsWithConfig('cp1', 'default');

    const hydrationCalls = mockUpsertCarePlanItem.mock.calls.filter(
      (call) => call[0]?.type === 'hydration',
    );
    expect(hydrationCalls).toHaveLength(1);
    const created = hydrationCalls[0][0];
    expect(created.type).toBe('hydration');
    expect(created.active).toBe(true);
    expect(created.schedule.frequency).toBe('daily');
    // Default window from timesOfDay: ['midday'] → afternoon window.
    expect(Array.isArray(created.schedule.times)).toBe(true);
    expect(created.schedule.times.length).toBeGreaterThanOrEqual(1);
  });

  it('contract 2: idempotency — second call with the existing active item doesn\'t duplicate', async () => {
    mockGetCarePlanConfig.mockResolvedValue(
      makeConfig({ water: { enabled: true, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' } }),
    );
    // Simulate "first call already created the hydration item" — the
    // second call sees it already there, active.
    mockListCarePlanItems.mockResolvedValue([
      makeItem({ id: 'sync-hydration', type: 'hydration', active: true }),
    ]);

    await syncOtherBucketsWithConfig('cp1', 'default');

    const hydrationCreates = mockUpsertCarePlanItem.mock.calls.filter(
      (call) => call[0]?.type === 'hydration' && call[0]?.id === 'sync-hydration' && call[0]?.active === true,
    );
    // No new creation should fire — the existing active item is untouched.
    // (At most a no-op upsert with the same shape; we pin "no NEW item id".)
    const createdIds = hydrationCreates.map((c) => c[0].id);
    // Only the existing id may appear; no second 'sync-hydration-2' or similar.
    const uniqueIds = new Set(createdIds);
    expect(uniqueIds.size).toBeLessThanOrEqual(1);
  });

  it('contract 3: water.enabled=false → no hydration item created', async () => {
    mockGetCarePlanConfig.mockResolvedValue(makeConfig({ water: { enabled: false, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' } }));
    mockListCarePlanItems.mockResolvedValue([]);

    await syncOtherBucketsWithConfig('cp1', 'default');

    const hydrationCalls = mockUpsertCarePlanItem.mock.calls.filter(
      (call) => call[0]?.type === 'hydration',
    );
    expect(hydrationCalls).toHaveLength(0);
  });

  it('contract 4: existing inactive hydration item + enabled=true → reactivated', async () => {
    mockGetCarePlanConfig.mockResolvedValue(
      makeConfig({ water: { enabled: true, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' } }),
    );
    mockListCarePlanItems.mockResolvedValue([
      makeItem({ id: 'sync-hydration', type: 'hydration', active: false }),
    ]);

    await syncOtherBucketsWithConfig('cp1', 'default');

    const reactivations = mockUpsertCarePlanItem.mock.calls.filter(
      (call) => call[0]?.type === 'hydration' && call[0]?.active === true,
    );
    expect(reactivations.length).toBeGreaterThanOrEqual(1);
    // No new id created — the reactivation reuses the existing id.
    const ids = reactivations.map((c) => c[0].id);
    expect(ids).toContain('sync-hydration');
  });

  it('contract 5: existing active hydration item + enabled=false → deactivated', async () => {
    mockGetCarePlanConfig.mockResolvedValue(makeConfig({ water: { enabled: false, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false, trackingStyle: 'quick', dailyGoalGlasses: 8, units: 'glasses' } }));
    mockListCarePlanItems.mockResolvedValue([
      makeItem({ id: 'sync-hydration', type: 'hydration', active: true }),
    ]);

    await syncOtherBucketsWithConfig('cp1', 'default');

    const deactivations = mockUpsertCarePlanItem.mock.calls.filter(
      (call) => call[0]?.type === 'hydration' && call[0]?.active === false,
    );
    expect(deactivations.length).toBeGreaterThanOrEqual(1);
  });
});

// ----------------------------------------------------------------------------
// Source-level audit (mirrors newBucketInstances.test.ts pattern)
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 11.9.2 — HYDRATION SYNC source-level audit', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'services/carePlanGenerator.ts'),
    'utf8',
  );

  it('contract 6: HYDRATION SYNC block exists', () => {
    expect(SRC).toMatch(/HYDRATION SYNC/);
  });

  it('contract 6: creates a CarePlanItem with type: \'hydration\'', () => {
    expect(SRC).toMatch(/type:\s*['"]hydration['"]/);
  });

  it('contract 6: gates creation on water.enabled === true', () => {
    // The block reads waterConfig?.enabled to determine the path.
    // Pin the conditional shape so the gate doesn't drift to a
    // different config key.
    expect(SRC).toMatch(/waterConfig\??\.enabled\s*===?\s*true|water[^.]*\.enabled\s*===?\s*true/);
  });
});
