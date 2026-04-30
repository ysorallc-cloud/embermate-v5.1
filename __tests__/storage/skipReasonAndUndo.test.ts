// ============================================================================
// skipReason propagation + undo flow — extends logInstanceCompletion to write
// the optional skipReason onto both LogEntry and DailyCareInstance, and adds
// undoInstanceCompletion to revert a tap-checkbox log within the toast window.
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
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, store[k] ?? null] as [string, string | null])),
    ),
    multiSet: jest.fn((entries: [string, string][]) => {
      for (const [k, v] of entries) store[k] = v;
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    }),
    __store: store,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../utils/idGenerator', () => {
  let n = 0;
  return { generateUniqueId: jest.fn(() => `id-${++n}`) };
});

import {
  logInstanceCompletion,
  undoInstanceCompletion,
  listLogsByDate,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance } from '../../types/carePlan';

const PATIENT = 'mom';
const DATE = '2026-04-29';

const seedInstance = async (overrides: Partial<DailyCareInstance> = {}): Promise<DailyCareInstance> => {
  const instance: DailyCareInstance = {
    id: 'inst-1',
    carePlanId: 'plan-1',
    carePlanItemId: 'item-1',
    patientId: PATIENT,
    date: DATE,
    scheduledTime: `${DATE}T08:00:00`,
    windowLabel: 'morning',
    windowId: 'morning',
    status: 'pending',
    itemName: 'Acetaminophen',
    itemType: 'medication',
    priority: 'required',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  await AsyncStorage.setItem(
    `@embermate_instances_v2:${PATIENT}:${DATE}`,
    JSON.stringify([instance]),
  );
  return instance;
};

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

describe('logInstanceCompletion — skipReason propagation', () => {
  it('writes skipReason to both the LogEntry and DailyCareInstance when outcome="skipped"', async () => {
    await seedInstance();

    const result = await logInstanceCompletion(
      PATIENT,
      DATE,
      'inst-1',
      'skipped',
      undefined,
      { skipReason: 'refused' },
    );

    expect(result).not.toBeNull();
    expect(result!.log.outcome).toBe('skipped');
    expect(result!.log.skipReason).toBe('refused');
    expect(result!.instance.status).toBe('skipped');
    expect(result!.instance.skipReason).toBe('refused');
  });

  it('does not write skipReason for non-skip outcomes', async () => {
    await seedInstance();

    const result = await logInstanceCompletion(
      PATIENT,
      DATE,
      'inst-1',
      'taken',
      undefined,
      { skipReason: 'refused' },
    );

    expect(result).not.toBeNull();
    expect(result!.log.skipReason).toBeUndefined();
    expect(result!.instance.skipReason).toBeUndefined();
  });

  it('omits skipReason on the LogEntry when not provided', async () => {
    await seedInstance();

    const result = await logInstanceCompletion(
      PATIENT,
      DATE,
      'inst-1',
      'skipped',
      undefined,
      {},
    );

    expect(result!.log.skipReason).toBeUndefined();
    expect(result!.instance.skipReason).toBeUndefined();
  });
});

describe('undoInstanceCompletion', () => {
  it('reverts the instance to pending and removes the log entry', async () => {
    await seedInstance();

    const result = await logInstanceCompletion(
      PATIENT,
      DATE,
      'inst-1',
      'taken',
    );
    expect(result!.instance.status).toBe('completed');
    const logsBefore = await listLogsByDate(PATIENT, DATE);
    expect(logsBefore.length).toBe(1);

    const reverted = await undoInstanceCompletion(PATIENT, DATE, 'inst-1');
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('pending');
    expect(reverted!.logId).toBeUndefined();
    expect(reverted!.skipReason).toBeUndefined();

    const logsAfter = await listLogsByDate(PATIENT, DATE);
    expect(logsAfter.length).toBe(0);
  });

  it('also clears skipReason when undoing a skipped instance', async () => {
    await seedInstance();
    await logInstanceCompletion(PATIENT, DATE, 'inst-1', 'skipped', undefined, {
      skipReason: 'too-soon',
    });

    const reverted = await undoInstanceCompletion(PATIENT, DATE, 'inst-1');
    expect(reverted!.status).toBe('pending');
    expect(reverted!.skipReason).toBeUndefined();
  });

  it('returns null when the instance does not exist', async () => {
    const reverted = await undoInstanceCompletion(PATIENT, DATE, 'missing-id');
    expect(reverted).toBeNull();
  });
});
