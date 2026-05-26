// ============================================================================
// Phase 33 F7 follow-up — wellness category-row toggle MUST persist OFF.
//
// USER REPORT (2026-05-26): "Wellness toggle won't turn OFF on device."
//
// ROOT CAUSE (audit, found by tracing the read/write path):
//   types/carePlanConfig.ts:521-526 — `getEnabledBuckets` force-
//   includes 'wellness' regardless of stored `enabled` state:
//
//     export function getEnabledBuckets(config: CarePlanConfig) {
//       const buckets = BUCKET_TYPES.filter(b => config[b]?.enabled);
//       // Wellness is always-on — force-include if missing
//       if (!buckets.includes('wellness')) buckets.push('wellness');
//       return buckets;
//     }
//
//   Pre-32A this was correct (wellness lived in ALWAYS_ON). 32A
//   (commit 32A F2) moved wellness into DAILY_TRACKING — toggleable
//   like vitals + meals. The force-include never got removed.
//
//   What the user sees: tap toggle → write succeeds (storage has
//   wellness.enabled=false) → enabledBuckets re-derives via
//   getEnabledBuckets → force-include puts wellness back → Switch
//   re-renders as enabled=true → looks like the toggle "didn't
//   take." Round-trip is broken at the READ side.
//
// FIX: remove the force-include. Wellness reads its stored
// `enabled` value like every other DAILY_TRACKING bucket.
//
// SEPARATE BUG (data state, NOT code) — evening chips not filling:
//   Render path is symmetric (proven by wellnessDrawerChipParity33F7).
//   evening.checks is only written by toggleField in WellnessDrawer;
//   no migration / sample-data / startup hook touches it. The
//   device-observed empty fills mean the stored evening.checks is
//   reduced. User taps a chip to restore selection — code is correct.
//   Likely user-flow path that produced it: confusion from Bug A
//   above led to "fixing" by tapping chips, ending with empty checks.
//   Not auto-repaired (would be destructive of explicit user intent).
// ============================================================================

import {
  createDefaultCarePlanConfig,
  getEnabledBuckets,
  type CarePlanConfig,
} from '../../types/carePlanConfig';

function withWellnessEnabled(enabled: boolean): CarePlanConfig {
  const config = createDefaultCarePlanConfig('default');
  return {
    ...config,
    wellness: { ...config.wellness, enabled },
  };
}

describe('Phase 33 F7 follow-up — Wellness category-row toggle persists OFF (no force-include)', () => {
  it('contract 1: wellness.enabled = true → getEnabledBuckets includes "wellness" (regression guard, behavior unchanged)', () => {
    const config = withWellnessEnabled(true);
    expect(getEnabledBuckets(config)).toContain('wellness');
  });

  it('contract 2 (BUG FIX): wellness.enabled = false → getEnabledBuckets does NOT include "wellness"', () => {
    // The user-reported bug — wellness was force-included
    // unconditionally, masking the user's stored false state.
    // Post-fix the helper respects the stored value, same as
    // every other DAILY_TRACKING bucket.
    const config = withWellnessEnabled(false);
    expect(getEnabledBuckets(config)).not.toContain('wellness');
  });

  it('contract 3: other DAILY_TRACKING buckets reflect their stored enabled value (parity check — wellness must behave the same)', () => {
    // Vitals + Meals are the other DAILY_TRACKING buckets. They
    // correctly toggle off in the read path. Pin the parity so
    // wellness behaving like them is visible from this test.
    const config = createDefaultCarePlanConfig('default');
    const off: CarePlanConfig = {
      ...config,
      vitals: { ...config.vitals, enabled: false },
      meals: { ...config.meals, enabled: false },
      wellness: { ...config.wellness, enabled: false },
    };
    const enabled = getEnabledBuckets(off);
    expect(enabled).not.toContain('vitals');
    expect(enabled).not.toContain('meals');
    expect(enabled).not.toContain('wellness');
  });

  it('contract 4: toggling wellness off then back on round-trips through the helper correctly', () => {
    // Simulates the user-flow that was broken pre-fix: toggle OFF
    // (helper said "still on"), toggle ON (helper said "still on" —
    // looked like nothing happened). Post-fix each write is
    // observable through the helper.
    const onConfig = withWellnessEnabled(true);
    expect(getEnabledBuckets(onConfig)).toContain('wellness');

    const offConfig = withWellnessEnabled(false);
    expect(getEnabledBuckets(offConfig)).not.toContain('wellness');

    const backOn = withWellnessEnabled(true);
    expect(getEnabledBuckets(backOn)).toContain('wellness');
  });

  it('contract 5: NO force-include source pattern survives in getEnabledBuckets', () => {
    // Source-level pin against the specific shape that caused the
    // bug — `if (!buckets.includes('wellness')) buckets.push('wellness')`.
    // If a future maintainer tries to restore "always-on" behavior
    // via the same force-include pattern, this test catches it.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../..', 'types/carePlanConfig.ts'),
      'utf8',
    );
    // Strip comments first so the explanatory block doesn't false-positive.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(stripped).not.toMatch(/buckets\.push\s*\(\s*['"]wellness['"]\s*\)/);
    expect(stripped).not.toMatch(/!buckets\.includes\s*\(\s*['"]wellness['"]\s*\)/);
  });
});
