// ============================================================================
// Phase 5.12.b — narrativeSummaryBuilder factualOnly mode.
//
// The default builder output is interpretive ("All scheduled medications
// were taken on time.", "Wellness OK"). That's fine for the existing
// callers — handoff, Visit Prep — which carry their own legal hygiene
// upstream. But Journal's auto-recap renders inline as an alternative
// to the caregiver's authored tone, and any auto-generated clinical
// interpretation there reads as the app making a judgment.
//
// factualOnly: true scrubs the output of interpretive language and
// returns counts/timing only. This permanent regression guard pins the
// forbidden-word list so future copy edits can't slip judgment back in.
// ============================================================================

import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';

// In-memory storage stand-in so the builder's repo calls don't touch
// real AsyncStorage during tests.
const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    },
    removeItem: (k: string) => {
      store.delete(k);
      return Promise.resolve();
    },
    multiRemove: (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  safeSetItem: async (k: string, v: any): Promise<void> => {
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  },
}));

jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: async () => [
    {
      id: 'evt-meds-1',
      type: 'medication_taken',
      timestamp: '2026-05-06T09:30:00Z',
      patientId: 'default',
      metadata: { medicationName: 'Amlodipine', dosage: '2.5mg' },
    },
    {
      id: 'evt-vitals-1',
      type: 'vitals_recorded',
      timestamp: '2026-05-06T09:14:00Z',
      patientId: 'default',
      metadata: { systolic: 138, diastolic: 85 },
    },
    {
      id: 'evt-meal-1',
      type: 'meal_logged',
      timestamp: '2026-05-06T12:30:00Z',
      patientId: 'default',
      metadata: { mealType: 'lunch' },
    },
    {
      id: 'evt-wellness-1',
      type: 'wellness_check',
      timestamp: '2026-05-06T15:00:00Z',
      patientId: 'default',
    },
  ],
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: async () => [
    {
      id: 'inst-1',
      itemType: 'medication',
      status: 'completed',
      patientId: 'default',
    },
  ],
}));

jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: async () => null,
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {} }));

// Forbidden interpretive vocabulary — judgment language the builder must
// not emit when factualOnly is true. The list is intentionally generous;
// adding a word is a one-line PR.
const FORBIDDEN_WORDS = [
  'good',
  'calm',
  'elevated',
  'stable',
  'fine',
  'rough',
  'concerning',
  'normal',
  'abnormal',
  'healthy',
  'unwell',
];

describe('Phase 5.12.b — buildDayNarrative factualOnly mode', () => {
  it('default mode (no flag) keeps the existing interpretive output', async () => {
    // The flag must default to false so callers like NarrativeView that
    // already render interpretive language are not silently changed.
    const out = await buildDayNarrative('2026-05-06');
    expect(out.summary).toMatch(/All scheduled medications/i);
  });

  it('factualOnly: true returns a summary', async () => {
    const out = await buildDayNarrative('2026-05-06', { factualOnly: true });
    expect(out.summary).toBeTruthy();
    expect(out.summary.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_WORDS)(
    'factualOnly summary does not contain interpretive word "%s"',
    async (word) => {
      const out = await buildDayNarrative('2026-05-06', { factualOnly: true });
      const re = new RegExp(`\\b${word}\\b`, 'i');
      expect(out.summary).not.toMatch(re);
    },
  );

  it('factualOnly summary surfaces counts/timings only (counts present)', async () => {
    const out = await buildDayNarrative('2026-05-06', { factualOnly: true });
    // The mocked day has 1 med, 1 vitals reading, 1 meal, 1 wellness check.
    // Factual output should reference quantities or names, not judgments.
    const hasCount = /\d/.test(out.summary);
    const hasNames = /medication|vital|meal|wellness/i.test(out.summary);
    expect(hasCount || hasNames).toBe(true);
  });

  it('factualOnly empty-day output is the canonical "no activity" line', async () => {
    // For a day with no activity, factual mode still returns a sentence —
    // it just states the absence rather than projecting a feeling.
    const orig = jest.requireActual('../../storage/eventRepo');
    jest.resetModules();
    jest.doMock('../../storage/eventRepo', () => ({
      getEventsByDateRange: async () => [],
    }));
    jest.doMock('../../storage/carePlanRepo', () => ({
      listDailyInstances: async () => [],
    }));
    const { buildDayNarrative: rebuilt } = await import(
      '../../utils/narrativeSummaryBuilder'
    );
    const out = await rebuilt('2026-05-07', { factualOnly: true });
    expect(out.summary).toMatch(/no activity|no events|nothing/i);
  });
});
