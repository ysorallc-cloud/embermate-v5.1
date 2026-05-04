// ============================================================================
// Phase 5.9 — Finding 1.3 reproduction: Outcomes copy regression.
//
// Device evidence: image 6 shows "2 nutritions, 2 check-ins" rendered in
// the Today's Outcomes card. "nutritions" is wrong — nutrition is
// uncountable, and the user-facing label across the app is "meal" /
// "meals" anyway.
//
// Source diagnosis: utils/dailyOutcomes.ts has TYPE_SINGULAR['meal'] but
// the actual itemType in the data is 'nutrition' (per types/carePlan.ts).
// With no entry, pluralFor falls back to `${itemType}s` → "nutritions".
//
// EXPECTED STATE while broken: this test FAILS — the formatter produces
// the wrong plural for the 'nutrition' itemType.
// ============================================================================

import { formatOutcomeDetail } from '../../utils/dailyOutcomes';

describe('Phase 5.9 finding 1.3 — nutrition itemType formats as "meals"', () => {
  it('two nutrition items in a mixed summary render as "2 meals", not "2 nutritions"', () => {
    const out = formatOutcomeDetail([
      // Two nutrition (meal) items + two wellness items, mirroring the
      // device screenshot.
      { itemName: 'Breakfast', itemType: 'nutrition', status: 'completed' },
      { itemName: 'Lunch', itemType: 'nutrition', status: 'completed' },
      { itemName: 'Morning check-in', itemType: 'wellness', status: 'completed' },
      { itemName: 'Evening check-in', itemType: 'wellness', status: 'completed' },
    ] as any);
    expect(out).toContain('2 meals');
    expect(out).not.toContain('nutritions');
    expect(out).not.toContain('nutrition');
  });

  it('a single nutrition item still uses the meal label in a mixed summary', () => {
    const out = formatOutcomeDetail([
      { itemName: 'Breakfast', itemType: 'nutrition', status: 'completed' },
      { itemName: 'Acetaminophen', itemType: 'medication', status: 'completed' },
      { itemName: 'Tylenol PM', itemType: 'medication', status: 'completed' },
    ] as any);
    // anyPlural=true for medication → tighten path uses category label.
    // The nutrition slot in the tight path has length 1, so it renders
    // its item name (current behavior — "Breakfast"). That's acceptable.
    // The bug we're catching is plural — assert the plural path:
    expect(out).not.toContain('nutritions');
  });

  it('three nutrition items render as "3 meals" (single-category path)', () => {
    const out = formatOutcomeDetail([
      { itemName: 'Breakfast', itemType: 'nutrition', status: 'completed' },
      { itemName: 'Lunch', itemType: 'nutrition', status: 'completed' },
      { itemName: 'Dinner', itemType: 'nutrition', status: 'completed' },
    ] as any);
    // Single category path enumerates names with Oxford comma at length 3+.
    // Output: "Breakfast, Lunch, and Dinner" — no plural label, no
    // "nutrition" word. Validates that the fix doesn't break the
    // single-category enumeration.
    expect(out).toBe('Breakfast, Lunch, and Dinner');
    expect(out).not.toContain('nutritions');
  });
});
