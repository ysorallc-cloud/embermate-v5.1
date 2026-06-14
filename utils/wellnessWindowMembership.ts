// ============================================================================
// WELLNESS WINDOW MEMBERSHIP — single source of truth (wellness-merge F4).
//
// The per-window enable/disable membership math for wellness check-ins.
// Both surfaces that toggle a window call THIS one function so they can
// never fork:
//   • onboarding wizard — storage/carePlanConfigRepo.setWellnessWindowEnabled
//   • Care Plan drawer  — WellnessWindowsDrawer.handleEnableChange
//
// Semantics (Q-34.F5.B Option (b) lock — membership is the single
// source of truth, `enabled` rides in lockstep):
//   • enable  → window appended to timesOfDay, deduped (idempotent)
//   • disable → window removed; ALL other values untouched
//               (hide-not-delete — legacy 'midday'/'night' survive)
//   • enabled → true ⟺ the resulting timesOfDay is non-empty
//
// Pure + storage-agnostic so it's safe to import from both a repo
// (storage layer) and a component (UI layer) without a dependency
// cycle. Callers persist the returned shape however they already do
// (updateBucketConfig in the repo; onUpdate→updateBucket in the drawer).
// ============================================================================

export interface WellnessWindowMembership {
  timesOfDay: string[];
  enabled: boolean;
}

export function nextWellnessWindowMembership(
  currentTimes: readonly string[],
  window: string,
  enabled: boolean,
): WellnessWindowMembership {
  const nextTimes = enabled
    ? [...currentTimes.filter((t) => t !== window), window]
    : currentTimes.filter((t) => t !== window);
  return { timesOfDay: nextTimes, enabled: nextTimes.length > 0 };
}
