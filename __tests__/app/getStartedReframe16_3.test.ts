// ============================================================================
// Phase 16.3 — GetStartedScreen secondary-card copy reframed.
//
// Pre-16.3 the secondary card on GetStartedScreen (the "explore with
// sample data" path) read as a demo/fallback:
//   • Title:    "Keep exploring with Dad's example"   (caregiver mode)
//                "Keep exploring with our example"     (self mode)
//   • Body:     "Try the app populated. Switch to your own anytime in
//                Settings."
//
// 16.3 reframes the secondary card as a legitimate first-choice path,
// not a demo escape hatch. New copy is unconditional (post-Screen-2 cut
// careMode is hardcoded caregiver, so there's no remaining mode branch
// to vary copy by):
//   • Title:    "Start with the populated example"
//   • Body:     "Switch to your own anytime."
//
// Primary card copy unchanged ("Set up my loved one — Just a name. Add
// meds whenever.").
//
// Source-level audit; codeOnly() strips comments so retirement prose
// mentioning the old strings does not false-positive against the
// absence pins.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'app/(onboarding)/screens/GetStartedScreen.tsx'), 'utf8',
);
const code = codeOnly(src);

describe('Phase 16.3 — GetStartedScreen primary card (unchanged)', () => {
  it('contract 1: primary title is "Set up my loved one"', () => {
    expect(code).toContain('Set up my loved one');
  });

  it('contract 2: primary subtitle is "Just a name. Add meds whenever."', () => {
    expect(code).toContain('Just a name. Add meds whenever.');
  });
});

describe('Phase 16.3 — GetStartedScreen secondary card (new copy)', () => {
  it('contract 3: secondary title is "Start with the populated example"', () => {
    expect(code).toContain('Start with the populated example');
  });

  it('contract 4: secondary subtitle is "Switch to your own anytime."', () => {
    expect(code).toContain('Switch to your own anytime.');
  });
});

describe('Phase 16.3 — GetStartedScreen absence pins (regression-prevention)', () => {
  // Scoped to this file only — "anytime in Settings" appears in
  // WhoIsThisForScreen and WatchForScreen as legitimate copy on
  // OTHER surfaces; this audit reads only GetStartedScreen.
  it('does not contain "Keep exploring"', () => {
    expect(code).not.toMatch(/Keep exploring/);
  });

  it('does not contain "Try the app populated"', () => {
    expect(code).not.toMatch(/Try the app populated/);
  });

  it('does not contain "anytime in Settings"', () => {
    expect(code).not.toMatch(/anytime in Settings/);
  });

  it('does not contain "Dad\'s example" or "our example"', () => {
    // The old caregiver/self mode branches both leaked into copy.
    // Post-cut, neither phrasing survives — the new copy is mode-
    // neutral.
    expect(code).not.toMatch(/Dad['’]s example/);
    expect(code).not.toMatch(/our example/);
  });
});

describe('Phase 16.3 — GetStartedScreen careMode prop retired', () => {
  it('contract 5: careMode prop / parameter / conditional are gone', () => {
    // Post Screen-2 cut, careMode has no source. The screen no
    // longer reads or branches on it.
    expect(code).not.toMatch(/\bcareMode\b/);
    expect(code).not.toMatch(/isSelf\b/);
  });

  it('contract 6: input placeholder is the caregiver-mode default (Mom/Dad/Linda only)', () => {
    // The "Your first name" self-mode placeholder is gone with the
    // mode branch. "e.g. Mom, Dad, Linda" is the unconditional copy.
    expect(code).toContain('Mom, Dad, Linda');
    expect(code).not.toContain('Your first name');
  });
});
