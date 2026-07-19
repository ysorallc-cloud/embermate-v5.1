// ============================================================================
// getMealTypeForInstance (Bug 1) — derive the tapped meal's type from its
// instance so /log-meal pre-selects THAT meal, not a time-of-day guess.
//
// The timeline meal tap passed no mealType, so log-meal fell back to
// getDefaultMealType() (the clock) → tapping Breakfast pre-checked Lunch. This
// helper maps the instance → a MEAL_TYPES id ('breakfast'|'lunch'|'dinner'),
// preferring the meal name and falling back to the window. undefined when it
// can't map (e.g. an evening snack) → caller leaves the default.
// ============================================================================

import { getMealTypeForInstance } from '../../utils/nowHelpers';

describe('getMealTypeForInstance', () => {
  it('maps the meal name → its type id', () => {
    expect(getMealTypeForInstance({ itemName: 'Breakfast' })).toBe('breakfast');
    expect(getMealTypeForInstance({ itemName: 'Lunch' })).toBe('lunch');
    expect(getMealTypeForInstance({ itemName: 'Dinner' })).toBe('dinner');
  });

  it('is case-insensitive on the name', () => {
    expect(getMealTypeForInstance({ itemName: 'BREAKFAST' })).toBe('breakfast');
    expect(getMealTypeForInstance({ itemName: 'dinner' })).toBe('dinner');
  });

  it('falls back to the window label when the name does not match', () => {
    expect(getMealTypeForInstance({ itemName: 'Morning meal', windowLabel: 'morning' })).toBe('breakfast');
    expect(getMealTypeForInstance({ windowLabel: 'afternoon' })).toBe('lunch');
    expect(getMealTypeForInstance({ windowLabel: 'midday' })).toBe('lunch');
    expect(getMealTypeForInstance({ windowLabel: 'evening' })).toBe('dinner');
  });

  it('returns undefined when nothing maps (e.g. an evening snack)', () => {
    expect(getMealTypeForInstance({ itemName: 'Evening snack', windowLabel: 'night' })).toBeUndefined();
    expect(getMealTypeForInstance({})).toBeUndefined();
  });
});
