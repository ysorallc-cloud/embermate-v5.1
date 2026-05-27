// ============================================================================
// Phase 34 F3 — Bug A: close the migration-block bypass + remove the
// hidden afternoon. F1 contract 6 fully flips here (both bypasses
// closed). Legacy-times artifact F2.1 flagged resolves as a side-
// effect of the reconciliation pass.
//
// USER-LOCKED SCOPE:
//   • Delete the force-add-afternoon block at
//     carePlanGenerator.ts:~592-618 (the F3-bound exception).
//   • Reconciliation pass replaces F2.1's reactivate-only branch +
//     the migration block. Every existing wellness item routes
//     through the same shared resolver F2 fresh-state uses; legacy
//     items get reactivated + canonical-time-reconciled OR
//     deactivated (hide-not-delete) based on whether their TimeOfDay
//     is in carePlanConfig.wellness.timesOfDay.
//   • carePlanConfig.wellness.timesOfDay is read-only at F3 (never
//     written). Stored selections preserved.
//   • Id-suffix → TimeOfDay map is reconciliation-local and PARSE-
//     only (no new wellness item written with a per-period legacy
//     id form). Unknown suffixes return null — no silent default.
//
// CONTRACT LIST:
//   Behavioral (8):
//     1. Fresh user, partial selection — no afternoon force-injected.
//     2. Legacy device, full selection — reactivate all + canonical times.
//     3. Legacy device drops midday — afternoon DEACTIVATED, others kept.
//     4. Stored midday → afternoon @ 12:00 (F1 invariant).
//     5. No midday → no afternoon, period.
//     6. Consolidated sync-wellness drift — schedule.times reconciled.
//     7. Hide-not-delete — deactivated items REMAIN in storage.
//     8. F2.1 inactive-reactivate class guard still holds.
//   Guards (2):
//     9. Id-bridge map is PARSE-only — no upsertCarePlanItem call
//        writes a per-period legacy-form id post-F3.
//     10. Unknown id suffix → no reactivation/deactivation; item
//         left untouched (no silent misroute).
// ============================================================================

const mockState: {
  config: any;
  items: any[];
} = { config: null, items: [] };

