// ============================================================================
// Phase 7.4 (RETIRED in Phase 26 F5) — footer affirmation removed.
//
// The Phase-7.4 footer affirmation ("You're doing something / most people
// never see.") was the closing emotional beat at the bottom of the You
// tab. Phase 26 F5 drops the entire footer block because the warmer
// surface — AffirmationHeader at the top of the tab — already carries
// the witness signal (Phase 11.2 wired witness.line into it), so the
// footer line was a duplicate emotional beat sitting on a different
// page region.
//
// Per the repo's "retirement pin" convention (see
// journalDisclaimer.test.tsx / journalHeaderMoodLine.test.tsx /
// sampleIndicatorTap.test.tsx), the original presence contracts flip
// to absence contracts that defend against re-introduction. The file
// is preserved (not deleted) so the retirement is discoverable in
// future code archaeology.
//
// Six absence contracts:
//   1. The literal closing copy "You're doing something..." no longer
//      renders.
//   2. No footerText style block exists (the styles got retired too).
//   3. No footer style block exists.
//   4. The "wellness link" → "plan ahead" → end-of-scroll sequence
//      does not pass back through a footer view of any kind.
//   5. The Phase 11.3 witness footerLine field is no longer rendered
//      anywhere on this screen (Phase 26 F5 leaves the field on
//      WitnessSignal for v1.1 cleanup but unsubscribes this surface).
//   6. The witness state is still wired (AffirmationHeader keeps
//      reading witness.line) — Phase 26 retired the footer rendering,
//      not the witness fetch.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const supportSrc = readFileSync(
  join(ROOT, 'app/(tabs)/support.tsx'),
  'utf8',
);

// Strip comments so the retirement narrative in support.tsx's file header
// can't false-positive against any absence pin.
const stripped = supportSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 26 F5 — footer affirmation retirement', () => {
  it('contract 1: the closing affirmation copy does NOT render', () => {
    expect(stripped).not.toMatch(/You're doing something/);
    expect(stripped).not.toMatch(/most people never see/);
  });

  it('contract 2: no footerText style block remains', () => {
    expect(stripped).not.toMatch(/\bfooterText\s*:\s*\{/);
  });

  it('contract 3: no footer style block remains', () => {
    // The retired block was `footer: { alignItems: 'center', paddingTop: 44, paddingBottom: 108 }`.
    // Pin the specific shape rather than just the identifier so a
    // future unrelated style key named `footer*` doesn't false-positive.
    expect(stripped).not.toMatch(/\bfooter\s*:\s*\{[^}]*paddingTop:\s*44/);
  });

  it('contract 4: no footer JSX View renders below the plan-ahead block', () => {
    // The retired JSX was `<View style={styles.footer}><Text ... /></View>`.
    // Anchor on `styles.footer\b` (not `styles.footerSomething`) to pin
    // the retirement of the specific block.
    expect(stripped).not.toMatch(/styles\.footer\b/);
  });

  it('contract 5: witness.footerLine is not consumed anywhere in support.tsx', () => {
    // The Phase 11.3 footer wired `witness?.footerLine ?? "..."` into
    // its Text content. Post-26 nothing reads `.footerLine` from the
    // witness on this screen. The field stays on WitnessSignal for v1.1
    // cleanup — see comment at utils/caregiverWitnessBuilder.ts.
    expect(stripped).not.toMatch(/footerLine/);
  });

  it('contract 6: witness state is still wired (AffirmationHeader keeps the witness.line path)', () => {
    // Retirement removed the SECOND witness surface, not the witness
    // fetch itself. AffirmationHeader continues to render witness.line
    // (Phase 11.2). support.tsx still owns the single buildCaregiverWitness
    // call and the multi-pipeline refresh listener.
    expect(stripped).toMatch(/buildCaregiverWitness/);
    expect(stripped).toMatch(/<AffirmationHeader\s+witness=\{witness\}/);
  });
});
