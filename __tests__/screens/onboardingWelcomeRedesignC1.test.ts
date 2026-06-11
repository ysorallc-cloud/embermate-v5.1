// ============================================================================
// Onboarding redesign C1 — Welcome screen voice + visual contract.
//
// Pre-launch onboarding redesign replaces the wizard-driven flow with a
// 4-screen emotional flow anchored to the embermate.app voice. Welcome
// is screen 1: it sets the brand register (serif display, hairline-rule
// minimalism, ember CTA) and the emotional landing line. The wizard
// stays untouched; this is a SCOPED replacement of the (onboarding)
// flow only.
//
// Voice lock — every string lives in the embermate.app register:
//   • serif, lowercase-feeling, warm
//   • no exclamation points, no "Let's get started!", no feature brag
//   • the website's own words ARE the source: "You carry more than
//     people can see." / "A quiet place to put some of it down."
//
// Contracts pinned here (source-pin; pure-visual screen — device walk
// gates the actual font + gradient render):
//   1. TITLE — "You carry more\nthan people can see." present
//      verbatim.
//   2. SUBTITLE — "A quiet place to put some of it down." present
//      verbatim.
//   3. SERIF FONT TOKENS — Fonts.serif applied to title; Fonts.
//      serifItalic applied to subtitle. The current screen uses
//      system-sans which is the #1 AI-tell.
//   4. EMBER GRADIENT CTA — colors.ember + colors.emberDeep
//      referenced for the Begin button gradient. Slab-green
//      (#5fb88a) MUST NOT appear in the screen — sage is in-app,
//      ember is onboarding.
//   5. NO EMOJI ICONOGRAPHY — \u{1F48A} (💊), \u{1F4CA} (📊),
//      \u{1F512} (🔒) emoji previously used as value-row icons are
//      gone. The thin-rule treatment replaces them.
//   6. "BEGIN" CTA — the button label is the single word "Begin".
//      No "Get Started", no "Next", no "Continue".
//   7. ONCONTINUE PROP — the screen takes an onContinue: () => void
//      prop and wires it to the Begin button's onPress.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../../app/(onboarding)/screens/WelcomeScreen.tsx'),
  'utf8',
);

describe('Onboarding redesign C1 — Welcome screen', () => {
  it('contract 1 (TITLE): "You carry more\\nthan people can see." present verbatim', () => {
    expect(SRC).toMatch(/You carry more[\s\S]{0,20}than people can see\./);
  });

  it('contract 2 (SUBTITLE): "A quiet place to put some of it down." present verbatim', () => {
    expect(SRC).toContain('A quiet place to put some of it down.');
  });

  it('contract 3 (SERIF FONT TOKENS): Fonts.serif + Fonts.serifItalic referenced — system-sans is the AI-tell, serif is the brand', () => {
    expect(SRC).toMatch(/Fonts\.serif\b/);
    expect(SRC).toMatch(/Fonts\.serifItalic\b/);
  });

  it('contract 4 (EMBER GRADIENT CTA): ember + emberDeep tokens referenced; no slab-green (#5fb88a) in source', () => {
    expect(SRC).toMatch(/colors\.ember\b/);
    expect(SRC).toMatch(/emberDeep/);
    expect(SRC).not.toMatch(/#5fb88a/i);
  });

  it('contract 5 (NO EMOJI ICONOGRAPHY): the three value-row emoji from the prior screen are gone', () => {
    // Pre-redesign value-row emoji: 💊 (\u{1F48A}), 📊 (\u{1F4CA}),
    // 🔒 (\u{1F512}). The thin-rule treatment replaces them.
    expect(SRC).not.toMatch(/\u{1F48A}/u);
    expect(SRC).not.toMatch(/\u{1F4CA}/u);
    expect(SRC).not.toMatch(/\u{1F512}/u);
  });

  it('contract 6 ("BEGIN" CTA): the primary button label is the single word "Begin"', () => {
    expect(SRC).toMatch(/['"`]Begin['"`]/);
    // Pre-redesign verbiage should be gone from this screen.
    expect(SRC).not.toMatch(/Get Started/);
  });

  it('contract 7 (ONCONTINUE PROP): the screen accepts an onContinue handler and wires it to the CTA', () => {
    expect(SRC).toMatch(/onContinue/);
  });
});
