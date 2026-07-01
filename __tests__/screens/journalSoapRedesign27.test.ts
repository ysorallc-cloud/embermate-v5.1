// ============================================================================
// Phase 27 F8 — Journal SOAP redesign structural contract.
//
// CANONICAL "what shape did Phase 27 ship" document for downstream
// consumers (Phase 31 — Notes consolidation; Phase 32B — symptom
// render). Phase 31 plugs content into Section 4 (Plan); Phase 32B
// plugs content into Section 3 (Assessment). Both phases land
// CONTENT changes, not structural changes. This contract pins the
// structural invariants so neither phase re-litigates the chrome or
// the placement.
//
// Why a single canonical file (rather than re-asserting in
// per-phase tests): a downstream caregiver reading
// `__tests__/screens/` looking for "what can Phase 31 rely on?"
// sees ONE entry point here. The per-F tests
// (journalSection1Wiring27 / journalSection2Wiring27 / Section4 /
// Structure / Past-Day / Merged-footer / Pending-dedup) remain as
// granular guards for the individual aspects; this file ties them
// together at the integration-point layer.
//
// COVERED INVARIANTS
//
//   1. Four SOAP sections in source order (S1 Subjective →
//      S2 Objective → S3 Assessment → S4 Plan).
//   2. Eyebrow text + tint role per section.
//   3. Chrome primitive: all 4 sections wrap in `SoapSectionFrame`
//      (the Phase 27 SOAP-only chrome), NOT the original
//      `JournalSection` primitive. The JournalSection primitive
//      remains for Insights and other non-SOAP consumers (Q-27.6
//      scope decision).
//   4. Pending dedup: pending content surfaces in Section 4's
//      STILL PENDING list ONLY. The three narratives in Section 2
//      receive `loggedOnly` to suppress pending-status rows.
//   5. Section 3 mount point — `<TodayNotableMoments wrapInSection />`
//      (Phase 32B integration target — day-bound symptom render
//      plugs in here).
//   6. Section 4 mount point — `<JournalNotesCard ... bare ... />`
//      inside the SoapSectionFrame, with a focus-ref passed in
//      (Phase 31 integration target — consolidated Notes input
//      plugs in here).
//   7. Merged footer — single "For the record" eyebrow at page
//      bottom, gating + inline disclaimer per Q-27.3 lock.
//
// If a Phase 31 / 32B work item needs a NEW structural invariant
// beyond these seven, add a contract here at the time of that
// phase's audit — don't quietly add it elsewhere.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const todayNotableSrc = readFileSync(
  join(ROOT, 'components/journal/TodayNotableMoments.tsx'),
  'utf8',
);

// Strip line + block comments so commit-narrative mentions don't
// false-positive against structural assertions.
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const journalStripped = strip(journalSrc);
const todayNotableStripped = strip(todayNotableSrc);

// Find each SoapSectionFrame opening tag in source order. Returns an
// array of { start, tag } in the order they appear in the file. The
// SOAP sections are the first N matches in journal.tsx (S1, S2, S4 —
// S3 is mounted via TodayNotableMoments and isn't a direct
// SoapSectionFrame in journal.tsx).
function findAllSoapFrames(src: string): Array<{ start: number; tag: string }> {
  const out: Array<{ start: number; tag: string }> = [];
  let cursor = 0;
  while (true) {
    const open = src.indexOf('<SoapSectionFrame', cursor);
    if (open === -1) break;
    const close = src.indexOf('>', open);
    if (close === -1) break;
    out.push({ start: open, tag: src.slice(open, close + 1) });
    cursor = open + 1;
  }
  return out;
}

