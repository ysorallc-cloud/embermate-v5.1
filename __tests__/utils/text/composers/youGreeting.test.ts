// ============================================================================
// Phase 29 F1 — composeYouGreeting (pure helper).
//
// Time-aware greeting composer for the You tab. Buckets match the
// smartDefaultsEngine convention used elsewhere (Phase 27.5b F8):
// morning < 12, afternoon 12-16, evening 17+.
//
// Pinned contracts:
//   1. hour < 12 → "Morning, {name}."
//   2. 12 ≤ hour < 17 → "Afternoon, {name}."
//   3. hour ≥ 17 → "Evening, {name}."
//   4. Empty name (or whitespace-only) → "Hello." regardless of hour.
//   5. Name is trimmed before interpolation (no leading/trailing space drift).
//   6. Boundaries — hour=11 morning; hour=12 afternoon; hour=16 afternoon;
//      hour=17 evening.
//   7. Overnight (hour < 4) falls into morning bucket — matches
//      JournalEmptyDay's F8 decision.
// ============================================================================

import { composeYouGreeting } from '../../../../utils/text/composers/youGreeting';

describe('Phase 29 F1 — composeYouGreeting', () => {
  it('contract 1: hour < 12 → "Morning, {name}."', () => {
    expect(composeYouGreeting({ hour: 8, name: 'Amber' })).toBe('Morning, Amber.');
  });

  it('contract 2: 12 ≤ hour < 17 → "Afternoon, {name}."', () => {
    expect(composeYouGreeting({ hour: 14, name: 'Amber' })).toBe('Afternoon, Amber.');
  });

  it('contract 3: hour ≥ 17 → "Evening, {name}."', () => {
    expect(composeYouGreeting({ hour: 20, name: 'Amber' })).toBe('Evening, Amber.');
  });

  it('contract 4: empty name → "Hello." regardless of hour', () => {
    for (const h of [3, 9, 12, 16, 17, 22]) {
      expect(composeYouGreeting({ hour: h, name: '' })).toBe('Hello.');
      expect(composeYouGreeting({ hour: h, name: '   ' })).toBe('Hello.');
    }
  });

  it('contract 5: name is trimmed before interpolation', () => {
    expect(composeYouGreeting({ hour: 8, name: '  Amber  ' })).toBe('Morning, Amber.');
  });

  it('contract 6: boundaries — hour 11 morning, 12 afternoon, 16 afternoon, 17 evening', () => {
    expect(composeYouGreeting({ hour: 11, name: 'A' })).toBe('Morning, A.');
    expect(composeYouGreeting({ hour: 12, name: 'A' })).toBe('Afternoon, A.');
    expect(composeYouGreeting({ hour: 16, name: 'A' })).toBe('Afternoon, A.');
    expect(composeYouGreeting({ hour: 17, name: 'A' })).toBe('Evening, A.');
  });

  it('contract 7: overnight (hour < 4) is morning', () => {
    expect(composeYouGreeting({ hour: 0, name: 'A' })).toBe('Morning, A.');
    expect(composeYouGreeting({ hour: 3, name: 'A' })).toBe('Morning, A.');
  });
});
