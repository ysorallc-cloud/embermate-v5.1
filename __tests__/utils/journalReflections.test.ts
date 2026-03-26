import { generateReflections, JournalReflection } from '../../utils/journalReflections';
import type { CareBrief } from '../../utils/careSummaryBuilder';

// Minimal CareBrief stub for testing
function makeBrief(overrides: Partial<CareBrief> = {}): CareBrief {
  return {
    medications: { taken: 0, total: 0, list: [] },
    vitals: { logged: false, readings: {} },
    meals: { logged: 0, total: 3, list: [] },
    water: { glasses: 0 },
    sleep: { logged: false },
    wellness: { morning: false, evening: false },
    mood: null,
    symptoms: [],
    notes: [],
    ...overrides,
  } as CareBrief;
}

const defaultOpts = {
  medsDone: 0,
  medsTotal: 0,
  mealsDone: 0,
  mealsTotal: 0,
  waterGlasses: 0,
  wellnessDone: 0,
  wellnessTotal: 0,
  hasVitals: false,
  hasMorning: false,
  hasEvening: false,
};

describe('journalReflections', () => {
  it('generateReflections() returns empty-day reflection when no notable data', () => {
    const reflections = generateReflections(makeBrief(), defaultOpts);
    expect(reflections.length).toBeGreaterThanOrEqual(1);
    // With no meds/meals/water/vitals, should get the empty-day or at least some reflection
    const ids = reflections.map(r => r.id);
    expect(ids).toContain('empty-day');
  });

  it('generateReflections() returns med-streak reflection when all meds taken 3+ days', () => {
    const brief = makeBrief({ adherenceStreak: 5 } as any);
    const reflections = generateReflections(brief, {
      ...defaultOpts,
      medsDone: 3,
      medsTotal: 3,
    });
    const medStreak = reflections.find(r => r.id === 'med-streak');
    expect(medStreak).toBeDefined();
    expect(medStreak!.observation).toContain('5 days in a row');
  });

  it('generateReflections() returns meals-complete reflection when all meals logged', () => {
    const reflections = generateReflections(makeBrief(), {
      ...defaultOpts,
      mealsDone: 3,
      mealsTotal: 3,
    });
    const mealsComplete = reflections.find(r => r.id === 'meals-complete');
    expect(mealsComplete).toBeDefined();
    expect(mealsComplete!.observation).toContain('All planned meals logged');
  });

  it('each reflection has id, icon, observation, category', () => {
    const reflections = generateReflections(makeBrief(), {
      ...defaultOpts,
      medsDone: 3,
      medsTotal: 3,
      mealsDone: 3,
      mealsTotal: 3,
      waterGlasses: 8,
    });

    for (const r of reflections) {
      expect(r.id).toBeDefined();
      expect(typeof r.id).toBe('string');
      expect(r.icon).toBeDefined();
      expect(typeof r.icon).toBe('string');
      expect(r.observation).toBeDefined();
      expect(typeof r.observation).toBe('string');
      expect(r.category).toBeDefined();
      expect(['medications', 'nutrition', 'wellness', 'hydration', 'vitals', 'general']).toContain(r.category);
    }
  });
});
