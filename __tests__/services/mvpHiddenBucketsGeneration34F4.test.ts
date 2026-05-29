// ============================================================================
// Phase 34 F4 — generation behavior for v1-hidden buckets (prior-state seeded).
//
// Class-of-bug fix (Model B): hiding Water/Sleep/Activity from Care Plan
// must ALSO stop them generating instances on Now — otherwise it's the
// reverse "control doesn't control" (instances a caregiver can't disable).
// The generator gates each bucket's enabled-check with !MVP_HIDDEN_BUCKETS,
// so an existing user's active items DEACTIVATE via the F2.1 branch
// (shipped at 42b73f95). config.{bucket}.enabled is PRESERVED — no
// migration, no deletion. v1.1 unhide → reactivation branch resurrects.
//
// SEED PRIOR STATE (the standing F2.1 lesson): the dangerous direction is
// the EXISTING user who had Water/Sleep/Activity enabled with live daily
// instances. Confirm those items go INACTIVE but are NOT deleted, and
// config.enabled is untouched.
// ============================================================================

const mockState: { config: any; items: any[] } = { config: null, items: [] };

jest.mock('../../storage/carePlanRepo', () => ({
  getActiveCarePlan: jest.fn(async () => ({ id: 'cp-test', patientId: 'default', version: 1 })),
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
  createCarePlan: jest.fn(async () => ({ id: 'cp-test', patientId: 'default', version: 1 })),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getCarePlanConfig: jest.fn(async () => mockState.config),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (_key: string, fallback: any) => fallback),
}));

jest.mock('../../utils/devLog', () => ({ devLog: jest.fn(), logError: jest.fn() }));
jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));

import { syncOtherBucketsWithConfig } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

const NOW = new Date().toISOString();

function freshConfig(): any {
  return createDefaultCarePlanConfig('default');
}

function activeItemsOfType(type: string): any[] {
  return mockState.items.filter((i) => i.type === type && i.active);
}
function allItemsOfType(type: string): any[] {
  return mockState.items.filter((i) => i.type === type);
}

function syncItem(type: string, id: string, label: string, at: string): any {
  return {
    id, carePlanId: 'cp-test', type, name: `${type} item`,
    priority: 'recommended', active: true,
    schedule: { frequency: 'daily', times: [{ id: `${id}-t`, kind: 'exact', label, at }] },
    emoji: '•', createdAt: NOW, updatedAt: NOW,
  };
}

describe('Phase 34 F4 — hidden buckets stop generating; existing items deactivate (not delete)', () => {
  beforeEach(() => {
    mockState.config = null;
    mockState.items = [];
  });

  // --------------------------------------------------------------------------
  // EXISTING USER — had Water/Sleep/Activity enabled with live items.
  // --------------------------------------------------------------------------

  it('contract 1 (PRIOR STATE — water): existing active hydration item + water.enabled=true → DEACTIVATED, not deleted', async () => {
    const base = freshConfig();
    mockState.config = { ...base, water: { ...base.water, enabled: true } };
    mockState.items = [syncItem('hydration', 'sync-hydration', 'afternoon', '12:00')];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    // Item DEACTIVATED — no active hydration instance generates on Now.
    expect(activeItemsOfType('hydration').length).toBe(0);
    // But NOT deleted — still present in storage (hide-not-delete).
    expect(allItemsOfType('hydration').length).toBe(1);
    expect(allItemsOfType('hydration')[0].active).toBe(false);
  });

  it('contract 2 (PRIOR STATE — sleep): existing active sleep item + sleep.enabled=true → DEACTIVATED, not deleted', async () => {
    const base = freshConfig();
    mockState.config = { ...base, sleep: { ...base.sleep, enabled: true } };
    mockState.items = [syncItem('sleep', 'sync-sleep', 'morning', '08:00')];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    expect(activeItemsOfType('sleep').length).toBe(0);
    expect(allItemsOfType('sleep').length).toBe(1);
    expect(allItemsOfType('sleep')[0].active).toBe(false);
  });

  it('contract 3 (PRIOR STATE — activity): existing active activity item + activity.enabled=true → DEACTIVATED, not deleted', async () => {
    const base = freshConfig();
    mockState.config = { ...base, activity: { ...base.activity, enabled: true } };
    mockState.items = [syncItem('activity', 'sync-activity', 'evening', '18:00')];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    expect(activeItemsOfType('activity').length).toBe(0);
    expect(allItemsOfType('activity').length).toBe(1);
    expect(allItemsOfType('activity')[0].active).toBe(false);
  });

  it('contract 4 (HIDE-NOT-DELETE): config.{water,sleep,activity}.enabled is PRESERVED after sync (no migration)', async () => {
    const base = freshConfig();
    mockState.config = {
      ...base,
      water: { ...base.water, enabled: true },
      sleep: { ...base.sleep, enabled: true },
      activity: { ...base.activity, enabled: true },
    };
    mockState.items = [
      syncItem('hydration', 'sync-hydration', 'afternoon', '12:00'),
      syncItem('sleep', 'sync-sleep', 'morning', '08:00'),
      syncItem('activity', 'sync-activity', 'evening', '18:00'),
    ];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    // The generator gate is read-time; it must NOT have written
    // enabled=false back into config (that would be a migration /
    // data deletion of the user's genuine selection).
    expect(mockState.config.water.enabled).toBe(true);
    expect(mockState.config.sleep.enabled).toBe(true);
    expect(mockState.config.activity.enabled).toBe(true);
  });

  // --------------------------------------------------------------------------
  // FRESH USER — hidden buckets default disabled; nothing generates.
  // --------------------------------------------------------------------------

  it('contract 5 (FRESH USER): default config (hidden buckets disabled) → no hidden-bucket items created', async () => {
    mockState.config = freshConfig(); // water/sleep/activity default enabled=false
    mockState.items = [];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    expect(allItemsOfType('hydration').length).toBe(0);
    expect(allItemsOfType('sleep').length).toBe(0);
    expect(allItemsOfType('activity').length).toBe(0);
  });

  it('contract 6 (FRESH USER, hidden bucket toggled on in config but generator still gates it): water.enabled=true, no prior items → STILL no item created (hidden gate beats enabled)', async () => {
    // Defends the gate from the other direction: even if some path
    // sets water.enabled=true (e.g. legacy state), the generator
    // must not CREATE a hidden-bucket item. The hidden gate wins.
    const base = freshConfig();
    mockState.config = { ...base, water: { ...base.water, enabled: true } };
    mockState.items = [];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    expect(allItemsOfType('hydration').length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // VISIBLE buckets unaffected — vitals/meals still generate normally.
  // --------------------------------------------------------------------------

  it('contract 7 (VISIBLE UNAFFECTED): vitals still generates when enabled (F4 only gates the hidden four)', async () => {
    const base = freshConfig();
    mockState.config = {
      ...base,
      vitals: { ...base.vitals, enabled: true, vitalTypes: ['bp', 'hr'] },
    };
    mockState.items = [];

    await syncOtherBucketsWithConfig('cp-test', 'default');

    expect(activeItemsOfType('vitals').length).toBeGreaterThan(0);
  });
});