describe('F7 reshape — Journal structural contract (was Phase 27 F8 SOAP redesign)', () => {
  // F7 (2026-06-12) reshaped the Phase 27 four-SOAP-section structure:
  //   • Section 1 ("How today went") — SoapSectionFrame + caregiverAccent
  //     RETIRED. Renders as flat italic-serif narrative prose.
  //   • Section 4 ("For the next caregiver") — SoapSectionFrame +
  //     caregiverAccent RETIRED. Renders as a fully bordered dusty card.
  //   • Section 2 ("What was logged") — UNCHANGED (SoapSectionFrame
  //     neutral).
  //   • Section 3 (TodayNotableMoments wrapInSection) — UNCHANGED
  //     (amber chrome rendered internally).
  //
  // The lavender bookend rhythm is intentionally retired with F7.

  // --------------------------------------------------------------------------
  // INVARIANT 1 — Surviving SOAP frame + section order
  // --------------------------------------------------------------------------

  it('invariant 1 [F7]: journal.tsx renders exactly 1 SoapSectionFrame open directly (S2); S3 mounts via TodayNotableMoments', () => {
    // Pre-F7: 3 direct frames (S1, S2, S4) + 1 inside TodayNotableMoments.
    // F7:   only S2 stays in journal.tsx. S3 still via TodayNotableMoments.
    const frames = findAllSoapFrames(journalStripped);
    expect(frames.length).toBe(1);
    expect(frames[0].tag).toMatch(/eyebrow=["']What was logged["']/);
    expect(todayNotableStripped).toMatch(/<SoapSectionFrame\b[\s\S]{0,200}?tint=["']amber["']/);
  });

  it('invariant 1 [F7]: Section 1 narrative block + Section 4 dusty card surfaces are anchored on dedicated style refs', () => {
    expect(journalStripped).toMatch(/s\.journalNarrativeBlock\b/);
    expect(journalStripped).toMatch(/s\.journalNarrativePrompt\b/);
    expect(journalStripped).toMatch(/s\.section4DustyCard\b/);
    expect(journalStripped).toMatch(/s\.section4DustyEyebrow\b/);
  });

  it('invariant 1 [UX-3 + F7]: source order is S3 (TodayNotableMoments) → S1 (narrative block) → S2 (What was logged) → S4 (dusty card)', () => {
    const notableMount = journalStripped.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    expect(notableMount![0]).toMatch(/\bwrapInSection\b/);
    const notableIdx = journalStripped.indexOf(notableMount![0]);
    const narrativeIdx = journalStripped.indexOf('s.journalNarrativeBlock');
    const s2 = findAllSoapFrames(journalStripped)[0].start;
    const s4Idx = journalStripped.indexOf('s.section4DustyCard');
    expect(notableIdx).toBeLessThan(narrativeIdx);
    expect(narrativeIdx).toBeLessThan(s2);
    expect(s2).toBeLessThan(s4Idx);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 2 — F7 retire: lavender bookends RETIRED
  // --------------------------------------------------------------------------

  it('invariant 2 [F7]: lavender bookend rhythm RETIRED — no caregiverAccent tint anywhere in journal.tsx', () => {
    expect(journalStripped).not.toMatch(/tint=["']caregiverAccent["']/);
  });

  it('invariant 2 [F7]: S2 uses the neutral tint (unchanged)', () => {
    const frames = findAllSoapFrames(journalStripped);
    expect(frames[0].tag).toMatch(/tint=["']neutral["']/);
  });

  it('invariant 2: S3 uses the amber tint (rendered inside TodayNotableMoments)', () => {
    expect(todayNotableStripped).toMatch(
      /<SoapSectionFrame\b[\s\S]{0,200}?tint=["']amber["'][\s\S]{0,200}?eyebrow=["']Worth flagging["']|<SoapSectionFrame\b[\s\S]{0,200}?eyebrow=["']Worth flagging["'][\s\S]{0,200}?tint=["']amber["']/,
    );
  });

  it('invariant 2 [F7]: S4 eyebrow literals stay verbatim in the dusty-card JSX', () => {
    expect(journalStripped).toContain('For the next caregiver');
    expect(journalStripped).toContain('Notes from that day');
  });

  // --------------------------------------------------------------------------
  // INVARIANT 3 — Chrome primitive: SoapSectionFrame, NOT JournalSection
  // --------------------------------------------------------------------------

  it('invariant 3: journal.tsx imports SoapSectionFrame (canonical Phase 27 SOAP chrome)', () => {
    expect(journalStripped).toMatch(
      /import\s*\{[^}]*\bSoapSectionFrame\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/SoapSectionFrame['"]/,
    );
  });

  it('invariant 3: no SOAP-site renders use the JournalSection primitive directly in journal.tsx', () => {
    // JournalSection is still imported by journal.tsx for non-SOAP
    // surfaces (e.g., GestaltSummary's standalone non-bare consumers),
    // but the four SOAP sections themselves must consume
    // SoapSectionFrame. If a future contributor adds a
    // <JournalSection eyebrow="..." ...> with one of the four SOAP
    // eyebrow strings at the SOAP-site layer, that's a regression.
    const journalSectionTags = journalStripped.match(/<JournalSection\b[^>]*>/g) || [];
    const soapEyebrows = [
      'How today went',
      'What was logged',
      'Worth flagging',
      'For the next caregiver',
      'Notes from that day',
    ];
    for (const tag of journalSectionTags) {
      for (const eyebrow of soapEyebrows) {
        expect(tag).not.toContain(eyebrow);
      }
    }
  });

  it('invariant 3: TodayNotableMoments wrapInSection branch uses SoapSectionFrame (not the legacy JournalSection)', () => {
    expect(todayNotableStripped).toMatch(/<SoapSectionFrame\b/);
    expect(todayNotableStripped).not.toMatch(/<JournalSection\b/);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 4 — Pending dedup
  // --------------------------------------------------------------------------

  it('invariant 4: Section 2 renders the JournalLoggedRows log list (S2 rebuild; narratives retired)', () => {
    // Journal rebuild S2 — the per-bucket loggedOnly narratives are replaced by
    // explicit chronological log rows (JournalLoggedRows), status stamped once
    // via getCareItemStatus. Missed/pending items surface as coral/gold rows.
    expect(journalStripped).toMatch(/<JournalLoggedRows/);
    expect(journalStripped).not.toMatch(/<MedicationsNarrative[\s\S]{0,200}loggedOnly/);
  });

  it('invariant 4 [device-walk fix 2026-06-13]: Section 4 dusty card retires STILL PENDING + TodayStillPending', () => {
    // Pre-fix Section 4 carried a STILL PENDING sub-eyebrow + the
    // TodayStillPending list. The 2026-06-13 device walk retired
    // both — Section 4 is the caregiver's free-text handoff note
    // ("Anything to pass along?"), not a task tracker.
    const s4Open = journalStripped.indexOf('s.section4DustyCard');
    expect(s4Open).toBeGreaterThan(-1);
    const s4Body = journalStripped.slice(s4Open, s4Open + 4000);
    expect(s4Body).not.toMatch(/<TodayStillPending\b/);
    expect(s4Body).not.toMatch(/STILL PENDING/);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 5 — Section 3 mount point (Phase 32B target)
  // --------------------------------------------------------------------------

  it('invariant 5 (Phase 32B target): Section 3 mounts as <TodayNotableMoments wrapInSection />', () => {
    // Phase 32B will add day-bound symptom render to this surface.
    // The mount shape is the integration point — pin it so 32B can
    // rely on the wrapInSection chrome wrapping the new symptom rows
    // alongside the existing notable moments.
    expect(journalStripped).toMatch(/<TodayNotableMoments[\s\S]{0,200}\bwrapInSection\b/);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 6 — Section 4 mount point (Phase 31 target)
  // --------------------------------------------------------------------------

  it('invariant 6 [F7]: Section 4 dusty card contains <JournalNotesCard ... bare ... /> with the focus-ref wired in', () => {
    // F7: SoapSectionFrame retired; dusty card now wraps the
    // JournalNotesCard mount. The bare + inputRef wiring stays.
    const s4Open = journalStripped.indexOf('s.section4DustyCard');
    expect(s4Open).toBeGreaterThan(-1);
    const s4Body = journalStripped.slice(s4Open, s4Open + 4000);
    expect(s4Body).toMatch(/<JournalNotesCard\b[\s\S]{0,400}bare/);
    expect(s4Body).toMatch(/inputRef=\{[^}]+\}/);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 7 — Merged footer
  // --------------------------------------------------------------------------

  it('invariant 7: merged footer renders one "For the record" eyebrow + inline JournalDisclaimer at page bottom', () => {
    // Page-level closing structure per Q-27.3 single-eyebrow-block
    // lock. Detailed merged-footer pins live in
    // journalMergedFooter27.test.ts; this assertion is the
    // top-level acknowledgement that the merged-footer shape is
    // part of the canonical Phase 27 contract.
    const eyebrows =
      journalStripped.match(
        /<SectionEyebrow\b[\s\S]{0,200}?text=["']For the record["']/g,
      ) || [];
    expect(eyebrows.length).toBe(1);
    expect(journalStripped).toMatch(/<JournalDisclaimer[\s\S]{0,400}inline/);
  });
});
