// ============================================================================
// ProfileNamePrompt visibility predicate.
//
// Pure function — testable in isolation. Used by the
// components/now/ProfileNamePrompt component to decide whether to
// render the nudge in this render pass.
//
// See __tests__/components/profileNamePrompt.test.tsx for the full
// contract list.
// ============================================================================

export interface ProfileNamePromptVisibilityInputs {
  /** ONBOARDING_COMPLETE flag value, normalized to boolean. */
  onboardingComplete: boolean;
  /** Current caregiver name (null/empty means "not set"). */
  caregiverName: string | null | undefined;
  /** True iff the caregiver has logged at least one real (non-sample)
   *  event since installing. We ask AFTER the user feels the app's
   *  value, not before. */
  hasRealLoggedEvent: boolean;
  /** Lifetime dismissed count (persisted at
   *  @embermate_profile_nudge_dismissed_count). After 3 we never
   *  ask again — respect the no. */
  dismissedCount: number;
  /** True iff the app is currently in sample-data-only mode. A
   *  populated-example user is not a real user who needs to name
   *  themselves; parity with the blocker-#1 sample-leak fix. */
  isSampleMode: boolean;
}

export function computeProfileNamePromptVisibility(
  inputs: ProfileNamePromptVisibilityInputs,
): boolean {
  if (!inputs.onboardingComplete) return false;
  if (inputs.caregiverName && inputs.caregiverName.trim().length > 0) return false;
  if (!inputs.hasRealLoggedEvent) return false;
  if (inputs.dismissedCount >= 3) return false;
  if (inputs.isSampleMode) return false;
  return true;
}
