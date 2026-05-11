// ============================================================================
// Phase 15.5 — MAX_TRACKED_DIMENSIONS pinned at 6.
//
// The cap on the number of stat rings rendered on Now. Pre-15.5 this
// was a local MAX_TILES=4 const inside StatRings.tsx. Post-Phase 11.9
// enabled sleep + water buckets in sample-data config, which surfaced
// at 5/6 enabled buckets and got sliced off by the old cap. 15.5
// hoists the cap to 6 (the design constraint: caregivers can track
// up to 6 categories at-a-glance on the Now tab without overwhelming
// the row).
//
// This const lives in constants/carePlanLimits.ts so future call
// sites that need the same cap (e.g. Care Plan setup screens
// enforcing the limit at the input boundary — out of scope for
// 15.5, render-side is the regression-prevention floor) can import
// it without coupling to StatRings's internals.
// ============================================================================

import { MAX_TRACKED_DIMENSIONS } from '../carePlanLimits';

describe('Phase 15.5 — MAX_TRACKED_DIMENSIONS', () => {
  it('contract: equals 6', () => {
    expect(MAX_TRACKED_DIMENSIONS).toBe(6);
  });

  it('contract: is a positive integer', () => {
    expect(Number.isInteger(MAX_TRACKED_DIMENSIONS)).toBe(true);
    expect(MAX_TRACKED_DIMENSIONS).toBeGreaterThan(0);
  });
});
