// ============================================================================
// dailyOutcomes — categorical formatter for the Outcomes row detail line.
// Pure helper: turns a list of items (with a category each) into a tight
// summary suitable for the missed/pending row body. Caps at 4 categories.
// ============================================================================

import { formatOutcomeDetail } from '../../utils/dailyOutcomes';

const item = (name: string, type: string) => ({ itemName: name, itemType: type, status: 'missed' as const });

describe('formatOutcomeDetail — categorical summary', () => {
  it('returns "" for an empty list', () => {
    expect(formatOutcomeDetail([])).toBe('');
  });

  it('single item in a single category → shows the item name', () => {
    expect(formatOutcomeDetail([item('Morning wellness check', 'wellness')]))
      .toBe('Morning wellness check');
  });

  it('two items in one category → comma-joins their names', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Amlodipine', 'medication'),
      ]),
    ).toBe('Acetaminophen, Amlodipine');
  });

  it('three items in one category → enumerated with Oxford comma', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Amlodipine', 'medication'),
        item('Lisinopril', 'medication'),
      ]),
    ).toBe('Acetaminophen, Amlodipine, and Lisinopril');
  });

  it('multiple categories with single items → uses item-name form per category', () => {
    expect(
      formatOutcomeDetail([
        item('Morning vitals', 'vitals'),
        item('Morning wellness check', 'wellness'),
      ]),
    ).toBe('Morning vitals, Morning wellness check');
  });

  it('multiple categories with multiple items → uses count + plural label', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Amlodipine', 'medication'),
        item('Breakfast', 'meal'),
        item('Lunch', 'meal'),
      ]),
    ).toBe('2 meds, 2 meals');
  });

  it('mixed singular + plural categories', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Amlodipine', 'medication'),
        item('Breakfast', 'meal'),
        item('Lunch', 'meal'),
        item('Morning vitals', 'vitals'),
        item('Morning wellness check', 'wellness'),
      ]),
    ).toBe('2 meds, 2 meals, vitals check, wellness check');
  });

  it('caps at 4 visible categories and appends "+N more"', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Breakfast', 'meal'),
        item('Morning vitals', 'vitals'),
        item('Morning wellness check', 'wellness'),
        item('Walk', 'activity'),
        item('Hydration', 'water'),
      ]),
    ).toBe('Acetaminophen, Breakfast, vitals check, wellness check, +2 more');
  });

  it('snapshot — example from the spec (7 items, 5 categories)', () => {
    expect(
      formatOutcomeDetail([
        item('Acetaminophen', 'medication'),
        item('Amlodipine', 'medication'),
        item('Breakfast', 'meal'),
        item('Lunch', 'meal'),
        item('Morning vitals', 'vitals'),
        item('Morning wellness check', 'wellness'),
        item('Walk', 'activity'),
      ]),
    ).toBe('2 meds, 2 meals, vitals check, wellness check, +1 more');
  });
});
