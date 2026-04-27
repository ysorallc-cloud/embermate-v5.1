/**
 * Migration service — v5 → v6 medication-to-CarePlan migration tests.
 *
 * Verifies:
 *   - detection of pending work
 *   - the migration creates one CarePlanItem per active medication
 *   - migration status is persisted (used by appStartup to skip re-running)
 *   - idempotent: running twice does NOT duplicate items
 *   - inactive meds are excluded
 */

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn(),
}));

jest.mock('../../storage/carePlanRepo', () => {
  // In-memory CarePlan + items so tests can run end-to-end.
  let carePlan: any = null;
  let items: any[] = [];

  return {
    DEFAULT_PATIENT_ID: 'default',
    getActiveCarePlan: jest.fn(async () => carePlan),
    createCarePlan: jest.fn(async (patientId: string = 'default') => {
      carePlan = {
        id: `cp-${Date.now()}`,
        patientId,
        timezone: 'America/New_York',
        startDate: '2026-04-25',
        status: 'active',
        version: 1,
        createdAt: '2026-04-25T00:00:00Z',
        updatedAt: '2026-04-25T00:00:00Z',
      };
      return carePlan;
    }),
    listCarePlanItems: jest.fn(async (carePlanId: string) => {
      return items.filter(i => i.carePlanId === carePlanId);
    }),
    upsertCarePlanItem: jest.fn(async (item: any) => {
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      return item;
    }),
    // Test-only helpers
    __reset: () => { carePlan = null; items = []; },
    __getItems: () => items,
    __getCarePlan: () => carePlan,
    __seedCarePlan: (plan: any) => { carePlan = plan; },
    __seedItems: (newItems: any[]) => { items = newItems; },
  };
});

import {
  detectMigrationNeeded,
  migrateMedicationsToCarePlan,
  runMigrations,
  getMigrationStatus,
  isMigrationComplete,
} from '../../services/migrationService';
import { getMedications } from '../../utils/medicationStorage';

const mockGetMeds = getMedications as jest.MockedFunction<typeof getMedications>;
const carePlanRepo = jest.requireMock('../../storage/carePlanRepo');

function makeMed(overrides: Partial<any> = {}) {
  return {
    id: `med-${Math.random()}`,
    name: 'Metformin',
    dosage: '500mg',
    time: '08:00',
    timeSlot: 'morning' as const,
    taken: false,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  carePlanRepo.__reset();
  mockGetMeds.mockResolvedValue([]);
});

// ────────────────────────────────────────────────────────────────────────────
// detectMigrationNeeded
// ────────────────────────────────────────────────────────────────────────────

describe('detectMigrationNeeded', () => {
  it('reports no migration needed when there are no medications', async () => {
    mockGetMeds.mockResolvedValue([]);
    const result = await detectMigrationNeeded();
    expect(result.hasMedicationsToMigrate).toBe(false);
    expect(result.medicationsCount).toBe(0);
  });

  it('reports migration needed when there are active meds and no CarePlan items', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Lisinopril' }),
      makeMed({ id: 'm2', name: 'Metformin' }),
    ]);
    const result = await detectMigrationNeeded();
    expect(result.hasMedicationsToMigrate).toBe(true);
    expect(result.medicationsCount).toBe(2);
    expect(result.existingCarePlanItemsCount).toBe(0);
  });

  it('reports no migration needed when CarePlan items already exist', async () => {
    mockGetMeds.mockResolvedValue([makeMed({ id: 'm1', name: 'Lisinopril' })]);
    carePlanRepo.__seedCarePlan({
      id: 'cp1', patientId: 'default', status: 'active',
      timezone: 'UTC', startDate: '2026-04-01', version: 1,
      createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z',
    });
    carePlanRepo.__seedItems([
      { id: 'item1', carePlanId: 'cp1', type: 'medication', name: 'Lisinopril', active: true },
    ]);

    const result = await detectMigrationNeeded();
    expect(result.hasMedicationsToMigrate).toBe(false);
    expect(result.existingCarePlanItemsCount).toBe(1);
  });

  it('skips inactive medications when counting', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', active: true }),
      makeMed({ id: 'm2', active: false }),
      makeMed({ id: 'm3', active: false }),
    ]);
    const result = await detectMigrationNeeded();
    expect(result.medicationsCount).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// migrateMedicationsToCarePlan
// ────────────────────────────────────────────────────────────────────────────

