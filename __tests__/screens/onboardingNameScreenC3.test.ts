// ============================================================================
// Onboarding redesign C3 — Name screen contract.
//
// Screen 3 of the 4-screen flow. NEW file at NameScreen.tsx. Captures
// the patient name in a single field — NO progress dots, NO wizard
// chrome, NO step indicator. This isn't a form, it's a question.
// Caregiver's own name is deferred entirely (recovered later by the
// post-onboarding ProfileNamePrompt nudge); the prior multi-step name
// flow lived in GetStartedScreen which C4 retires.
//
// Voice lock — embermate.app register, serif throughout:
//   headline: "Who are you caring for?"
//   sub:      "Just a name. You can add the rest whenever."
//
// Contracts pinned here (source-pin; pure-visual + minimal-behavior
// screen, device walk gates actual font + gradient render):
//   1. HEADLINE — "Who are you caring for?" present verbatim.
//   2. SUB COPY — "Just a name. You can add the rest whenever."
//      present verbatim.
//   3. SERIF FONT TOKENS — Fonts.serif + Fonts.serifItalic
//      referenced (matches C1/C2 brand register).
//   4. NO STEP INDICATOR — "Step X of" / "X of N" / progress-dot
//      patterns are absent. PaginationDots not imported here.
//   5. SINGLE FIELD — one TextInput with the "THEIR NAME" caption
//      label (NOT the prior "Your name" / "Mom, Dad, Linda"
//      placeholder shape).
//   6. EMBER CONTINUE CTA — colors.ember + colors.emberDeep referenced;
//      "Continue" label; sage/slab-green (#5fb88a) absent.
//   7. ONCONTINUE RECEIVES NAME — the prop signature is
//      onContinue: (name: string) => void so the orchestrator gets
//      the entered value for C4's Landing screen interpolation.
//   8. DISABLED-UNTIL-NONEMPTY — the CTA opacity 0.4 / disabled
//      state tracks whether the trimmed name is empty.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../../app/(onboarding)/screens/NameScreen.tsx'),
  'utf8',
);

describe('Onboarding redesign C3 — Name screen', () => {
  it('contract 1 (HEADLINE): "Who are you caring for?" present verbatim', () => {
    expect(SRC).toContain('Who are you caring for?');
  });

  it('contract 2 (SUB COPY): "Just a name. You can add the rest whenever." present verbatim', () => {
    expect(SRC).toContain('Just a name. You can add the rest whenever.');
  });

  it('contract 3 (SERIF FONT TOKENS): Fonts.serif + Fonts.serifItalic referenced', () => {
    expect(SRC).toMatch(/Fonts\.serif\b/);
    expect(SRC).toMatch(/Fonts\.serifItalic\b/);
  });

  it('contract 4 (NO STEP INDICATOR): no "Step X of", no PaginationDots — this is a question, not a form', () => {
    expect(SRC).not.toMatch(/Step\s+\d+\s+of/i);
    expect(SRC).not.toMatch(/\d+\s+of\s+\d+/i);
    expect(SRC).not.toMatch(/PaginationDots/);
  });

  it('contract 5 (SINGLE FIELD): one TextInput labeled "THEIR NAME" with the soft "e.g. Mom, Dad, Linda" placeholder', () => {
    expect(SRC).toMatch(/TextInput/);
    expect(SRC).toContain('THEIR NAME');
    // Post-walk fix — placeholder updated to the soft cue per the
    // complete-fix spec. The placeholder lives inside the JSX
    // placeholder prop, not a label, so the prior "no Mom, Dad,
    // Linda label" assertion no longer applies.
    expect(SRC).toContain('e.g. Mom, Dad, Linda');
  });

  it('contract 6 (CHARCOAL INK CONTINUE CTA): ONBOARDING_CTA_GRADIENT imported; "Continue" label; no slab-green (#5fb88a)', () => {
    // Onboarding redesign Round 3 — shared bridge palette.
    expect(SRC).toMatch(/ONBOARDING_CTA_GRADIENT/);
    expect(SRC).toMatch(/['"`]Continue['"`]/);
    expect(SRC).not.toMatch(/#5fb88a/i);
  });

  it('contract 7 (ONCONTINUE RECEIVES NAME): the prop signature passes the entered name up', () => {
    expect(SRC).toMatch(/onContinue/);
    // The handler that fires the prop passes the trimmed name.
    expect(SRC).toMatch(/onContinue\s*\(\s*[A-Za-z_$][\w$]*\s*(?:\.trim\(\))?\s*\)/);
  });

  it('contract 8 (DISABLED-UNTIL-NONEMPTY): the CTA disabled / dim opacity state tracks the trimmed name', () => {
    // Source-pin the predicate shape: either a derived const or an
    // inline check that compares the trimmed name to empty.
    expect(SRC).toMatch(/\.trim\(\)/);
    // Post-walk fix — disabled wrapper opacity bumped from 0.4 to
    // 0.55 so the label still reads. Accept either 0.55 or a
    // disabled-style match.
    expect(SRC).toMatch(/opacity:\s*0\.(?:4|55)|disabled:/);
  });

  it('contract 9 (POST-WALK FIX — NO autoFocus): the launch-bug autoFocus prop is gone (focus-on-arrival now drives the keyboard)', () => {
    // Regression guard on the launch bug — autoFocus fires at mount
    // and iOS scrolls the paging FlatList to the focused TextInput,
    // overriding initialScrollIndex={0}. The post-walk fix replaces
    // it with a useEffect that watches an isActive prop and focuses
    // inside a settle delay AFTER the slide lands.
    expect(SRC).not.toMatch(/\bautoFocus\b/);
  });

  it('contract 10 (POST-WALK FIX — focus-on-arrival): the source uses an isActive prop + a useEffect-driven focus call', () => {
    expect(SRC).toMatch(/isActive/);
    expect(SRC).toMatch(/useEffect/);
    expect(SRC).toMatch(/\.focus\(\)/);
  });

  it('contract 11 (POST-WALK FIX — disabled-Continue feedback): tapping while empty surfaces a hint that clears on keystroke', () => {
    // Source-pin both the state flag + the hint copy.
    expect(SRC).toMatch(/(showEmptyHint|emptyHint|showHint)/);
    expect(SRC).toContain('Just their name to continue.');
  });

  it('contract 12 (POST-WALK FIX — field hint fills the void): "You can change this anytime." copy present', () => {
    expect(SRC).toContain('You can change this anytime.');
  });
});
