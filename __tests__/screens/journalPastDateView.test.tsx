// ============================================================================
// Phase 5 — Journal page in past-date view.
//
// • Header subtitle becomes static "[Name]'s day · [Day], [Date]".
// • HandoffCard hides (only meaningful for today).
// • JournalNotesCard accepts a readOnly prop (the NON-bare path uses it
//   to switch to a "Notes from this day" placeholder + hide the Save
//   pill, for any non-bare consumer). The bare-mode path used by
//   journal.tsx Section 4 (Phase 27 F6 + Phase 31 F3) STRUCTURALLY
//   IGNORES readOnly: past-day bare-mode notes are editable AND
//   saveable, so caregivers can amend past days when they recall
//   things later. The pinned source-level assertions below are the
//   non-bare contract; the bare-mode override is pinned by
//   journalNotesCardBare27.test.tsx + journalNotesCardPastDaySave31.test.tsx.
// • Pattern link card stays (weekly pattern, not date-specific).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const subtitleSrc = readFileSync(join(ROOT, 'utils/journalSubtitle.ts'), 'utf8');
const notesSrc = readFileSync(join(ROOT, 'components/journal/JournalNotesCard.tsx'), 'utf8');

describe('Past-date subtitle in journalSubtitle.ts', () => {
  it('exports a pastDate option', () => {
    expect(subtitleSrc).toMatch(/pastDate\??:\s*Date/);
  });

  it('returns the static "[Name]\'s day · [Day], [Date]" form when pastDate is set', () => {
    expect(subtitleSrc).toMatch(/day\s*·/);
    expect(subtitleSrc).toMatch(/weekday/);
  });
});

describe('journal.tsx — past-date view wiring', () => {
  it('determines isViewingPast from selectedDate vs today', () => {
    expect(journalSrc).toMatch(/isViewingPast/);
  });

  it('passes pastDate to journalSubtitle when viewing a past day', () => {
    expect(journalSrc).toMatch(/journalSubtitle\([^)]*pastDate/s);
  });

  it('HandoffCard is no longer rendered in Journal (retired in Phase 5.12.g, confirmed in 22.1)', () => {
    // Phase 5.12.g retired the HandoffCard component from Journal —
    // the sticky "Share handoff →" CTA at the bottom of the page is
    // the surviving primary action. The original past-date gating
    // contract becomes moot: nothing to hide.
    expect(journalSrc).not.toMatch(/<HandoffCard\b/);
  });

  it('passes a readOnly flag to JournalNotesCard when viewing a past date', () => {
    expect(journalSrc).toMatch(/<JournalNotesCard[\s\S]{0,500}?readOnly=\{isViewingPast\}/);
  });

  it('Pattern link card is no longer on Journal at all (Phase 5.11 → Insights)', () => {
    // The card moved to /(tabs)/understand.tsx as RecentWindowCard.
    // Journal carries no version of the pattern link, day-scoped or not.
    expect(journalSrc).not.toMatch(/<JournalPatternLink\b/);
    expect(journalSrc).not.toMatch(/<RecentWindowCard\b/);
  });
});

describe('JournalNotesCard — readOnly mode (non-bare path)', () => {
  it('accepts a readOnly prop', () => {
    expect(notesSrc).toMatch(/readOnly\??:\s*boolean/);
  });

  it('uses "Notes from this day" placeholder when readOnly (non-bare branch)', () => {
    // The literal copy lives in the non-bare render branch; bare mode
    // uses the Q-31 placeholder instead (pinned in
    // journalNotesCleanup27_5b.test.tsx).
    expect(notesSrc).toMatch(/Notes from this day/);
  });

  it('non-bare TextInput respects readOnly via editable={!readOnly}', () => {
    // Phase 31 F3 — bare mode dropped this gate (past-day notes are
    // editable in bare). The non-bare branch keeps it for any future
    // non-bare consumer; this pin just asserts the gate still exists
    // in the source (it lives on line ~305 in the non-bare render).
    expect(notesSrc).toMatch(/editable=\{!readOnly\}|editable=\{!\s*readOnly\s*\}/);
  });
});
