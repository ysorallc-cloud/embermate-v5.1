// ============================================================================
// Phase 32A F1 — defensive Care Plan config migration for MVP-suppressed buckets.
//
// 32A retires the errands / shifts / self_care rows from the management
// toggle UI via a render filter (F3). Devices that toggled any of those
// three buckets ON before today's render filter still carry
// `enabled: true` in storage — their Now-tab ProgressRings + the
// carePlanGenerator sync path will continue to surface those items, but
// the user has no surface to disable them after F3 ships.
//
// F1 closes that orphan window with a one-time defensive migration:
//
//   • Bump a NEW `schemaVersion` field on `CarePlanConfig` (previously
//     absent; existing repos use a `version` write-counter that
//     increments on every save — NOT a schema version).
//   • On read, configs with `schemaVersion < CURRENT` get
//     `errands.enabled`, `shifts.enabled`, `self_care.enabled` forced to
//     false, and `schemaVersion` set to the current value.
//   • Persisted back so the next read is migration-free.
//   • Non-destructive: only the `enabled` flag flips. All other bucket
//     fields (timesOfDay, priority, notificationsEnabled, etc.) are
//     preserved verbatim.
//   • Idempotent: configs already at the current schemaVersion pass
//     through unchanged with no storage write.
//   • Fresh installs created by `createDefaultCarePlanConfig` are stamped
//     at the current schemaVersion so they never run the migration.
//
// Sequenced BEFORE F3 (render filter) so no device upgrading
// mid-rollout sees the orphan-window race.
//
// Pinned contracts:
//   1. Pre-migration config (errands.enabled=true, no schemaVersion) →
//      after getCarePlanConfig → errands.enabled=false, schemaVersion=1.
//   2. Same for shifts.
//   3. Same for self_care.
//   4. Other bucket enabled-state preserved (meds, vitals, water, etc.).
//   5. Non-suppressed fields on the suppressed buckets preserved
//      (timesOfDay, priority, notificationsEnabled).
//   6. Persisted: a second read sees the migrated state without
//      running the migration again (idempotent at the storage layer).
//   7. Idempotent: a config already at schemaVersion=1 with
//      errands.enabled=true (post-migration manual write) is NOT
//      re-migrated.
//   8. Fresh config from createDefaultCarePlanConfig is stamped with
//      schemaVersion=CARE_PLAN_CONFIG_SCHEMA_VERSION on creation.
// ============================================================================

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(store.has(k) ? store.get(k)! : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = store.get(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  safeSetItem: async (key: string, value: any): Promise<boolean> => {
    store.set(key, JSON.stringify(value));
    return true;
  },
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

import {
  getCarePlanConfig,
  getOrCreateCarePlanConfig,
  CARE_PLAN_CONFIG_SCHEMA_VERSION,
} from '../../storage/carePlanConfigRepo';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';

const PATIENT_ID = 'patient-default';
const KEY = `@embermate_careplan_config_v1:${PATIENT_ID}`;

function seedPreMigrationConfig(overrides: Partial<CarePlanConfig> = {}) {
  const base = createDefaultCarePlanConfig(PATIENT_ID);
  // Strip schemaVersion to simulate a pre-32A config in storage. Configs
  // created before F1 didn't have this field; removing it here pins the
  // "old config in storage" case the migration is designed to repair.
  const { schemaVersion: _drop, ...withoutSchemaVersion } = base as any;
  const merged: CarePlanConfig = {
    ...withoutSchemaVersion,
    ...overrides,
  } as CarePlanConfig;
  store.set(KEY, JSON.stringify(merged));
}

describe('Phase 32A F1 — defensive migration for errands/shifts/self_care', () => {
  beforeEach(() => {
    store.clear();
  });

  it('contract 1: pre-migration config with errands.enabled=true → forced false + schemaVersion stamped', async () => {
    seedPreMigrationConfig({
      errands: {
        enabled: true,
        priority: 'recommended',
        timesOfDay: ['morning'],
        notificationsEnabled: false,
      },
    });

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg).not.toBeNull();
    expect(cfg!.errands.enabled).toBe(false);
    expect(cfg!.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });

  it('contract 2: pre-migration config with shifts.enabled=true → forced false', async () => {
    seedPreMigrationConfig({
      shifts: {
        enabled: true,
        priority: 'recommended',
        timesOfDay: ['morning'],
        notificationsEnabled: false,
      },
    });

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg!.shifts.enabled).toBe(false);
    expect(cfg!.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });

  it('contract 3: pre-migration config with self_care.enabled=true → forced false', async () => {
    seedPreMigrationConfig({
      self_care: {
        enabled: true,
        priority: 'recommended',
        timesOfDay: ['morning'],
        notificationsEnabled: false,
      },
    });

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg!.self_care.enabled).toBe(false);
    expect(cfg!.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });

  it('contract 4: other buckets enabled-state preserved through migration', async () => {
    seedPreMigrationConfig({
      errands: { enabled: true, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
      // These should pass through untouched.
      water: { enabled: true, priority: 'recommended', timesOfDay: ['midday'], notificationsEnabled: false } as any,
      activity: { enabled: true, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: true } as any,
      appointments: { enabled: false, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false } as any,
    });

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg!.meds.enabled).toBe(true);   // CORE — was true by default
    expect(cfg!.vitals.enabled).toBe(true); // CORE — was true by default
    expect(cfg!.water.enabled).toBe(true);
    expect(cfg!.activity.enabled).toBe(true);
    expect(cfg!.appointments.enabled).toBe(false);
    // The suppressed three:
    expect(cfg!.errands.enabled).toBe(false);
    expect(cfg!.shifts.enabled).toBe(false);
    expect(cfg!.self_care.enabled).toBe(false);
  });

  it('contract 5: non-suppressed fields on suppressed buckets preserved (timesOfDay, priority, notifications)', async () => {
    seedPreMigrationConfig({
      errands: {
        enabled: true,
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
        notificationsEnabled: true,
      },
    });

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg!.errands.enabled).toBe(false);
    // Other fields intact — only `enabled` flipped.
    expect(cfg!.errands.priority).toBe('required');
    expect(cfg!.errands.timesOfDay).toEqual(['morning', 'evening']);
    expect(cfg!.errands.notificationsEnabled).toBe(true);
  });

  it('contract 6: migration persists — second read sees migrated state with no re-migration', async () => {
    seedPreMigrationConfig({
      errands: { enabled: true, priority: 'recommended', timesOfDay: ['morning'], notificationsEnabled: false },
    });

    await getCarePlanConfig(PATIENT_ID); // first read triggers migration
    const stored = JSON.parse(store.get(KEY)!);
    expect(stored.errands.enabled).toBe(false);
    expect(stored.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);

    // Second read should pass through unchanged. To detect a no-op,
    // tamper with storage between reads in a way the migration would
    // otherwise normalize (set errands.enabled back to true) — if the
    // second read DOESN'T re-migrate because schemaVersion is already
    // current, the tampered value survives. (This pins idempotence at
    // the storage layer.)
    const tampered = { ...stored, errands: { ...stored.errands, enabled: true } };
    store.set(KEY, JSON.stringify(tampered));

    const second = await getCarePlanConfig(PATIENT_ID);
    expect(second!.errands.enabled).toBe(true); // NOT re-migrated
    expect(second!.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });

  it('contract 7: idempotent — config already at current schemaVersion is not touched', async () => {
    const baseline = createDefaultCarePlanConfig(PATIENT_ID);
    // Already at current schemaVersion; manually-written errands.enabled=true
    // (e.g. by a test or dev tool) should NOT be re-migrated.
    const alreadyCurrent = {
      ...baseline,
      schemaVersion: CARE_PLAN_CONFIG_SCHEMA_VERSION,
      errands: { ...baseline.errands, enabled: true },
    };
    store.set(KEY, JSON.stringify(alreadyCurrent));

    const cfg = await getCarePlanConfig(PATIENT_ID);
    expect(cfg!.errands.enabled).toBe(true); // untouched by migration
    expect(cfg!.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });

  it('contract 8: fresh config from createDefaultCarePlanConfig stamps schemaVersion=CURRENT', () => {
    const fresh = createDefaultCarePlanConfig(PATIENT_ID);
    expect(fresh.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
    // And the three suppressed buckets default to disabled (already true
    // in DEFAULT_BUCKET_CONFIG; this pin guards that fresh installs
    // never need the migration to fire on them).
    expect(fresh.errands.enabled).toBe(false);
    expect(fresh.shifts.enabled).toBe(false);
    expect(fresh.self_care.enabled).toBe(false);
  });

  it('contract 9: getOrCreateCarePlanConfig — fresh creation stamps schemaVersion', async () => {
    // No seed; getOrCreate should create + persist a fresh config.
    const created = await getOrCreateCarePlanConfig(PATIENT_ID);
    expect(created.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);

    // Storage reflects it.
    const stored = JSON.parse(store.get(KEY)!);
    expect(stored.schemaVersion).toBe(CARE_PLAN_CONFIG_SCHEMA_VERSION);
  });
});
