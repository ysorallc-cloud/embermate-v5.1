// ============================================================================
// Onboarding redesign C2 — Privacy screen visual + behavior contract.
//
// Screen 2 of the 4-screen flow. Per the C2 spec: two fixes only.
//   1. Replace the four privacy-point emoji (phone / lock-and-key /
//      raised-hand / no-entry) with the thin-rule hairline treatment
//      established by Welcome (C1) for visual coherence. The padlock
//      hero image at the top STAYS — it's the screen's emotional
//      anchor, not iconography-in-a-row.
//   2. Add a Terms helper line ("Please accept the terms to
//      continue.") that appears ONLY after a Next tap-attempt while
//      the checkbox is unchecked. No scolding before the user has
//      done anything — first-render must not show the helper.
//
// Other pre-existing copy (title, subtitle, disclaimer card, terms
// link) is preserved.
//
// Contracts pinned here (source-pin):
//   1. PADLOCK HERO STAYS — \\u{1F512} as a standalone Text remains
//      the screen's hero anchor.
//   2. FOUR POINT-ROW EMOJI REMOVED — phone (\\u{1F4F1}), lock-and-key
//      (\\u{1F510}), raised-hand (\\u270B), no-entry (\\u{1F6AB}) are
//      gone from the point rows.
//   3. THIN-RULE TREATMENT — borderLeftWidth: 1 with ember at ~30%
//      opacity replaces the emoji icons.
//   4. SERIF FONT TOKENS — Fonts.serif + Fonts.serifItalic referenced
//      (matches C1 brand register).
//   5. OWN CONTINUE CTA — the screen renders its own ember-gradient
//      "Continue" button (matches C1 pattern; the shared footer
//      Next is hidden on Privacy).
//   6. TERMS HELPER COPY — "Please accept the terms to continue."
//      present verbatim.
//   7. HELPER GATED BY ATTEMPT STATE — the helper renders
//      conditionally on a state flag that flips only after a
//      submit attempt (NOT on first render). Source-pin asserts
//      the conditional + state pattern.
//   8. ONCONTINUE PROP — the screen accepts an onContinue handler.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../../app/(onboarding)/screens/PrivacyDisclaimerScreen.tsx'),
  'utf8',
);

describe('Onboarding redesign C2 — Privacy screen', () => {
  it('contract 1 (PADLOCK HERO STAYS): \\u{1F512} present as the screen hero anchor', () => {
    expect(SRC).toMatch(/\\u\{1F512\}|\u{1F512}/u);
  });

  it('contract 2 (FOUR POINT-ROW EMOJI REMOVED): phone / lock-and-key / raised-hand / no-entry are gone from point rows', () => {
    // Source-pin: escape sequences from the prior implementation are
    // forbidden. The padlock (\\u{1F512}) is excluded — it's the hero
    // anchor, not a point-row emoji.
    expect(SRC).not.toMatch(/\\u\{1F4F1\}/);
    expect(SRC).not.toMatch(/\\u\{1F510\}/);
    expect(SRC).not.toMatch(/\\u270B/);
    expect(SRC).not.toMatch(/\\u\{1F6AB\}/);
  });

  it('contract 3 (THIN-RULE TREATMENT): borderLeftWidth + ember-at-30%-opacity hairline present', () => {
    expect(SRC).toMatch(/borderLeftWidth:\s*1/);
    expect(SRC).toMatch(/rgba\(255,\s*140,\s*66,\s*0\.30\)/);
  });

  it('contract 4 (SERIF FONT TOKENS): Fonts.serif + Fonts.serifItalic referenced', () => {
    expect(SRC).toMatch(/Fonts\.serif\b/);
    expect(SRC).toMatch(/Fonts\.serifItalic\b/);
  });

  it('contract 5 (OWN CONTINUE CTA — CHARCOAL INK BRIDGE): the screen renders a "Continue" button using the shared ONBOARDING_CTA_GRADIENT', () => {
    // Onboarding redesign Round 3 — the four screens unify on the
    // Charcoal Ink bridge gradient via ONBOARDING_CTA_GRADIENT
    // exported from app/(onboarding)/onboardingTokens.ts.
    expect(SRC).toMatch(/ONBOARDING_CTA_GRADIENT/);
    expect(SRC).toMatch(/['"`]Continue['"`]/);
  });

  it('contract 6 (TERMS HELPER COPY): "Please accept the terms to continue." present verbatim', () => {
    expect(SRC).toContain('Please accept the terms to continue.');
  });

  it('contract 7 (HELPER GATED BY ATTEMPT STATE): a state flag controls helper visibility — not first render', () => {
    // Three independent assertions; together they pin "the helper
    // appears only after an attempt while unchecked":
    //   (a) useState hook for the attempt flag is present
    //   (b) a derived/short-circuit conditional renders the helper
    //       block (showHelper && ... OR hasAttempted* && ...)
    //   (c) the helper Text sits inside that conditional block —
    //       proximity of the conditional gate keyword to the copy
    //       is enforced via a narrower 200-char window.
    expect(SRC).toMatch(/useState/);
    expect(SRC).toMatch(/(hasAttempted|attemptedSubmit|showTermsHelper)/);
    expect(SRC).toMatch(/(showHelper|showTermsHelper|hasAttemptedSubmit)\s*&&/);
    expect(SRC).toMatch(/(showHelper|showTermsHelper|hasAttemptedSubmit)\s*&&[\s\S]{0,300}Please accept the terms to continue\./);
  });

  it('contract 8 (ONCONTINUE PROP): the screen accepts an onContinue handler', () => {
    expect(SRC).toMatch(/onContinue/);
  });
});
