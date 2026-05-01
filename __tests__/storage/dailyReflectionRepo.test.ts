// ============================================================================
// dailyReflectionRepo — silent vital signs persistence (sleep / mood / energy)
// per patient per day. Powers the Now-tab silent-vitals capture and the Visit
// Prep range query.
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
  upsertDailyReflection,
  getDailyReflection,
  getRange,
  getRangeWithMissingDays,
  getYesterdayReflection,
  deleteDailyReflection,
} from '../../storage/dailyReflectionRepo';

const PATIENT = 'mom';

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

describe('upsertDailyReflection — write + merge', () => {
  it('creates a new reflection on first write', async () => {
    const result = await upsertDailyReflection(PATIENT, '2026-04-29', {
      sleepQuality: 4,
      mood: 3,
    });
    expect(result.patientId).toBe(PATIENT);
    expect(result.date).toBe('2026-04-29');
    expect(result.sleepQuality).toBe(4);
    expect(result.mood).toBe(3);
    expect(result.energyLevel).toBeUndefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('merges into an existing reflection (partial update)', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-29', { sleepQuality: 4, mood: 3 });
    const merged = await upsertDailyReflection(PATIENT, '2026-04-29', { energyLevel: 2 });
    expect(merged.sleepQuality).toBe(4);
    expect(merged.mood).toBe(3);
    expect(merged.energyLevel).toBe(2);
  });

  it('overwrites a value when the same field is patched', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-29', { mood: 2 });
    const updated = await upsertDailyReflection(PATIENT, '2026-04-29', { mood: 5 });
    expect(updated.mood).toBe(5);
  });

  it('keeps reflections per-patient isolated', async () => {
    await upsertDailyReflection('mom', '2026-04-29', { mood: 5 });
    await upsertDailyReflection('dad', '2026-04-29', { mood: 1 });
    const mom = await getDailyReflection('mom', '2026-04-29');
    const dad = await getDailyReflection('dad', '2026-04-29');
    expect(mom!.mood).toBe(5);
    expect(dad!.mood).toBe(1);
  });
});

describe('getDailyReflection', () => {
  it('returns null when no reflection exists for the date', async () => {
    const result = await getDailyReflection(PATIENT, '2026-04-29');
    expect(result).toBeNull();
  });

  it('returns the stored reflection', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-29', { sleepQuality: 4 });
    const result = await getDailyReflection(PATIENT, '2026-04-29');
    expect(result).not.toBeNull();
    expect(result!.sleepQuality).toBe(4);
  });
});

describe('getRange — only days with data', () => {
  it('returns reflections sorted ascending by date', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-27', { mood: 2 });
    await upsertDailyReflection(PATIENT, '2026-04-29', { mood: 4 });
    await upsertDailyReflection(PATIENT, '2026-04-28', { mood: 3 });

    const result = await getRange(PATIENT, '2026-04-27', '2026-04-29');
    expect(result.map((r) => r.date)).toEqual(['2026-04-27', '2026-04-28', '2026-04-29']);
  });

  it('respects the date window (excludes outside range)', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-25', { mood: 1 });
    await upsertDailyReflection(PATIENT, '2026-04-30', { mood: 5 });
    const result = await getRange(PATIENT, '2026-04-26', '2026-04-29');
    expect(result.length).toBe(0);
  });
});

describe('getRangeWithMissingDays — Visit Prep input', () => {
  it('emits one point per day in the inclusive range', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-28', { mood: 3 });
    const points = await getRangeWithMissingDays(PATIENT, '2026-04-27', '2026-04-29');
    expect(points.map((p) => p.date)).toEqual(['2026-04-27', '2026-04-28', '2026-04-29']);
  });

  it('null reflection for missing days, populated reflection for logged days', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-28', { mood: 4 });
    const points = await getRangeWithMissingDays(PATIENT, '2026-04-27', '2026-04-29');
    expect(points[0].reflection).toBeNull();
    expect(points[1].reflection).not.toBeNull();
    expect(points[1].reflection!.mood).toBe(4);
    expect(points[2].reflection).toBeNull();
  });

  it('returns an empty array when start > end', async () => {
    const points = await getRangeWithMissingDays(PATIENT, '2026-04-30', '2026-04-29');
    expect(points).toEqual([]);
  });
});

describe('getYesterdayReflection', () => {
  it('returns yesterday in the local time zone', async () => {
    // Anchor "now" at 2026-04-30 09:00 local — yesterday is 2026-04-29.
    const now = new Date(2026, 3, 30, 9, 0, 0); // months are 0-indexed
    await upsertDailyReflection(PATIENT, '2026-04-29', { mood: 4 });
    const yest = await getYesterdayReflection(PATIENT, now);
    expect(yest).not.toBeNull();
    expect(yest!.mood).toBe(4);
  });

  it('returns null when yesterday has no reflection', async () => {
    const now = new Date(2026, 3, 30, 9, 0, 0);
    const yest = await getYesterdayReflection(PATIENT, now);
    expect(yest).toBeNull();
  });
});

describe('deleteDailyReflection', () => {
  it('removes the day record when present', async () => {
    await upsertDailyReflection(PATIENT, '2026-04-29', { mood: 3 });
    await deleteDailyReflection(PATIENT, '2026-04-29');
    const after = await getDailyReflection(PATIENT, '2026-04-29');
    expect(after).toBeNull();
  });

  it('is a no-op when the day record is absent', async () => {
    await expect(
      deleteDailyReflection(PATIENT, '2026-04-29'),
    ).resolves.not.toThrow();
  });
});
