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

  it('contract 5 (SINGLE FIELD): one TextInput labeled "THEIR NAME"', () => {
    expect(SRC).toMatch(/TextInput/);
    expect(SRC).toContain('THEIR NAME');
    // Pre-redesign placeholder from GetStartedScreen must NOT appear here.
    expect(SRC).not.toMatch(/Mom, Dad, Linda/);
  });

  it('contract 6 (EMBER CONTINUE CTA): ember + emberDeep tokens referenced; "Continue" label; no slab-green (#5fb88a)', () => {
    expect(SRC).toMatch(/colors\.ember\b/);
    expect(SRC).toMatch(/emberDeep/);
    expect(SRC).toMatch(/['"`]Continue['"`]/);
    expect(SRC).not.toMatch(/#5fb88a/i);
  });

  it('contract 7 (ONCONTINUE RECEIVES NAME): the prop signature passes the entered name up', () => {
    expect(SRC).toMatch(/onContinue/);
    // The handler that fires the prop passes the trimmed name.
    expect(SRC).toMatch(/onContinue\s*\(\s*[A-Za-z_$][\w$]*\s*(?:\.trim\(\))?\s*\)/);
  });

  it('contract 8 (DISABLED-UNTIL-NONEMPTY): the CTA disabled / 40% opacity state tracks the trimmed name', () => {
    // Source-pin the predicate shape: either a derived const or an
    // inline check that compares the trimmed name to empty.
    expect(SRC).toMatch(/\.trim\(\)/);
    expect(SRC).toMatch(/opacity:\s*0\.4|disabled:/);
  });
});
