// ============================================================================
// medicationChangeTracking — append-only log of med add / remove / dose
// changes. Powers the "What changed after medication updates" PDF section
// (Phase 5). Reads are by date range; writes are fire-and-forget — failures
// log to dev but never throw.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import {
  recordMedicationChange,
  listMedicationChanges,
} from '../../services/medicationChangeTracking';

const PATIENT = 'mom';

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

describe('recordMedicationChange', () => {
  it('appends an "added" entry with the medication metadata', async () => {
    await recordMedicationChange(PATIENT, {
      kind: 'added',
      medicationId: 'med-1',
      medicationName: 'Metformin',
      newDosage: '500mg',
    });
    const list = await listMedicationChanges(PATIENT, '2026-01-01', '2099-01-01');
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe('added');
    expect(list[0].medicationName).toBe('Metformin');
    expect(list[0].newDosage).toBe('500mg');
  });

  it('appends a "dose_changed" entry capturing pre/post dosage', async () => {
    await recordMedicationChange(PATIENT, {
      kind: 'dose_changed',
      medicationId: 'med-1',
      medicationName: 'Metformin',
      previousDosage: '500mg',
      newDosage: '1000mg',
    });
    const list = await listMedicationChanges(PATIENT, '2026-01-01', '2099-01-01');
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe('dose_changed');
    expect(list[0].previousDosage).toBe('500mg');
    expect(list[0].newDosage).toBe('1000mg');
  });

  it('appends a "removed" entry when a med is deleted', async () => {
    await recordMedicationChange(PATIENT, {
      kind: 'removed',
      medicationId: 'med-1',
      medicationName: 'Metformin',
    });
    const list = await listMedicationChanges(PATIENT, '2026-01-01', '2099-01-01');
    expect(list[0].kind).toBe('removed');
  });
});

describe('listMedicationChanges — date range filtering', () => {
  it('only returns changes within the inclusive date range', async () => {
    // Stub Date.now via the recorded timestamps directly using fake timers.
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2026-04-01T12:00:00'));
    await recordMedicationChange(PATIENT, {
      kind: 'added', medicationId: 'a', medicationName: 'A', newDosage: '1mg',
    });

    jest.setSystemTime(new Date('2026-04-15T12:00:00'));
    await recordMedicationChange(PATIENT, {
      kind: 'added', medicationId: 'b', medicationName: 'B', newDosage: '1mg',
    });

    jest.setSystemTime(new Date('2026-04-30T12:00:00'));
    await recordMedicationChange(PATIENT, {
      kind: 'added', medicationId: 'c', medicationName: 'C', newDosage: '1mg',
    });

    const list = await listMedicationChanges(PATIENT, '2026-04-10', '2026-04-20');
    expect(list.map((c) => c.medicationName)).toEqual(['B']);

    jest.useRealTimers();
  });

  it('returns entries sorted ascending by changedAt', async () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2026-04-15T12:00:00'));
    await recordMedicationChange(PATIENT, {
      kind: 'added', medicationId: 'b', medicationName: 'B', newDosage: '1mg',
    });

    jest.setSystemTime(new Date('2026-04-01T12:00:00'));
    await recordMedicationChange(PATIENT, {
      kind: 'added', medicationId: 'a', medicationName: 'A', newDosage: '1mg',
    });

    const list = await listMedicationChanges(PATIENT, '2026-01-01', '2099-01-01');
    expect(list.map((c) => c.medicationName)).toEqual(['A', 'B']);

    jest.useRealTimers();
  });
});

describe('listMedicationChanges — patient isolation', () => {
  it('does not leak changes between patients', async () => {
    await recordMedicationChange('mom', {
      kind: 'added', medicationId: 'a', medicationName: 'Mom med', newDosage: '1mg',
    });
    await recordMedicationChange('dad', {
      kind: 'added', medicationId: 'b', medicationName: 'Dad med', newDosage: '1mg',
    });
    const mom = await listMedicationChanges('mom', '2026-01-01', '2099-01-01');
    const dad = await listMedicationChanges('dad', '2026-01-01', '2099-01-01');
    expect(mom.length).toBe(1);
    expect(dad.length).toBe(1);
    expect(mom[0].medicationName).toBe('Mom med');
  });
});
