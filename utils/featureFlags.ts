// ============================================================================
// FEATURE FLAGS
//
// Simple, synchronous flag registry for gating features that ship in the tree
// but are not surfaced in a given release.
//
// v1: `drugInteractions` is OFF. The interaction checker screens against a
// fixed 22-pair exact-match list; a "High Risk: 0" from that list falsely
// reassures a caregiver whose real dangerous combination (e.g. Coumadin +
// Advil, which the list never matches) shows as clean. Until the underlying
// data is trustworthy, the feature stays flagged off — code retained, not
// surfaced. See Gate C (__tests__/gates/gateC_noInteractionSafetySignal).
// ============================================================================

export type FeatureFlag = 'drugInteractions';

/** Ship defaults. Anything not listed is treated as OFF. */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  drugInteractions: false,
};

/**
 * Runtime overrides (e.g. a dev-only toggle). Empty in production so releases
 * always get the safe defaults above.
 */
const overrides: Partial<Record<string, boolean>> = {};

/**
 * Whether a feature is enabled. Synchronous by design so render paths can gate
 * on it without an async hop. Unknown flags default to OFF (fail-safe).
 */
export function isFeatureEnabled(flag: string): boolean {
  if (Object.prototype.hasOwnProperty.call(overrides, flag)) {
    return overrides[flag] === true;
  }
  return DEFAULT_FLAGS[flag as FeatureFlag] ?? false;
}

/** Set a runtime override (dev tooling / tests). */
export function setFeatureOverride(flag: string, enabled: boolean): void {
  overrides[flag] = enabled;
}

/** Clear a runtime override, reverting to the ship default. */
export function clearFeatureOverride(flag: string): void {
  delete overrides[flag];
}
