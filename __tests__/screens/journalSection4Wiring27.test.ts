// ============================================================================
// Phase 27 F6 — Section 4 (Plan) wired into journal.tsx today path.
//
// Section 4 sits at the bottom of the SOAP arc, paired with Section 1
// (Subjective) as the lavender lane bookends. Per audit D3 the chrome
// tint is caregiverAccent; per spec the body contains two sub-blocks
// separated by quieter inner eyebrows:
//   (a) "STILL PENDING" — relocated TodayStillPending content (bare),
//                         gated so the sub-eyebrow does not orphan
//                         when no items are pending.
//   (b) "NOTES" — relocated JournalNotesCard content (bare). Owns the
//                 textarea and the Save pill. Receives a forwardRef so
//                 Section 1's empty-state prompt can focus it.
//
// D7 cross-section interaction: Section 1's empty-state prompt
// ("How would you describe today?") becomes a TouchableOpacity that
// calls the ref's focus() — single JournalNotesCard mount, two surface
// tap targets.
//
// Pinned contracts:
//   1. journal.tsx imports useRef + uses a notesCardRef (or similar
//      identifier carrying a focus-able imperative handle).
//   2. A <SoapSectionFrame has eyebrow "For the next caregiver" and
//      tint "caregiverAccent" — this is Section 4.
//   3. Section 4 body contains <TodayStillPending bare ... /> and
//      <JournalNotesCard bare ... />.
//   4. JournalNotesCard is mounted with the focus-ref passed in.
//   5. Section 4 body references a "STILL PENDING" sub-eyebrow string
//      (the sub-block label).
//   6. Section 4 body references a "NOTES" sub-eyebrow string.
//   7. Section 1's empty-state prompt is a TouchableOpacity that
//      handles a press → invokes the focus ref. The handler body
//      references the same notes-ref identifier as contract 1.
//   8. Section 4 renders AFTER Section 3 (wrapInSection
//      TodayNotableMoments) in source order.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function nthIndexOf(haystack: string, needle: string, n: number): number {
  let idx = -1;
  for (let i = 0; i < n; i += 1) {
    idx = haystack.indexOf(needle, idx + 1);
    if (idx === -1) return -1;
  }
  return idx;
}

function findSection4Body(): { start: number; body: string } | null {
  // F7: Section 4 lives inside a section4DustyCard <View>, not a
  // SoapSectionFrame. Scan from the style ref forward ~4000 chars to
  // capture the full body — Section 4 is the last block in the SOAP
  // IIFE so a generous window is safe.
  const start = STRIPPED.indexOf('s.section4DustyCard');
  if (start === -1) return null;
  return { start, body: STRIPPED.slice(start, start + 4000) };
}

describe('Section 4 (Plan) wired into journal.tsx — F7 reshape', () => {
  it('contract 1: a notes-input ref identifier exists in the component body', () => {
    expect(STRIPPED).toMatch(/\b(?:notesCardRef|notesRef|notesInputRef)\b/);
    expect(STRIPPED).toMatch(/useRef[^(]*\(/);
  });

  it('contract 2 [F7]: Section 4 renders as a dusty-bordered card with the conditional eyebrow', () => {
    // F7: SoapSectionFrame + caregiverAccent retired. The dusty card
    // owns the chrome; the conditional eyebrow literals live in JSX
    // directly via section4DustyEyebrow.
    expect(STRIPPED).toMatch(/s\.section4DustyCard\b/);
    expect(STRIPPED).toMatch(/s\.section4DustyEyebrow\b/);
    expect(STRIPPED).toContain('For the next caregiver');
    expect(STRIPPED).toContain('Notes from that day');
  });

  it('contract 3 [device-walk fix 2026-06-13]: Section 4 body contains <JournalNotesCard bare ... and NOT <TodayStillPending', () => {
    // Device-walk fix retired the pending-task list from Section 4
    // (the section is the caregiver's free-text handoff note, not a
    // task tracker). The JournalNotesCard free-text input stays;
    // TodayStillPending is gone from this surface.
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    expect(section4!.body).toMatch(/<JournalNotesCard[^>]*\bbare\b/);
    expect(section4!.body).not.toMatch(/<TodayStillPending\b/);
  });

  it('contract 4 [F7]: JournalNotesCard inside the dusty card is passed the focus-ref', () => {
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    const notesTagMatch = section4!.body.match(/<JournalNotesCard[\s\S]*?\/>/);
    expect(notesTagMatch).toBeTruthy();
    expect(notesTagMatch![0]).toMatch(/\b(?:inputRef|ref)=\{(?:notesCardRef|notesRef|notesInputRef)\}/);
  });

  it('contract 5 [device-walk fix 2026-06-13]: Section 4 dusty-card JSX does NOT render a STILL PENDING sub-eyebrow Text element', () => {
    // Pre-fix Section 4 carried a STILL PENDING sub-eyebrow + the
    // TodayStillPending list. The 2026-06-13 device walk retired
    // both — Section 4 is the caregiver's free-text handoff note,
    // not a task tracker. The Text node carrying the STILL PENDING
    // label must NOT render. (We intentionally pin the JSX shape
    // here, not the bare lowercase "still pending" string — the
    // surrounding gestalt-narrative builder code legitimately
    // reuses the phrase in its own pending-medication / pending-
    // wellness summary lines.)
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    expect(section4!.body).not.toMatch(/>\s*STILL PENDING\s*</);
    // Defense-in-depth: section4SubEyebrow style ref also retires
    // (the STILL PENDING Text was the sole consumer).
    expect(section4!.body).not.toMatch(/section4SubEyebrow\b/);
  });

  it('contract 6 (retired Phase 27.5b F5): Section 4 does NOT render an inner "NOTES" sub-eyebrow', () => {
    // Phase 27.5b F5 retired the inner "NOTES" sub-eyebrow. The notes
    // block's TextInput now carries visible input chrome (rgba bg +
    // border + radius) and a placeholder-as-prompt statement, making
    // the writing affordance discoverable without a separate label.
    // STILL PENDING (contract 5 above) stays — it labels a distinct
    // list, not chrome around an input. This contract flips to an
    // absence pin defending the F5 direction.
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    // The pre-F5 form was <Text>NOTES</Text> inside Section 4's body;
    // post-F5 it's gone.
    expect(section4!.body).not.toMatch(/>\s*NOTES\s*</);
  });

  it('contract 7: Section 1 empty-state prompt is a TouchableOpacity that invokes the notes-card focus ref', () => {
    // Locate the empty-state prompt copy and check the 600 chars around
    // it for TouchableOpacity + .focus() invocation against the ref.
    const promptIdx = STRIPPED.indexOf('How would you describe today?');
    expect(promptIdx).toBeGreaterThan(-1);
    const around = STRIPPED.slice(
      Math.max(0, promptIdx - 400),
      Math.min(STRIPPED.length, promptIdx + 400),
    );
    expect(around).toMatch(/<TouchableOpacity/);
    expect(around).toMatch(/(?:notesCardRef|notesRef|notesInputRef)\??\.current\??\.focus\(\)/);
  });

  it('contract 8: Section 4 (Plan) renders AFTER Section 3 (Assessment) in source order', () => {
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    // Section 3 is the TodayNotableMoments wrapInSection mount.
    const notableMount = STRIPPED.indexOf('<TodayNotableMoments');
    expect(notableMount).toBeGreaterThan(-1);
    expect(section4!.start).toBeGreaterThan(notableMount);
  });
});
