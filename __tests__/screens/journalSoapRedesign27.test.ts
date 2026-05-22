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

describe('Phase 27 F8 — Journal SOAP redesign structural contract (downstream pin for Phase 31 + Phase 32B)', () => {
  // --------------------------------------------------------------------------
  // INVARIANT 1 — Four SOAP sections in source order
  // --------------------------------------------------------------------------

  it('invariant 1: journal.tsx renders exactly 3 SoapSectionFrame opens directly (S1, S2, S4); S3 mounts via TodayNotableMoments', () => {
    // S3 (Assessment) is the only section whose chrome lives inside a
    // child component (TodayNotableMoments owns the SoapSectionFrame
    // wrap when wrapInSection is true). Pin the three-in-journal +
    // one-in-child shape so a future contributor doesn't accidentally
    // duplicate S3's chrome at the journal.tsx level.
    const frames = findAllSoapFrames(journalStripped);
    expect(frames.length).toBe(3);
    expect(todayNotableStripped).toMatch(/<SoapSectionFrame\b[\s\S]{0,200}?tint=["']amber["']/);
  });

  it('invariant 1: the 3 direct journal.tsx SOAP sections appear in order S1 ("How today went") → S2 ("What was logged") → S4 ("For the next caregiver")', () => {
    const frames = findAllSoapFrames(journalStripped);
    expect(frames.length).toBe(3);
    expect(frames[0].tag).toMatch(/eyebrow=["']How today went["']/);
    expect(frames[1].tag).toMatch(/eyebrow=["']What was logged["']/);
    // S4's eyebrow is a conditional expression; the today literal is
    // included in the opener tag.
    expect(frames[2].tag).toContain('For the next caregiver');
  });

  it('invariant 1: S3 (TodayNotableMoments wrapInSection) renders AFTER S2 and BEFORE S4 in source order', () => {
    const frames = findAllSoapFrames(journalStripped);
    const s2Start = frames[1].start;
    const s4Start = frames[2].start;
    const notableMount = journalStripped.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    expect(notableMount![0]).toMatch(/\bwrapInSection\b/);
    const notableIdx = journalStripped.indexOf(notableMount![0]);
    expect(notableIdx).toBeGreaterThan(s2Start);
    expect(notableIdx).toBeLessThan(s4Start);
  });

  // --------------------------------------------------------------------------
  // INVARIANT 2 — Eyebrow text + tint role per section
  // --------------------------------------------------------------------------

  it('invariant 2: S1 + S4 share the caregiverAccent tint (lavender lane bookends)', () => {
    const frames = findAllSoapFrames(journalStripped);
    expect(frames[0].tag).toMatch(/tint=["']caregiverAccent["']/);
    expect(frames[2].tag).toMatch(/tint=["']caregiverAccent["']/);
  });

  it('invariant 2: S2 uses the neutral tint (textTertiary rule)', () => {
    const frames = findAllSoapFrames(journalStripped);
    expect(frames[1].tag).toMatch(/tint=["']neutral["']/);
  });

  it('invariant 2: S3 uses the amber tint (rendered inside TodayNotableMoments)', () => {
    expect(todayNotableStripped).toMatch(
      /<SoapSectionFrame\b[\s\S]{0,200}?tint=["']amber["'][\s\S]{0,200}?eyebrow=["']Worth flagging["']|<SoapSectionFrame\b[\s\S]{0,200}?eyebrow=["']Worth flagging["'][\s\S]{0,200}?tint=["']amber["']/,
    );
  });

  it('invariant 2: S4 eyebrow is conditional — "For the next caregiver" today, "Notes from that day" past', () => {
    const frames = findAllSoapFrames(journalStripped);
    expect(frames[2].tag).toContain('For the next caregiver');
    expect(frames[2].tag).toContain('Notes from that day');
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

  it('invariant 4: Section 2 passes `loggedOnly` to all 3 pending-surfacing narratives', () => {
    expect(journalStripped).toMatch(/<MedicationsNarrative[\s\S]{0,200}loggedOnly/);
    expect(journalStripped).toMatch(/<VitalsNarrative[\s\S]{0,200}loggedOnly/);
    expect(journalStripped).toMatch(/<MealsNarrative[\s\S]{0,200}loggedOnly/);
  });

  it('invariant 4: Section 4 STILL PENDING sub-block still renders (pending content surfaces here, not in Section 2)', () => {
    // The "Still pending" sub-eyebrow + TodayStillPending mount must
    // remain — the dedup direction is "S2 drops pending"; S4 stays
    // the canonical pending surface.
    const frames = findAllSoapFrames(journalStripped);
    const s4Open = frames[2].start;
    const s4Close = journalStripped.indexOf('</SoapSectionFrame>', s4Open);
    expect(s4Close).toBeGreaterThan(s4Open);
    const s4Body = journalStripped.slice(s4Open, s4Close);
    expect(s4Body).toMatch(/<TodayStillPending\b/);
    expect(s4Body).toMatch(/STILL PENDING/);
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

  it('invariant 6 (Phase 31 target): Section 4 contains <JournalNotesCard ... bare ... /> with the focus-ref wired in', () => {
    // Phase 31 will consolidate Notes input into this mount. The
    // bare prop signals the card is nested inside SoapSectionFrame
    // chrome (no duplicate card outline); the ref is shared with
    // Section 1's empty-state tap-to-focus prompt (D7 — single
    // input, two tap targets).
    const frames = findAllSoapFrames(journalStripped);
    const s4Open = frames[2].start;
    const s4Close = journalStripped.indexOf('</SoapSectionFrame>', s4Open);
    const s4Body = journalStripped.slice(s4Open, s4Close);
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
