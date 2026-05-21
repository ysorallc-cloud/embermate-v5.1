// ============================================================================
// Phase 27.X — Past-day SOAP layout.
//
// Pre-27.X journal.tsx branched on `isViewingPast` and routed past days
// through NarrativeView (prose summary + summary pills + notable
// moments + read-only past notes). Today went through the SOAP four-
// section layout. The visual chasm between today and past day was
// jarring for caregivers reviewing past days as part of normal workflow.
//
// Phase 27.X drops the NarrativeView gate. Both today and past days
// render the SOAP layout. Past-day specific reframes per audit D1-D6:
//
//   • Section 1 (Subjective) — past renders bare GestaltSummary only.
//     The today-only empty-state tap-to-focus prompt is gated to
//     !isViewingPast. Past with no gestalt shows "No record from this
//     day." (the existing GestaltSummary fallback, borrowed from
//     NarrativeView's tuned phrasing).
//
//   • Section 2 (Objective) — works identically today and past.
//     buildCareBrief(selectedDate) already supports past dates.
//
//   • Section 3 (Assessment) — works identically; entire section
//     collapses when no moments fire for that day.
//
//   • Section 4 (Plan) —
//       — eyebrow: "For the next caregiver" on today, "Notes from
//         that day" on past (no forward-handoff voice retroactively).
//       — STILL PENDING sub-block: today only. Drop on past.
//       — NOTES sub-block: today + past (read-only on past).
//       — D3.1 — past-day Section 4 only renders when notes exist
//         for that day. Avoids hollow empty-state chrome on past
//         days with no saved reflection.
//       — readOnly={isViewingPast} on JournalNotesCard.
//
//   • NarrativeView — fully retired to intentional orphan
//     (NarrativeSnapshot pattern from Phase 27 F7).
//
// Pinned contracts:
//   1. journal.tsx no longer routes past-day to <NarrativeView />.
//   2. NarrativeView import is gone from journal.tsx (intentional
//      orphan per audit D4).
//   3. Section 1 empty-state prompt is gated to !isViewingPast.
//   4. Section 4 STILL PENDING sub-block is gated to !isViewingPast.
//   5. Section 4 eyebrow uses a today-vs-past conditional that
//      surfaces "Notes from that day" on past days.
//   6. Section 4 as a whole is gated on past days requiring saved
//      reflection text (D3.1) — no hollow Section 4 chrome.
//   7. JournalNotesCard receives readOnly={isViewingPast} (already
//      wired pre-27.X — preserved as a regression pin).
//   8. The standalone past-only <GestaltSummary> mount above
//      DateTabStrip (Phase 27 F3b kept it for past) retires —
//      past-day gestalt now lives inside Section 1, not above the
//      date picker.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function findSectionBlockByEyebrow(eyebrow: string): { start: number; end: number; body: string } | null {
  // Eyebrows may be string literals OR template expressions; this
  // matcher accepts both as long as the literal text appears inside
  // the opening tag.
  let cursor = 0;
  while (true) {
    const open = STRIPPED.indexOf('<SoapSectionFrame', cursor);
    if (open === -1) return null;
    const tagEnd = STRIPPED.indexOf('>', open);
    if (tagEnd === -1) return null;
    const tag = STRIPPED.slice(open, tagEnd + 1);
    if (tag.includes(eyebrow)) {
      const close = STRIPPED.indexOf('</SoapSectionFrame>', tagEnd);
      if (close === -1) return null;
      return { start: open, end: close, body: STRIPPED.slice(tagEnd + 1, close) };
    }
    cursor = open + 1;
  }
}

