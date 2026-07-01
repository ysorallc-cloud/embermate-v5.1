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

function findSection4Body(): { start: number; body: string } | null {
  // Journal rebuild S2 — §4 is the blue handoff SoapSectionFrame, anchored on
  // its eyebrow string (the retired dusty card is gone). §4 is the last block
  // in the SOAP IIFE so over-slicing forward is safe.
  const start = STRIPPED.indexOf('For the next caregiver');
  if (start === -1) return null;
  return { start, body: STRIPPED.slice(start, start + 4000) };
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

  it('contract 4 [device-walk fix 2026-06-13]: Section 4 STILL PENDING sub-block + TodayStillPending retired entirely', () => {
    // Pre-fix the !isViewingPast gate hid STILL PENDING on past days
    // while showing it on today. The 2026-06-13 device walk retired
    // the sub-block + the list on BOTH today and past — Section 4
    // is the caregiver's free-text handoff note, not a task tracker.
    // The gate question becomes moot: STILL PENDING simply doesn't
    // render anywhere in Section 4.
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    expect(section4!.body).not.toMatch(/STILL PENDING/);
    expect(section4!.body).not.toMatch(/<TodayStillPending\b/);
  });

  it('contract 5 [F7]: Section 4 eyebrow conditionally surfaces "Notes from that day" on past days (inside dusty card)', () => {
    // F7: the eyebrow is no longer a JSX attribute on SoapSectionFrame.
    // It's a JSX expression inside the dusty-card <Text> element.
    expect(STRIPPED).toMatch(/['"]For the next caregiver['"]/);
    expect(STRIPPED).toMatch(/['"]Notes from that day['"]/);
    // Conditional gate flips on isViewingPast — appears in the JSX
    // expression rendering the eyebrow text.
    const section4 = findSection4Body();
    expect(section4!.body).toMatch(/isViewingPast/);
  });

  it('contract 6 (Phase 31 F2 reframe): Section 4 ALWAYS renders on past days — D3.1 hollow-chrome avoidance retired so legacy/migrated notes never become unreachable', () => {
    // ORIGINAL D3.1 LOCK (Phase 27.X): past days with no saved
    // reflection skipped Section 4 entirely to avoid hollow chrome.
    // That meant the Section 4 SoapSectionFrame was wrapped in a
    // `(!isViewingPast || hasNotes) && (...)` gate.
    //
    // PHASE 31 F2 REFRAME (2026-05-21): the consolidated notes path
    // merges legacy handoffTone into the displayed value. The user
    // MUST be able to see migrated/legacy content on the day it
    // belongs to — hiding Section 4 when empty means migrated content
    // is data-preserved-but-unreachable on past days, and the
    // caregiver perceives it as notes loss. Phase 31's visibility
    // priority overrides D3.1's hollow-chrome avoidance. JournalNotesCard's
    // readOnly placeholder ("Notes from this day") covers the truly-
    // empty case without needing additional empty-state copy at this
    // layer.
    //
    // Post-reframe pin: the Section 4 SoapSectionFrame is NOT wrapped
    // in the `!isViewingPast || hasNotes` gate. The 200 chars before
    // its open tag do NOT contain a gating expression that conditions
    // its render on isViewingPast.
    const section4 = findSection4Body();
    expect(section4).toBeTruthy();
    const before = STRIPPED.slice(
      Math.max(0, section4!.start - 200),
      section4!.start,
    );
    expect(before).not.toMatch(/\(!isViewingPast\s*\|\|\s*hasNotes\)\s*&&\s*$/);
    expect(before).not.toMatch(/!isViewingPast\s*\|\|\s*hasNotes\s*\)?\s*&&\s*\(?\s*$/);
  });

  it('contract 7 [F7]: JournalNotesCard receives readOnly={isViewingPast} (preserved across 27.X and F7)', () => {
    const section4 = findSection4Body();
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
