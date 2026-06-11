// ============================================================================
// Onboarding-only design tokens.
//
// The 4-screen onboarding flow (C1–C4) renders inside the Charcoal Ink
// brand register, which is warmer + softer than the website's pure
// ember palette. Theme tokens (colors.ember / colors.emberDeep) stay
// untouched because other in-app surfaces still depend on them; the
// onboarding CTA uses this dedicated constant instead.
//
// ONBOARDING_CTA_GRADIENT — applied to the LinearGradient on every
// primary CTA across Welcome / Privacy / Name / Landing. The label
// color stays #1a1612 near-black charcoal at fontWeight 600 (matches
// the post-walk layout pass).
// ============================================================================

export const ONBOARDING_CTA_GRADIENT: readonly [string, string] = [
  '#e09556',
  '#c98a4a',
];
