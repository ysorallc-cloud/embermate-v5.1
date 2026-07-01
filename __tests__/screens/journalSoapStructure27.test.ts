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

  it('contract 2 [S2 rebuild]: the gestalt folds into the middle as a framing line — no standalone narrative block', () => {
    expect(STRIPPED).not.toMatch(/eyebrow=["']How today went["']/);
    // The former standalone journalNarrativeBlock is retired; GestaltSummary +
    // the empty-state prompt now render INSIDE the "What was logged" frame as
    // the one framing line (journal-aligned 4→3 fold).
    expect(STRIPPED).not.toMatch(/s\.journalNarrativeBlock\b/);
    expect(STRIPPED).toMatch(/<GestaltSummary\b/);
    expect(STRIPPED).toMatch(/s\.journalNarrativePrompt\b/);
  });

  it('contract 3 [S2 rebuild]: middle "What was logged" — neutral tint + record icon, renders the log rows', () => {
    const s2 = findSoapSectionFrameByEyebrow('What was logged');
    expect(s2).toBeTruthy();
    expect(s2!.tag).toMatch(/tint=["']neutral["']/);
    expect(s2!.tag).toMatch(/icon=["']record["']/);
    expect(STRIPPED).toMatch(/<JournalLoggedRows\b/);
  });

  it('contract 4: Section 1 (Worth flagging) — <TodayNotableMoments wrapInSection />, BEFORE the middle frame', () => {
    const s2 = findSoapSectionFrameByEyebrow('What was logged');
    const notableMount = STRIPPED.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    expect(notableMount![0]).toMatch(/\bwrapInSection\b/);
    const notableIdx = STRIPPED.indexOf(notableMount![0]);
    expect(notableIdx).toBeLessThan(s2!.start);
  });

  it('contract 5 [S2 rebuild]: §4 handoff is a BLUE SoapSectionFrame (handoff icon), not a dusty card', () => {
    // Journal rebuild — §4 moved from the dusty caregiverAccent card to the
    // blue handoff section (§5: blue = handoff/share-out). No dusty card.
    expect(STRIPPED).not.toMatch(/s\.section4DustyCard\b/);
    expect(STRIPPED).toContain('For the next caregiver');
    expect(STRIPPED).toContain('Notes from that day');
    const s4 = findSoapSectionFrameByEyebrow('For the next caregiver');
    expect(s4).toBeTruthy();
    expect(s4!.tag).toMatch(/tint=["']blue["']/);
    expect(s4!.tag).toMatch(/icon=["']handoff["']/);
    // Ordering: handoff frame comes AFTER the middle "What was logged" frame.
    const s2 = findSoapSectionFrameByEyebrow('What was logged');
    expect(s4!.start).toBeGreaterThan(s2!.start);
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