describe('migrateMedicationsToCarePlan', () => {
  it('returns success with 0 migrated when there are no active meds', async () => {
    mockGetMeds.mockResolvedValue([]);
    const result = await migrateMedicationsToCarePlan();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('creates a CarePlan if none exists, then migrates each active med', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Lisinopril', dosage: '10mg' }),
      makeMed({ id: 'm2', name: 'Metformin', dosage: '500mg', timeSlot: 'evening', time: '20:00' }),
    ]);

    const result = await migrateMedicationsToCarePlan();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(carePlanRepo.__getCarePlan()).not.toBeNull();
    expect(carePlanRepo.__getItems()).toHaveLength(2);
  });

  it('produces well-formed CarePlanItems with type, name, schedule, and medicationDetails', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Lisinopril', dosage: '10mg' }),
    ]);

    await migrateMedicationsToCarePlan();
    const items = carePlanRepo.__getItems();
    const item = items[0];

    expect(item.type).toBe('medication');
    expect(item.name).toContain('Lisinopril');
    expect(item.name).toContain('10mg');
    expect(item.priority).toBe('required');
    expect(item.active).toBe(true);
    expect(item.schedule.frequency).toBe('daily');
    expect(item.schedule.times).toHaveLength(1);
    expect(item.schedule.times[0].at).toBe('08:00');
    expect(item.medicationDetails.medicationId).toBe('m1');
    expect(item.medicationDetails.dose).toBe('10mg');
    expect(item.emoji).toBe('💊');
  });

  it('maps timeSlot "bedtime" to "night" window label', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Melatonin', timeSlot: 'bedtime', time: '22:00' }),
    ]);
    await migrateMedicationsToCarePlan();
    const item = carePlanRepo.__getItems()[0];
    expect(item.schedule.times[0].label).toBe('night');
    expect(item.schedule.times[0].at).toBe('22:00');
  });

  it('skips inactive meds during migration', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', active: true, name: 'Active' }),
      makeMed({ id: 'm2', active: false, name: 'Discontinued' }),
    ]);
    const result = await migrateMedicationsToCarePlan();
    expect(result.migratedCount).toBe(1);
    expect(carePlanRepo.__getItems()).toHaveLength(1);
    expect(carePlanRepo.__getItems()[0].name).toContain('Active');
  });

  it('persists migration status (medicationsToCarePlan: true)', async () => {
    mockGetMeds.mockResolvedValue([makeMed()]);
    await migrateMedicationsToCarePlan();

    const status = await getMigrationStatus();
    expect(status).not.toBeNull();
    expect(status!.medicationsToCarePlan).toBe(true);
    expect(status!.version).toBe(1);
    expect(status!.lastMigrationDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(await isMigrationComplete()).toBe(true);
  });

  it('is idempotent: running twice does not produce duplicate CarePlanItems', async () => {
    mockGetMeds.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Lisinopril' }),
      makeMed({ id: 'm2', name: 'Metformin' }),
    ]);

    const first = await migrateMedicationsToCarePlan();
    expect(first.migratedCount).toBe(2);
    expect(carePlanRepo.__getItems()).toHaveLength(2);

    const second = await migrateMedicationsToCarePlan();
    // Existing meds already linked → no new items created
    expect(second.migratedCount).toBe(0);
    expect(carePlanRepo.__getItems()).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// runMigrations — orchestrator
// ────────────────────────────────────────────────────────────────────────────

describe('runMigrations', () => {
  it('runs medication migration when needed', async () => {
    mockGetMeds.mockResolvedValue([makeMed({ id: 'm1' }), makeMed({ id: 'm2' })]);
    const result = await runMigrations();
    expect(result.success).toBe(true);
    expect(result.results.medications.migratedCount).toBe(2);
    expect(result.results.medications.errors).toEqual([]);
  });

  it('skips medication migration when none is needed (no meds)', async () => {
    mockGetMeds.mockResolvedValue([]);
    const result = await runMigrations();
    expect(result.success).toBe(true);
    expect(result.results.medications.migratedCount).toBe(0);
  });

  it('skips medication migration when CarePlan items already exist', async () => {
    mockGetMeds.mockResolvedValue([makeMed({ id: 'm1' })]);
    carePlanRepo.__seedCarePlan({
      id: 'cp1', patientId: 'default', status: 'active',
      timezone: 'UTC', startDate: '2026-04-01', version: 1,
      createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z',
    });
    carePlanRepo.__seedItems([
      { id: 'existing', carePlanId: 'cp1', type: 'medication', name: 'Already migrated', active: true },
    ]);

    const result = await runMigrations();
    expect(result.results.medications.migratedCount).toBe(0);
    // Existing item is preserved, no duplicate added
    expect(carePlanRepo.__getItems()).toHaveLength(1);
  });
});