jest.mock('../../storage/carePlanRepo', () => ({
  getActiveCarePlan: jest.fn(async () => ({
    id: 'cp-test',
    patientId: 'default',
    version: 1,
  })),
  listCarePlanItems: jest.fn(
    async (_id: string, opts?: { activeOnly?: boolean }) => {
      if (opts?.activeOnly) return mockState.items.filter((i) => i.active);
      return [...mockState.items];
    },
  ),
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

import { syncOtherBucketsWithConfig } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

const NOW = new Date().toISOString();

function freshConfig(): any {
  return createDefaultCarePlanConfig('default');
}

function seedConfig(timesOfDay: string[] | undefined) {
  const base = freshConfig();
  mockState.config = {
    ...base,
    wellness: { ...base.wellness, enabled: true, timesOfDay },
  };
  mockState.items = [];
}

function seedLegacyItems(activeFlags: { morning: boolean; evening: boolean; afternoon: boolean }) {
  // Pre-F2 wellness trio. Times at the DRIFTED pre-F1 values
  // (07:00 / 20:00 / 13:00) — F3's reconciliation should rewrite
  // these to canonical 08:00 / 18:00 / 12:00 when the item is in
  // the user's timesOfDay selection.
  const trio = [
    {
      id: 'sync-wellness-morning', label: 'morning', at: '07:00',
      name: 'Morning wellness check', active: activeFlags.morning,
    },
    {
      id: 'sync-wellness-evening', label: 'evening', at: '20:00',
      name: 'Evening wellness check', active: activeFlags.evening,
    },
    {
      id: 'sync-wellness-afternoon', label: 'afternoon', at: '13:00',
      name: 'Afternoon wellness check', active: activeFlags.afternoon,
    },
  ];
  mockState.items = trio.map((t) => ({
    id: t.id,
    carePlanId: 'cp-test',
    type: 'wellness',
    name: t.name,
    priority: 'recommended',
    active: t.active,
    schedule: {
      frequency: 'daily',
      times: [{ id: `${t.id}-time`, kind: 'exact', label: t.label, at: t.at }],
    },
    emoji: '•',
    createdAt: NOW,
    updatedAt: NOW,
  }));
}

function wellnessItems() {
  return mockState.items.filter(
    (i) => i.type === 'wellness' && !i.id.startsWith('sample-'),
  );
}

function activeTimes(): Array<{ id: string; label: string; at: string }> {
  return wellnessItems()
    .filter((i) => i.active)
    .flatMap((i) =>
      (i.schedule?.times ?? []).map((t: any) => ({ id: i.id, label: t.label, at: t.at })),
    );
}

describe('Phase 34 F3 — wellness reconciliation closes migration-block bypass, no hidden afternoon', () => {
  beforeEach(() => {
    mockState.config = null;
    mockState.items = [];
  });

  // --------------------------------------------------------------------------
  // BEHAVIORAL — both directions + legacy state + hide-not-delete
  // --------------------------------------------------------------------------

  it('contract 1 (NO FORCE-INJECT): fresh user, timesOfDay = ["morning","evening"] → exactly 2 active times, NO afternoon', async () => {
    seedConfig(['morning', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = activeTimes();
    expect(times.length).toBe(2);
    expect(times.find((t) => t.label === 'afternoon')).toBeUndefined();
    expect(times).toContainEqual({ id: 'sync-wellness', label: 'morning', at: '08:00' });
    expect(times).toContainEqual({ id: 'sync-wellness', label: 'evening', at: '18:00' });
  });

  it('contract 2 (LEGACY FULL): pre-F2 trio at OLD times + timesOfDay full → reactivate all + reconcile times to canonical', async () => {
    seedConfig(['morning', 'midday', 'evening']);
    // Items pre-existing with all THREE windows, all inactive
    // (the device-walk shape: prior toggle-off left them inactive
    // at OLD pre-F1 times).
    seedLegacyItems({ morning: false, evening: false, afternoon: false });

    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = activeTimes();
    expect(times.length).toBe(3);
    // Times rewritten to canonical TIME_OF_DAY_DEFAULTS via the
    // shared resolver. Pre-F3 the F2.1 reactivation reactivated
    // at the OLD stored times; F3 reconciles in the same pass.
    expect(times).toContainEqual({ id: 'sync-wellness-morning', label: 'morning', at: '08:00' });
    expect(times).toContainEqual({ id: 'sync-wellness-evening', label: 'evening', at: '18:00' });
    expect(times).toContainEqual({ id: 'sync-wellness-afternoon', label: 'afternoon', at: '12:00' });
  });

  it('contract 3 (LEGACY DROPS MIDDAY): pre-F2 trio active + timesOfDay = ["morning","evening"] → afternoon DEACTIVATED, morning+evening canonical', async () => {
    seedConfig(['morning', 'evening']);
    // All three legacy items currently active (the pre-F3 force-
    // add-afternoon shape — afternoon was always there regardless
    // of what user selected).
    seedLegacyItems({ morning: true, evening: true, afternoon: true });

    await syncOtherBucketsWithConfig('cp-test', 'default');

    const active = activeTimes();
    // Morning + evening reconciled to canonical times.
    expect(active).toContainEqual({ id: 'sync-wellness-morning', label: 'morning', at: '08:00' });
    expect(active).toContainEqual({ id: 'sync-wellness-evening', label: 'evening', at: '18:00' });
    // Afternoon deactivated — no longer in active times.
    expect(active.find((t) => t.id === 'sync-wellness-afternoon')).toBeUndefined();
  });

  it('contract 4 (F1 INVARIANT — stored midday): timesOfDay contains "midday" → afternoon item present at 12:00', async () => {
    seedConfig(['morning', 'midday', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = activeTimes();
    const afternoon = times.find((t) => t.label === 'afternoon');
    expect(afternoon).toBeDefined();
    expect(afternoon!.at).toBe('12:00');
  });

  it('contract 5 (NO MIDDAY → NO AFTERNOON): fresh user without "midday" → label "afternoon" absent from all active times', async () => {
    seedConfig(['morning', 'evening']);
    await syncOtherBucketsWithConfig('cp-test', 'default');

    const times = activeTimes();
    expect(times.find((t) => t.label === 'afternoon')).toBeUndefined();
  });

  it('contract 6 (CONSOLIDATED DRIFT): existing sync-wellness item with stale 3-time schedule + timesOfDay shrinks to 2 → schedule.times reconciled', async () => {
    seedConfig(['morning', 'evening']);
    // Existing consolidated item carrying 3 times (a user who was
    // on the F2 path, then later dropped midday from timesOfDay).
    mockState.items = [{
      id: 'sync-wellness',
      carePlanId: 'cp-test',
      type: 'wellness',
      name: 'Wellness check',
      priority: 'recommended',
      active: true,
      schedule: {
        frequency: 'daily',
        times: [
          { id: 'sync-wellness-morning-time', kind: 'exact', label: 'morning', at: '08:00' },
          { id: 'sync-wellness-midday-time', kind: 'exact', label: 'afternoon', at: '12:00' },
          { id: 'sync-wellness-evening-time', kind: 'exact', label: 'evening', at: '18:00' },
        ],
      },
      emoji: '🌅',
      createdAt: NOW,
      updatedAt: NOW,
    }];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    const consolidated = mockState.items.find((i) => i.id === 'sync-wellness');
    expect(consolidated).toBeDefined();
    expect(consolidated!.active).toBe(true);
    expect(consolidated!.schedule.times.length).toBe(2);
    const labels = consolidated!.schedule.times.map((t: any) => t.label);
    expect(labels.sort()).toEqual(['evening', 'morning']);
    expect(labels).not.toContain('afternoon');
  });

  it('contract 7 (HIDE-NOT-DELETE): deactivated legacy items REMAIN in storage with active:false, never deleted', async () => {
    seedConfig(['morning', 'evening']); // no midday — afternoon should deactivate
    seedLegacyItems({ morning: true, evening: true, afternoon: true });

    await syncOtherBucketsWithConfig('cp-test', 'default');

    // All three items still exist in storage.
    const allWellness = mockState.items.filter((i) => i.type === 'wellness');
    expect(allWellness.length).toBe(3);
    // Afternoon item present with active: false (hidden, not deleted).
    const afternoon = allWellness.find((i) => i.id === 'sync-wellness-afternoon');
    expect(afternoon).toBeDefined();
    expect(afternoon!.active).toBe(false);
    // Its schedule.times array also preserved (not nulled).
    expect(afternoon!.schedule?.times?.length).toBeGreaterThan(0);
  });

  it('contract 8 (F2.1 CLASS GUARD HOLDS): inactive-items reactivate path still works (subsumed into reconciliation)', async () => {
    // F2.1 added the reactivation branch. F3 subsumes it into the
    // reconciliation pass; the user-observable behavior (toggle
    // off then on → items reactivate) must still hold.
    seedConfig(['morning', 'midday', 'evening']);
    seedLegacyItems({ morning: false, evening: false, afternoon: false });

    await syncOtherBucketsWithConfig('cp-test', 'default');

    const active = wellnessItems().filter((i) => i.active);
    expect(active.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // GUARDS (per user direction) — id-bridge map is parse-only +
  // unknown suffixes return null (no silent misroute).
  // --------------------------------------------------------------------------

  it('contract 9 (ID-BRIDGE READ-ONLY): no upsertCarePlanItem writes a per-period legacy-form id post-F3 (consolidated id only)', async () => {
    // The id-suffix bridge map (ID_SUFFIX_TO_TOD or similar) is a
    // PARSE helper for legacy ids — it must NEVER produce a write
    // path that creates a new item with the per-period legacy id
    // form (sync-wellness-morning / -evening / -afternoon). Any
    // new wellness item written post-F3 must use the consolidated
    // 'sync-wellness' id from the F2 fresh-state branch.
    seedConfig(['morning', 'evening']);
    mockState.items = []; // fresh state — fresh-state branch fires

    const { upsertCarePlanItem } = require('../../storage/carePlanRepo');
    (upsertCarePlanItem as jest.Mock).mockClear();
    await syncOtherBucketsWithConfig('cp-test', 'default');

    // Inspect every wellness-typed item the generator wrote.
    const wellnessWrites = (upsertCarePlanItem as jest.Mock).mock.calls
      .map((args: any[]) => args[0])
      .filter((item: any) => item.type === 'wellness');

    // Each wellness item written has id 'sync-wellness' (the
    // consolidated form). NO new per-period legacy ids written.
    for (const item of wellnessWrites) {
      expect(item.id).toBe('sync-wellness');
      expect(item.id).not.toMatch(/^sync-wellness-(morning|afternoon|evening)$/);
    }
  });

  it('contract 10 (UNKNOWN SUFFIX): a wellness item with an unrecognized id suffix is LEFT UNTOUCHED (no silent misroute)', async () => {
    // A future renamed or added suffix must not silently default
    // to morning or to anything. The reconciliation pass returns
    // null on unknown lookup → the item is left exactly as
    // seeded (no reactivation, no deactivation, no schedule
    // rewrite). Future maintainer must explicitly add a mapping.
    seedConfig(['morning', 'midday', 'evening']);
    const unknownItem = {
      id: 'sync-wellness-noon', // not in the bridge map
      carePlanId: 'cp-test',
      type: 'wellness',
      name: 'Noon wellness check',
      priority: 'recommended',
      active: true, // start active to verify it's NOT deactivated
      schedule: {
        frequency: 'daily',
        times: [{ id: 'sync-wellness-noon-time', kind: 'exact', label: 'afternoon', at: '11:30' }],
      },
      emoji: '🕛',
      createdAt: NOW,
      updatedAt: NOW,
    };
    mockState.items = [unknownItem];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    // Item still present, still active, schedule.times byte-
    // identical to the seed (no silent misroute to morning/etc.).
    const after = mockState.items.find((i) => i.id === 'sync-wellness-noon');
    expect(after).toBeDefined();
    expect(after!.active).toBe(true);
    expect(after!.schedule.times[0].at).toBe('11:30');
    expect(after!.schedule.times[0].label).toBe('afternoon');
  });
});
