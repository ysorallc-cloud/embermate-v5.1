// ============================================================================
// needsCaptureBeforeComplete + capture route (FIX B + wellness).
//
// A one-tap "done" (quick-confirm OR the RoutineSheet "Complete all" batch) must
// NOT blind-complete a VALUE-BEARING item — vitals carries a reading, wellness
// captures sleep/mood/energy. Completing without that data records empty/false
// content. Value-bearing items must open their capture screen instead; binary
// items (meds) still complete in place.
// ============================================================================

import { needsCaptureBeforeComplete, getRouteForInstanceType } from '../../utils/nowHelpers';

describe('needsCaptureBeforeComplete — which items must open capture instead of completing', () => {
  it('VITALS and WELLNESS are value-bearing (must not be blind-completed)', () => {
    expect(needsCaptureBeforeComplete('vitals')).toBe(true);
    expect(needsCaptureBeforeComplete('wellness')).toBe(true);
  });

  it('binary items complete in place (no capture)', () => {
    expect(needsCaptureBeforeComplete('medication')).toBe(false);
    expect(needsCaptureBeforeComplete('nutrition')).toBe(false);
    expect(needsCaptureBeforeComplete('hydration')).toBe(false);
    expect(needsCaptureBeforeComplete('activity')).toBe(false);
    expect(needsCaptureBeforeComplete('custom')).toBe(false);
  });

  it('vitals + wellness route to their capture screens', () => {
    expect(getRouteForInstanceType('vitals')).toBe('/log-vitals');
    expect(getRouteForInstanceType('wellness')).toBe('/silent-vitals');
  });
});
