// ============================================================================
// Phase 5 — Journal page in past-date view.
//
// • Header subtitle becomes static "[Name]'s day · [Day], [Date]".
// • HandoffCard hides (only meaningful for today).
// • JournalNotesCard switches to read-only with the "Notes from this day"
//   placeholder.
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

describe('JournalNotesCard — readOnly mode', () => {
  it('accepts a readOnly prop', () => {
    expect(notesSrc).toMatch(/readOnly\??:\s*boolean/);
  });

  it('uses "Notes from this day" placeholder when readOnly', () => {
    expect(notesSrc).toMatch(/Notes from this day/);
  });

  it('disables the TextInput / hides the Save pill when readOnly', () => {
    expect(notesSrc).toMatch(/editable=\{!readOnly\}|editable=\{!\s*readOnly\s*\}/);
  });
});
