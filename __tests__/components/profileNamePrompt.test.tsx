// ============================================================================
// Post-onboarding ProfileNamePrompt — visibility predicate + copy lock.
//
// Onboarding redesign C4 deferred the caregiver's own name (the new
// flow only captures the patient's name). The nudge RECOVERS the
// caregiver-name personalization that downstream surfaces
// (JournalIdentityStrip, JournalNotesCard, handoffs) need to show
// "who wrote what." It's a soft offer, not a blocker.
//
// VISIBILITY PREDICATE — all conditions must hold:
//   1. ONBOARDING_COMPLETE === true (we don't ask mid-onboarding)
//   2. CAREGIVER_NAME is null/empty (already-set users aren't asked)
//   3. ≥1 real logged event exists (we ask AFTER the user feels the
//      app's value, not before)
//   4. dismissed-count < 3 (respect the no after 3 dismissals)
//   5. NOT in sample-data-only mode (a populated-example user is not
//      a real user who needs to name themselves; parity with the
//      blocker-#1 sample-leak fix)
//
// COPY LOCK (embermate.app voice — serif, gentle, NOT nagging):
//   "Add your name so handoffs show who wrote what."
//
// VISUAL LOCK:
//   • cardGlass bg, glassBorder hairline (NOT sageLight — this is a
//     whisper, not a banner)
//   • serif body
//   • × dismiss affordance on the right, textMuted, NOT a competing
//     CTA shape
//
// SAVE PATH:
//   Tap row → navigate to /settings/profile (existing surface).
//   When the user saves there, writePatientName / writeCaregiverName
//   emits EVENT.PATIENT; the nudge re-reads on the next render and
//   auto-hides because CAREGIVER_NAME is no longer null.
//
// DISMISS PATH:
//   × button increments @embermate_profile_nudge_dismissed_count.
//   After 3 increments, the nudge never appears again.
//
// CONTRACTS:
//   1. SHOWS — predicate returns true with the happy-path inputs.
//   2. HIDDEN-NAME — predicate false when CAREGIVER_NAME is set.
//   3. HIDDEN-ZERO-LOGS — predicate false when no real logs exist.
//   4. HIDDEN-DISMISS-LIMIT — predicate false when dismissedCount >= 3.
//   5. HIDDEN-SAMPLE-MODE — predicate false when in sample mode.
//   6. HIDDEN-PRE-ONBOARDING — predicate false until ONBOARDING_COMPLETE.
//   7. COPY LOCK — "Add your name so handoffs show who wrote what."
//      present in the component source.
//   8. NO SAGELIGHT — the component does NOT use sageLight bg (a
//      competing CTA color); the cardGlass token is referenced
//      instead.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { computeProfileNamePromptVisibility } from '../../utils/profileNamePromptVisibility';

const SRC = readFileSync(
  join(__dirname, '../../components/now/ProfileNamePrompt.tsx'),
  'utf8',
);

const HAPPY_INPUTS = {
  onboardingComplete: true,
  caregiverName: null as string | null,
  hasRealLoggedEvent: true,
  dismissedCount: 0,
  isSampleMode: false,
};

describe('ProfileNamePrompt — visibility predicate', () => {
  it('contract 1 (SHOWS): predicate returns true with the happy-path inputs', () => {
    expect(computeProfileNamePromptVisibility(HAPPY_INPUTS)).toBe(true);
  });

  it('contract 2 (HIDDEN-NAME): predicate false when CAREGIVER_NAME is set', () => {
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        caregiverName: 'Amber',
      }),
    ).toBe(false);
  });

  it('contract 3 (HIDDEN-ZERO-LOGS): predicate false when no real logs exist (don\'t ask before first value)', () => {
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        hasRealLoggedEvent: false,
      }),
    ).toBe(false);
  });

  it('contract 4 (HIDDEN-DISMISS-LIMIT): predicate false when dismissedCount >= 3 (respect the no)', () => {
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        dismissedCount: 3,
      }),
    ).toBe(false);
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        dismissedCount: 5,
      }),
    ).toBe(false);
  });

  it('contract 5 (HIDDEN-SAMPLE-MODE): predicate false in sample mode (a populated-example user is not a real user)', () => {
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        isSampleMode: true,
      }),
    ).toBe(false);
  });

  it('contract 6 (HIDDEN-PRE-ONBOARDING): predicate false until ONBOARDING_COMPLETE', () => {
    expect(
      computeProfileNamePromptVisibility({
        ...HAPPY_INPUTS,
        onboardingComplete: false,
      }),
    ).toBe(false);
  });
});

describe('ProfileNamePrompt — source pins', () => {
  it('contract 7 (COPY LOCK): "Add your name so handoffs show who wrote what." present verbatim', () => {
    expect(SRC).toContain('Add your name so handoffs show who wrote what.');
  });

  it('contract 8 (NO SAGELIGHT): the component references the quiet cardGlass token, not sageLight (this is a whisper, not a banner)', () => {
    expect(SRC).not.toMatch(/sageLight\b/);
    expect(SRC).toMatch(/glass\b/);
  });
});
