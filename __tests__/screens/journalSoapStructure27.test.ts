// ============================================================================
// Phase 27 F8 — Journal SOAP four-section structure pin.
//
// Comprehensive regression-pin for the four-section SOAP layout that
// replaced the pre-27 four-tier linear today layout. Catches drift in
// three forms:
//
//   • A section card renders out of order (Plan above Assessment, etc.).
//   • A section's tint flips to a different lane color (e.g. Section 1
//     drifts to sage, breaking the lavender bookend rhythm).
//   • A retired legacy surface drifts back into the today path
//     (NarrativeSnapshot mount).
//
// Source-level audit — same readFileSync + regex pattern the other
// journal*27 tests use.
//
// Pinned contracts:
//   1. journal.tsx imports SoapSectionFrame from components/journal.
//   2. Section 1 (Subjective) — eyebrow "How today went", tint
//      caregiverAccent.
//   3. Section 2 (Objective) — eyebrow "What was logged", tint
//      neutral. Renders AFTER Section 1.
//   4. Section 3 (Assessment) — mounted as
//      <TodayNotableMoments wrapInSection />; TodayNotableMoments
//      owns the SoapSectionFrame amber chrome internally and returns
//      null when no moments fire. Renders AFTER Section 2.
//   5. Section 4 (Plan) — eyebrow "For the next caregiver", tint
//      caregiverAccent. Renders AFTER Section 3 (TodayNotableMoments).
//   6. Lavender bookend rhythm: Sections 1 and 4 share the
//      caregiverAccent tint; Sections 2 and 3 use neutral + amber.
//   7. The pre-27 NarrativeSnapshot mount is gone from the today path.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function findSoapSectionFrameByEyebrow(eyebrow: string): { start: number; tag: string } | null {
  // Phase 27.X — Section 4's eyebrow turned into a JSX conditional
  // expression. This matcher accepts both string-literal eyebrows
  // (Sections 1-3) and expression-embedded ones (Section 4) by
  // checking the opener tag for the eyebrow substring.
  let cursor = 0;
  while (true) {
    const open = STRIPPED.indexOf('<SoapSectionFrame', cursor);
    if (open === -1) return null;
    const tagEnd = STRIPPED.indexOf('>', open);
    if (tagEnd === -1) return null;
    const tag = STRIPPED.slice(open, tagEnd + 1);
    if (tag.includes(eyebrow)) return { start: open, tag };
    cursor = open + 1;
  }
}

describe('Phase 27 F8 / F7 reshape — Journal four-section structure', () => {
  // F7 (2026-06-12) reshaped the Phase 27 SOAP structure:
  //   • Section 1 ("How today went") — SoapSectionFrame + caregiverAccent
  //     eyebrow RETIRED. The gestalt now renders as italic-serif 14px
  //     narrative prose directly, flat against the page (no card, no
  //     eyebrow). Tested via journalNarrativeBlock + journalNarrativePrompt
  //     style anchors instead of SoapSectionFrame.
  //   • Section 4 ("For the next caregiver") — SoapSectionFrame +
  //     caregiverAccent left-rule RETIRED. Now a fully-bordered dusty
  //     card (CardBorder.dusty + CARD_PADDING_V). Anchored on
  //     section4DustyCard / section4DustyEyebrow.
  //   • Section 2 ("What was logged") — UNCHANGED. Still
  //     SoapSectionFrame with neutral tint.
  //   • Section 3 (TodayNotableMoments wrapInSection) — UNCHANGED.
  //     Amber chrome rendered internally by the component.
  // Lavender bookend rhythm is intentionally retired with F7.

  it('contract 1: journal.tsx imports SoapSectionFrame for the surviving Section 2 mount', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bSoapSectionFrame\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/SoapSectionFrame['"]/,
    );
  });

  it('contract 2 [F7 reshape]: Section 1 renders narrative prose; no SoapSectionFrame, no eyebrow', () => {
    expect(STRIPPED).not.toMatch(/eyebrow=["']How today went["']/);
    // Anchor the new narrative block style refs (set on a flat View
    // wrapping GestaltSummary + the empty-state prompt).
    expect(STRIPPED).toMatch(/s\.journalNarrativeBlock\b/);
    expect(STRIPPED).toMatch(/s\.journalNarrativePrompt\b/);
  });

  it('contract 3: Section 2 (Objective) — eyebrow "What was logged", tint neutral, AFTER the narrative block', () => {
    const s2 = findSoapSectionFrameByEyebrow('What was logged');
    expect(s2).toBeTruthy();
    expect(s2!.tag).toMatch(/tint=["']neutral["']/);
    const narrativeIdx = STRIPPED.indexOf('s.journalNarrativeBlock');
    expect(narrativeIdx).toBeGreaterThan(-1);
    expect(s2!.start).toBeGreaterThan(narrativeIdx);
  });

  it('contract 4 [UX-3 reshuffle]: Section 3 (Assessment) — <TodayNotableMoments wrapInSection />, BEFORE narrative block', () => {
    const narrativeIdx = STRIPPED.indexOf('s.journalNarrativeBlock');
    const notableMount = STRIPPED.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    expect(notableMount![0]).toMatch(/\bwrapInSection\b/);
    const notableIdx = STRIPPED.indexOf(notableMount![0]);
    expect(notableIdx).toBeLessThan(narrativeIdx);
  });

  it('contract 5 [F7 reshape]: Section 4 renders a dusty-bordered card with the conditional eyebrow', () => {
    // Section 4 no longer uses SoapSectionFrame. F7 anchors on
    // section4DustyCard + section4DustyEyebrow style refs and on the
    // conditional eyebrow literal which still appears verbatim in JSX.
    expect(STRIPPED).toMatch(/s\.section4DustyCard\b/);
    expect(STRIPPED).toMatch(/s\.section4DustyEyebrow\b/);
    expect(STRIPPED).toContain('For the next caregiver');
    expect(STRIPPED).toContain('Notes from that day');
    // Ordering: dusty card comes AFTER TodayNotableMoments.
    const notableMount = STRIPPED.match(/<TodayNotableMoments[\s\S]*?\/>/);
    const dustyIdx = STRIPPED.indexOf('s.section4DustyCard');
    const notableIdx = STRIPPED.indexOf(notableMount![0]);
    expect(dustyIdx).toBeGreaterThan(notableIdx);
  });

  it('contract 6 [F7 reshape]: lavender bookend rhythm RETIRED — no caregiverAccent tint on Sections 1 or 4', () => {
    // The pre-F7 caregiverAccent-bookend rhythm intentionally dropped
    // with F7. Section 1 is plain prose; Section 4 is dusty-bordered.
    expect(STRIPPED).not.toMatch(/<SoapSectionFrame\b[\s\S]{0,200}?eyebrow=["']How today went["']/);
    expect(STRIPPED).not.toMatch(/<SoapSectionFrame\b[\s\S]{0,200}?eyebrow=["']For the next caregiver["']/);
    // Section 2's neutral tint stays.
    const s2 = findSoapSectionFrameByEyebrow('What was logged');
    expect(s2!.tag).toMatch(/tint=["']neutral["']/);
  });

  it('contract 7: NarrativeSnapshot mount is gone from the today path', () => {
    // Phase 27 retirement pin preserved into F7. Defends against
    // re-introducing the pre-27 recap mount.
    expect(STRIPPED).not.toMatch(/<NarrativeSnapshot\b/);
  });
});
