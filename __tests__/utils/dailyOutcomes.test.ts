// ============================================================================
// dailyOutcomes — thin adapter over DailyCareInstance that produces the
// DailyOutcomes shape the composers consume. Pure classification logic.
// ============================================================================

import {
  classifyOutcomes,
  type ClassifyInput,
} from '../../utils/dailyOutcomes';

const inst = (
  status: 'completed' | 'missed' | 'pending' | 'skipped',
  itemName: string,
  itemType: 'medication' | 'meal' | 'vitals' | 'wellness' | 'water' | 'sleep' | 'activity' = 'medication',
): ClassifyInput => ({ status, itemName, itemType });

describe('classifyOutcomes', () => {
  it('returns zero counts for an empty instance list', () => {
    const o = classifyOutcomes([]);
    expect(o.logged.count).toBe(0);
    expect(o.missed.count).toBe(0);
    expect(o.pending.count).toBe(0);
    expect(o.missed.names).toEqual([]);
    expect(o.pending.names).toEqual([]);
  });

  it('counts completed instances as logged', () => {
    const o = classifyOutcomes([
      inst('completed', 'Acetaminophen'),
      inst('completed', 'Lisinopril'),
      inst('completed', 'Breakfast', 'meal'),
    ]);
    expect(o.logged.count).toBe(3);
    expect(o.missed.count).toBe(0);
    expect(o.pending.count).toBe(0);
  });

  it('counts missed instances and surfaces their names', () => {
    const o = classifyOutcomes([
      inst('missed', 'Acetaminophen'),
      inst('missed', 'Amlodipine'),
      inst('completed', 'Lisinopril'),
    ]);
    expect(o.missed.count).toBe(2);
    expect(o.missed.names).toEqual(['Acetaminophen', 'Amlodipine']);
    expect(o.logged.count).toBe(1);
  });

  it('counts pending instances and surfaces their names', () => {
    const o = classifyOutcomes([
      inst('pending', 'Evening meds'),
      inst('pending', 'BP check', 'vitals'),
      inst('completed', 'Breakfast', 'meal'),
    ]);
    expect(o.pending.count).toBe(2);
    expect(o.pending.names).toEqual(['Evening meds', 'BP check']);
  });

  it('skipped instances do not count as missed (intentional skip is a positive action)', () => {
    const o = classifyOutcomes([
      inst('skipped', 'Acetaminophen'),
      inst('completed', 'Lisinopril'),
    ]);
    expect(o.missed.count).toBe(0);
    // Skipped does count as "handled" — i.e. logged.
    expect(o.logged.count).toBe(2);
  });

  it('logged.summary groups completed items by category with the right plural form', () => {
    const o = classifyOutcomes([
      inst('completed', 'Acetaminophen'),
      inst('completed', 'Lisinopril'),
      inst('completed', 'Amlodipine'),
      inst('completed', 'Breakfast', 'meal'),
      inst('completed', 'Morning vitals', 'vitals'),
      inst('completed', 'Morning vitals', 'vitals'),
    ]);
    expect(o.logged.count).toBe(6);
    expect(o.logged.summary).toBe('3 meds, 1 meal, and 2 vitals');
  });

  it('logged.summary uses singular for count=1', () => {
    const o = classifyOutcomes([inst('completed', 'Acetaminophen')]);
    expect(o.logged.summary).toBe('1 med');
  });

  it('returns categories alongside summary so composers can rebuild text downstream', () => {
    const o = classifyOutcomes([
      inst('completed', 'Acetaminophen'),
      inst('completed', 'Breakfast', 'meal'),
    ]);
    expect(o.logged.categories).toEqual([
      { label: 'med', count: 1 },
      { label: 'meal', count: 1 },
    ]);
  });

  it('mixed bag: missed + pending + completed all classified correctly', () => {
    const o = classifyOutcomes([
      inst('missed', 'Acetaminophen'),
      inst('pending', 'Evening meds'),
      inst('completed', 'Breakfast', 'meal'),
      inst('completed', 'Morning vitals', 'vitals'),
      inst('skipped', 'Amlodipine'),
    ]);
    expect(o.missed.count).toBe(1);
    expect(o.pending.count).toBe(1);
    // 2 completed + 1 skipped = 3 logged
    expect(o.logged.count).toBe(3);
  });

  it('preserves insertion order of names (no alphabetisation)', () => {
    const o = classifyOutcomes([
      inst('missed', 'Z-drug'),
      inst('missed', 'A-drug'),
    ]);
    expect(o.missed.names).toEqual(['Z-drug', 'A-drug']);
  });

  it('item types unmapped in the singular dictionary fall back to the itemType string verbatim', () => {
    const o = classifyOutcomes([
      inst('completed', 'Hydration', 'water'),
      inst('completed', 'Sleep', 'sleep'),
    ]);
    expect(o.logged.summary).toBe('1 water and 1 sleep');
  });
});
