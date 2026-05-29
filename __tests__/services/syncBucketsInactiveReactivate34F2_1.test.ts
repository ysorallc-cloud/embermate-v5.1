// ============================================================================
// Phase 34 F2.1 — sync ladders must REACTIVATE inactive items on bucket
// re-enable. Class-of-bug guard across every bucket type.
//
// WALK FAILURE (2026-05-27):
//   F2 walk: wellness bucket enabled + carePlanConfig.wellness.timesOfDay
//   populated, but no wellness instances appeared on Now. Audit traced
//   to layer 3 (storage / item-active state) — wellness items existed
//   in storage with `active: false` (from a prior toggle-off via the
//   b8f0ea11 force-include fix), and the wellness branch in
//   syncOtherBucketsWithConfig lacks a "reactivate inactive items"
//   path that every OTHER bucket has.
//
// CLASS-OF-BUG GUARD (user direction):
//   "Behavioral tests for sync ladders must seed 'prior state exists'
//    cases, not just clean defaults. The seeded-clean trap has now
//    appeared THREE times (toggle-stuck, evening chips, this one)."
//
//   This test seeds the EXACT failure shape — inactive items already
//   in storage + bucket re-enabled — for EVERY bucket type the sync
//   ladders touch. Wellness is RED until the missing branch lands;
//   every other bucket should GREEN immediately (its branch already
//   exists). Any unexpected RED is a second walk-bug surfacing now,
//   not later.
//
// EXPECTED RED→GREEN MATRIX (going in):
//   meds       — has reactivation at syncMedicationItemsWithConfig:188-196
//   vitals     — has reactivation at syncOtherBucketsWithConfig:270-279
//   meals      — has reactivation at syncOtherBucketsWithConfig:436-439
//   wellness   — MISSING (the bug). RED until fix.
//   sleep      — has reactivation at syncOtherBucketsWithConfig:607-610
//   water      — has reactivation at syncOtherBucketsWithConfig:664-… (canonical)
//   activity   — has reactivation at syncOtherBucketsWithConfig:712-… (canonical)
// ============================================================================

const mockState: {
  config: any;
  items: any[];
} = {
  config: null,
  items: [],
};

jest.mock('../../storage/carePlanRepo', () => ({
  getActiveCarePlan: jest.fn(async () => ({
    id: 'cp-test',
    patientId: 'default',
    version: 1,
  })),
  listCarePlanItems: jest.fn(async (_id: string, opts?: { activeOnly?: boolean }) => {
    if (opts?.activeOnly) return mockState.items.filter((i) => i.active);
    return [...mockState.items];
  }),
  listDailyInstances: jest.fn(async () => []),
  upsertDailyInstances: jest.fn(async () => {}),
  updateDailyInstanceStatus: jest.fn(async () => {}),
  removeStaleInstances: jest.fn(async () => {}),
  upsertCarePlanItem: jest.fn(async (item: any) => {
    const idx = mockState.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) mockState.items[idx] = item;
    else mockState.items.push(item);
  }),
  deleteCarePlanItem: jest.fn(async (id: string) => {
    mockState.items = mockState.items.filter((i) => i.id !== id);
  }),
  createCarePlan: jest.fn(async () => ({
    id: 'cp-test',
    patientId: 'default',
    version: 1,
  })),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getCarePlanConfig: jest.fn(async () => mockState.config),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (_key: string, fallback: any) => fallback),
}));