describe('Phase 27.X — past-day SOAP layout', () => {
  it('contract 1: journal.tsx does NOT route past-day to <NarrativeView />', () => {
    // Pre-27.X had: {isViewingPast ? <NarrativeView ... /> : (...)}
    // Post-27.X: SOAP renders for both branches; NarrativeView is gone.
    expect(STRIPPED).not.toMatch(/<NarrativeView\b/);
    // Defensive: the isViewingPast ternary pattern that routed to
    // NarrativeView is gone too.
    expect(STRIPPED).not.toMatch(/isViewingPast\s*\?\s*\(\s*\n?\s*<NarrativeView/);
  });

  it('contract 2: NarrativeView import is gone from journal.tsx (intentional orphan)', () => {
    expect(STRIPPED).not.toMatch(
      /import\s*\{\s*NarrativeView\s*\}\s*from\s*['"][^'"]*\/NarrativeView['"]/,
    );
  });

  it('contract 3: Section 1 empty-state tap-to-focus prompt is gated to !isViewingPast', () => {
    // The TouchableOpacity wrapping the "How would you describe today?"
    // prompt must be gated on !isViewingPast OR subjectiveEmpty must
    // itself include the today-only check. Either shape is acceptable.
    // Pin: within the 600 chars around the prompt copy, the condition
    // references isViewingPast (today-only gate).
    const promptIdx = STRIPPED.indexOf('How would you describe today?');
    expect(promptIdx).toBeGreaterThan(-1);
    const around = STRIPPED.slice(
      Math.max(0, promptIdx - 600),
      promptIdx + 200,
    );
    expect(around).toMatch(/!isViewingPast\b|isViewingToday\b/);
  });

  it('contract 4: Section 4 STILL PENDING sub-block is gated to !isViewingPast', () => {
    const section4 = findSectionBlockByEyebrow('For the next caregiver')
      || findSectionBlockByEyebrow('Notes from that day');
    expect(section4).toBeTruthy();
    // The STILL PENDING sub-eyebrow render condition must include
    // !isViewingPast somewhere in the JSX expression (compound with
    // stillPendingCount > 0).
    const stillPendingIdx = section4!.body.indexOf('STILL PENDING');
    expect(stillPendingIdx).toBeGreaterThan(-1);
    // The 400 chars preceding the sub-eyebrow tag include the
    // today-only gate.
    const before = section4!.body.slice(
      Math.max(0, stillPendingIdx - 400),
      stillPendingIdx,
    );
    expect(before).toMatch(/!isViewingPast\b|isViewingToday\b/);
  });

  it('contract 5: Section 4 eyebrow conditionally surfaces "Notes from that day" on past days', () => {
    // The eyebrow value is now a conditional expression rather than a
    // literal string. Both today copy ("For the next caregiver") and
    // past copy ("Notes from that day") must appear in source.
    expect(STRIPPED).toMatch(/['"]For the next caregiver['"]/);
    expect(STRIPPED).toMatch(/['"]Notes from that day['"]/);
    // And the conditional gate flips on isViewingPast.
    const eyebrowConditional = STRIPPED.match(/eyebrow=\{[\s\S]{0,200}isViewingPast[\s\S]{0,200}\}/);
    expect(eyebrowConditional).toBeTruthy();
  });

  it('contract 6: Section 4 as a whole is gated so past days with no notes do NOT render hollow chrome (D3.1)', () => {
    // The Section 4 SoapSectionFrame must be wrapped in a condition that,
    // when isViewingPast, also requires saved reflection text. Today
    // always renders (Section 4's NOTES sub-block is the always-on
    // surface). Acceptable shapes:
    //   (!isViewingPast || (reflection?.text?.trim().length ?? 0) > 0) && <SoapSectionFrame
    //   !isViewingPast || hasNotes — etc.
    //
    // Pin: locate the Section 4 opener and check the 300 chars before
    // it for a gating expression referencing isViewingPast AND a
    // reflection / notes / hasNotes identifier.
    const section4 = findSectionBlockByEyebrow('For the next caregiver')
      || findSectionBlockByEyebrow('Notes from that day');
    expect(section4).toBeTruthy();
    const before = STRIPPED.slice(
      Math.max(0, section4!.start - 300),
      section4!.start,
    );
    // Both isViewingPast and a notes-presence identifier present in
    // the gate scope.
    expect(before).toMatch(/isViewingPast|isViewingToday/);
    expect(before).toMatch(/reflection|hasNotes|notesExist/);
  });

  it('contract 7: JournalNotesCard receives readOnly={isViewingPast} (preserved across 27.X)', () => {
    const section4 = findSectionBlockByEyebrow('For the next caregiver')
      || findSectionBlockByEyebrow('Notes from that day');
    expect(section4).toBeTruthy();
    expect(section4!.body).toMatch(/readOnly=\{\s*isViewingPast\s*\}/);
  });

  it('contract 8: standalone past-only <GestaltSummary above DateTabStrip is retired (Section 1 owns past gestalt too)', () => {
    // Pre-27.X journal.tsx had `{isViewingPast && <GestaltSummary summary={moodLine} />}`
    // above DateTabStrip — Section 1 inside SOAP didn't exist for past.
    // Post-27.X, Section 1 inside the SOAP layout owns gestalt for both
    // paths; the standalone past-only mount becomes redundant chrome.
    expect(STRIPPED).not.toMatch(/isViewingPast\s*&&\s*<GestaltSummary/);
  });
});
