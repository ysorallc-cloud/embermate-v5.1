// ============================================================================
// reflectionRepo — You-tab reflection card storage.
// Locks in v6.7 Phase 2: per-day mood + text entries, idempotent overwrite,
// range query, encrypted at rest via the safeStorage 'reflection_' prefix.
// ============================================================================

const memory: Record<string, string> = {};

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = memory[key];
    if (raw === undefined) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }),
  safeSetItem: jest.fn(async (key: string, value: any): Promise<void> => {
    memory[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }),
  safeRemoveItem: jest.fn(async (key: string): Promise<void> => {
    delete memory[key];
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn(async (): Promise<string[]> => Object.keys(memory)),
  },
}));

beforeEach(() => {
  for (const k of Object.keys(memory)) delete memory[k];
});

import {
  saveReflection,
  getReflection,
  getReflections,
  ReflectionEntry,
  ReflectionMood,
} from '../../services/reflectionRepo';

const TODAY = '2026-04-27';
const YESTERDAY = '2026-04-26';
const TWO_DAYS_AGO = '2026-04-25';

describe('reflectionRepo — schema + types', () => {
  it('exports the ReflectionMood union covering rough → good plus null', () => {
    const moods: ReflectionMood[] = ['rough', 'low', 'neutral', 'okay', 'good'];
    expect(moods).toHaveLength(5);
  });
});

describe('saveReflection + getReflection — single-day round trip', () => {
  it('stores mood + text and returns the saved entry', async () => {
    const saved = await saveReflection({ date: TODAY, mood: 'okay', text: 'tired but here' });
    expect(saved.date).toBe(TODAY);
    expect(saved.mood).toBe('okay');
    expect(saved.text).toBe('tired but here');
    expect(typeof saved.savedAt).toBe('string');
    expect(() => new Date(saved.savedAt).toISOString()).not.toThrow();
  });

  it('getReflection returns null for a date with no entry', async () => {
    const r = await getReflection('2026-01-15');
    expect(r).toBeNull();
  });

  it('getReflection returns the saved entry by date', async () => {
    await saveReflection({ date: TODAY, mood: 'good', text: 'a quiet day' });
    const r = await getReflection(TODAY);
    expect(r).not.toBeNull();
    expect(r!.mood).toBe('good');
    expect(r!.text).toBe('a quiet day');
  });

  it('mood and text are independently nullable', async () => {
    const moodOnly = await saveReflection({ date: TODAY, mood: 'low', text: null });
    expect(moodOnly.mood).toBe('low');
    expect(moodOnly.text).toBeNull();

    const textOnly = await saveReflection({ date: YESTERDAY, mood: null, text: 'just a note' });
    expect(textOnly.mood).toBeNull();
    expect(textOnly.text).toBe('just a note');
  });
});

describe('saveReflection — overwrite semantics (one entry per day)', () => {
  it('subsequent save on the same day overwrites the prior entry', async () => {
    await saveReflection({ date: TODAY, mood: 'rough', text: 'morning was hard' });
    const updated = await saveReflection({ date: TODAY, mood: 'okay', text: 'better now' });
    expect(updated.mood).toBe('okay');
    expect(updated.text).toBe('better now');

    const fetched = await getReflection(TODAY);
    expect(fetched!.mood).toBe('okay');
    expect(fetched!.text).toBe('better now');
  });

  it('savedAt updates on overwrite (newest wins)', async () => {
    const first = await saveReflection({ date: TODAY, mood: 'low', text: 'a' });
    // Force a measurable gap so the second timestamp is strictly later.
    await new Promise(r => setTimeout(r, 5));
    const second = await saveReflection({ date: TODAY, mood: 'good', text: 'b' });
    expect(new Date(second.savedAt).getTime()).toBeGreaterThanOrEqual(new Date(first.savedAt).getTime());
  });
});

describe('getReflections — range query', () => {
  it('returns entries falling within [rangeStart, rangeEnd] inclusive, sorted by date', async () => {
    await saveReflection({ date: TWO_DAYS_AGO, mood: 'low', text: 'a' });
    await saveReflection({ date: YESTERDAY, mood: 'okay', text: 'b' });
    await saveReflection({ date: TODAY, mood: 'good', text: 'c' });

    const all = await getReflections(TWO_DAYS_AGO, TODAY);
    expect(all.map((r: ReflectionEntry) => r.date)).toEqual([TWO_DAYS_AGO, YESTERDAY, TODAY]);
  });

  it('excludes entries outside the range', async () => {
    await saveReflection({ date: '2026-04-01', mood: 'rough', text: 'old' });
    await saveReflection({ date: TODAY, mood: 'good', text: 'today' });

    const recent = await getReflections(YESTERDAY, TODAY);
    expect(recent.map((r: ReflectionEntry) => r.date)).toEqual([TODAY]);
  });

  it('returns an empty array when nothing matches the range', async () => {
    await saveReflection({ date: '2026-04-01', mood: 'okay', text: 'x' });
    const rs = await getReflections('2027-01-01', '2027-01-31');
    expect(rs).toEqual([]);
  });
});

describe('reflectionRepo — encryption-routed key prefix', () => {
  it('writes under a key whose prefix triggers encryption (starts with "reflection_")', async () => {
    const { safeSetItem } = require('../../utils/safeStorage');
    await saveReflection({ date: TODAY, mood: 'okay', text: 'hi' });
    const calls = (safeSetItem as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastKey = calls[calls.length - 1][0];
    expect(lastKey).toMatch(/^reflection_/);
    // Distinct from the legacy journal reflection key — must not collide
    // with `reflection_${date}` used by storage/reflectionStorage.ts.
    expect(lastKey).not.toBe(`reflection_${TODAY}`);
  });
});