jest.mock('../../utils/devLog', () => ({
  devLog: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

import {
  syncOtherBucketsWithConfig,
  ensureDailyInstances,
} from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

const NOW = new Date().toISOString();

function freshConfig(): any {
  return createDefaultCarePlanConfig('default');
}

function seedWith(configPatch: any, items: any[]) {
  const base = freshConfig();
  mockState.config = { ...base, ...configPatch };
  mockState.items = items.map((i) => ({ ...i }));
}

function activeItemsOfType(type: string): any[] {
  return mockState.items.filter((i) => i.type === type && i.active);
}

// Generic shape for the "I am an existing-but-inactive sync item that
// the user previously had set up before disabling the bucket" seed.
function inactiveSyncItem(
  type: string,
  id: string,
  label: string,
  at: string,
  name = 'Pre-existing item',
): any {
  return {
    id,
    carePlanId: 'cp-test',
    type,
    name,
    priority: 'recommended',
    active: false,
    schedule: {
      frequency: 'daily',
      times: [{ id: `${id}-time`, kind: 'exact', label, at }],
    },
    emoji: '•',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('Phase 34 F2.1 — inactive items reactivate on bucket re-enable (every bucket)', () => {
  beforeEach(() => {
    mockState.config = null;
    mockState.items = [];
  });

  // --------------------------------------------------------------------------
  // VITALS — canonical reactivation branch. Expected GREEN going in.
  // --------------------------------------------------------------------------

  it('contract VITALS: enabled bucket + inactive sync-vitals item → reactivates on next sync', async () => {
    seedWith(
      { vitals: { ...freshConfig().vitals, enabled: true, vitalTypes: ['bp', 'hr'] } },
      [inactiveSyncItem('vitals', 'sync-vitals', 'morning', '08:00', 'Check vitals')],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    expect(activeItemsOfType('vitals').length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // MEALS — per-slot reactivation branch. Expected GREEN going in.
  // --------------------------------------------------------------------------

  it('contract MEALS: enabled bucket + inactive sync-meal-* items → reactivate on next sync', async () => {
    seedWith(
      {
        meals: {
          ...freshConfig().meals,
          enabled: true,
          timesOfDay: ['morning', 'evening'],
        },
      },
      [
        inactiveSyncItem('nutrition', 'sync-meal-morning', 'morning', '08:00', 'Breakfast'),
        inactiveSyncItem('nutrition', 'sync-meal-evening', 'evening', '18:00', 'Dinner'),
      ],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    const activeMeals = mockState.items.filter(
      (i) => i.type === 'nutrition' && i.active && i.id.startsWith('sync-meal-'),
    );
    expect(activeMeals.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // WELLNESS — THE BUG. Expected RED going in until the fix lands.
  // --------------------------------------------------------------------------

  it('contract WELLNESS: enabled bucket + inactive sync-wellness item(s) → reactivate on next sync (BUG H walk-failure repro)', async () => {
    // Seed the exact device state the walk surfaced: three
    // pre-existing inactive wellness items (legacy ids from the
    // pre-F2 trio) + wellness re-enabled in config + timesOfDay
    // populated. Pre-fix the sync ladder's `else` (migration)
    // branch runs and does NOT reactivate. After fix, the canonical
    // reactivation branch fires.
    seedWith(
      {
        wellness: {
          ...freshConfig().wellness,
          enabled: true,
          timesOfDay: ['morning', 'midday', 'evening'],
        },
      },
      [
        inactiveSyncItem('wellness', 'sync-wellness-morning', 'morning', '07:00', 'Morning wellness check'),
        inactiveSyncItem('wellness', 'sync-wellness-evening', 'evening', '20:00', 'Evening wellness check'),
        inactiveSyncItem('wellness', 'sync-wellness-afternoon', 'afternoon', '13:00', 'Afternoon wellness check'),
      ],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    expect(activeItemsOfType('wellness').length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // SLEEP / WATER / ACTIVITY — Phase 34 F4 REFRAME.
  //
  // These three were canonical-reactivation buckets in F2.1. Phase 34
  // F4 made them v1-HIDDEN (MVP_HIDDEN_BUCKETS). The F4 gate means the
  // generator treats them as not-enabled regardless of config.enabled,
  // so an inactive item STAYS inactive (no reactivation in v1) and an
  // active item DEACTIVATES. The reactivation BRANCH still exists in
  // the code (proven by the visible buckets below + the F4 v1.1-unhide
  // path); F4 just gates it shut for these three. config.enabled is
  // preserved — when v1.1 removes a bucket from MVP_HIDDEN_BUCKETS,
  // the reactivation branch fires again. Pinned by
  // mvpHiddenBucketsGeneration34F4.test.ts.
  // --------------------------------------------------------------------------

  it('contract SLEEP (F4 reframe — v1-hidden): inactive sync-sleep item STAYS inactive on sync (reactivation gated by MVP_HIDDEN_BUCKETS)', async () => {
    seedWith(
      { sleep: { ...freshConfig().sleep, enabled: true, timesOfDay: ['morning'] } },
      [inactiveSyncItem('sleep', 'sync-sleep', 'morning', '08:00', 'Log sleep')],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    // Hidden in v1 → no reactivation → no active sleep item.
    expect(activeItemsOfType('sleep').length).toBe(0);
    // But preserved (hide-not-delete) — item still present, inactive.
    expect(mockState.items.filter((i) => i.type === 'sleep').length).toBe(1);
  });

  it('contract WATER (F4 reframe — v1-hidden): inactive sync-hydration item STAYS inactive on sync', async () => {
    seedWith(
      {
        water: {
          ...freshConfig().water,
          enabled: true,
          timesOfDay: ['midday'],
          dailyGoalGlasses: 8,
          units: 'glasses',
        },
      },
      [inactiveSyncItem('hydration', 'sync-hydration', 'afternoon', '12:00', 'Drink water')],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    expect(activeItemsOfType('hydration').length).toBe(0);
    expect(mockState.items.filter((i) => i.type === 'hydration').length).toBe(1);
  });

  it('contract ACTIVITY (F4 reframe — v1-hidden): inactive sync-activity item STAYS inactive on sync', async () => {
    seedWith(
      {
        activity: {
          ...freshConfig().activity,
          enabled: true,
          timesOfDay: ['evening'],
        },
      },
      [inactiveSyncItem('activity', 'sync-activity', 'evening', '18:00', 'Activity check')],
    );
    await syncOtherBucketsWithConfig('cp-test', 'default');
    expect(activeItemsOfType('activity').length).toBe(0);
    expect(mockState.items.filter((i) => i.type === 'activity').length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // MEDS — reactivation lives in syncMedicationItemsWithConfig (a
  // separate, private function). Tested through the public surface
  // ensureDailyInstances, which calls both syncs. Expected GREEN
  // going in.
  // --------------------------------------------------------------------------

  it('contract MEDS: enabled bucket + inactive medication item matching a config med → reactivates on next sync', async () => {
    const configMed = {
      id: 'med-aspirin',
      name: 'Aspirin',
      dosage: '81mg',
      timesOfDay: ['morning'],
      customTimes: ['08:00'],
      active: true,
    };
    seedWith(
      {
        meds: {
          ...freshConfig().meds,
          enabled: true,
          medications: [configMed],
        },
      },
      [
        {
          id: 'pre-existing-aspirin-item',
          carePlanId: 'cp-test',
          type: 'medication',
          name: 'Aspirin 81mg',
          priority: 'recommended',
          active: false,
          schedule: {
            frequency: 'daily',
            times: [
              { id: 'pre-aspirin-time', kind: 'exact', label: 'morning', at: '08:00' },
            ],
          },
          medicationDetails: { medicationId: 'med-aspirin' },
          emoji: '💊',
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    );
    await ensureDailyInstances('default', new Date().toISOString().slice(0, 10));
    const activeMeds = mockState.items.filter(
      (i) => i.type === 'medication' && i.active,
    );
    expect(activeMeds.length).toBeGreaterThan(0);
  });
});
