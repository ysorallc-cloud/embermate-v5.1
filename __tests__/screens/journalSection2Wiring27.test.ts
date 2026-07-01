// ============================================================================
// Phase 27 F4 — Section 2 (Objective) wired into journal.tsx today path.
//
// Section 2 sits directly under Section 1 in the today-populated branch
// and renders six conditional rows of "what was logged today" in a
// neutral-chrome SoapSectionFrame card. The four narrative components
// (Medications / Vitals / Mood-Wellness / Meals) render in bare mode;
// Hydration and Sleep render as inline label/prose pairs because no
// dedicated narrative component exists for them.
//
// Data source: the same `brief` state that journal.tsx already populates
// via `buildCareBrief(selectedDate)` (line 339 pre-27). D5 confirmed
// the single-builder source-of-truth approach over splitting between
// buildShiftReport + lean fetches.
//
// Per the audit, each row is independently gated: a row only renders
// if the corresponding `brief.*` slice has data for that category.
// When `brief` is null (initial load) Section 2 renders no rows; an
// empty Section 2 still mounts so the chrome rhythm stays consistent
// across the four sections (or returns null — F4 chose to mount; see
// contract 7 for the gate).
//
// Pinned contracts:
//   1. journal.tsx contains a SECOND <SoapSectionFrame block after the
//      first one (which is Section 1 per F3b), with eyebrow "What was
//      logged" and tint "neutral".
//   2. Section 2 references the four narrative components by name
//      (MedicationsNarrative, VitalsNarrative, MoodWellnessNarrative,
//      MealsNarrative) inside its body.
//   3. The narratives are imported.
//   4. The narratives are mounted with `bare` prop (no card-in-card).
//   5. Section 2 also references `brief.hydration` and `brief.sleep`
//      (the two inline rows).
//   6. Section 2 renders AFTER Section 1 and BEFORE the legacy
//      NarrativeSnapshot mount (which F7 will retire).
//   7. Section 2 is gated on `brief` being non-null (no blank chrome
//      flash during the initial load before buildCareBrief resolves).
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

describe('Phase 27 F4 — Section 2 (Objective) wired into journal.tsx', () => {
  it('contract 1: a second <SoapSectionFrame has eyebrow "What was logged" and tint "neutral"', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    expect(secondOpen).toBeGreaterThan(-1);
    // Slice from the second opener to the next '>' to capture the tag's attribute span.
    const tagEnd = STRIPPED.indexOf('>', secondOpen);
    const tag = STRIPPED.slice(secondOpen, tagEnd + 1);
    expect(tag).toMatch(/eyebrow=["']What was logged["']/);
    expect(tag).toMatch(/tint=["']neutral["']/);
  });

  // Journal rebuild S2 (journal-aligned) — the middle "What was logged"
  // section renders explicit chronological log rows via JournalLoggedRows,
  // replacing the four per-bucket narrative components.
  it('contract 2: Section 2 body renders the JournalLoggedRows log list', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    expect(secondOpen).toBeGreaterThan(-1);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    expect(secondClose).toBeGreaterThan(secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    expect(body).toMatch(/<JournalLoggedRows/);
    // per-bucket narratives retired from the section
    expect(body).not.toMatch(/<MedicationsNarrative/);
    expect(body).not.toMatch(/<MealsNarrative/);
  });

  it('contract 3: JournalLoggedRows + its builder are imported', () => {
    expect(STRIPPED).toMatch(/import\s*\{[^}]*\bJournalLoggedRows\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/JournalLoggedRows['"]/);
    expect(STRIPPED).toMatch(/import\s*\{[^}]*\bbuildJournalLoggedRows\b[^}]*\}\s*from\s*['"][^'"]*journalLoggedRows['"]/);
  });

  it('contract 4: the log list receives its stamped rows via the rows prop', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    const tag = body.match(/<JournalLoggedRows[\s\S]*?\/?>/);
    expect(tag).toBeTruthy();
    expect(tag![0]).toMatch(/rows=\{loggedRows\}/);
  });

  it('contract 5: Section 2 body references brief.hydration and brief.sleep for the inline rows', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    expect(body).toMatch(/brief[?.]+hydration/);
    expect(body).toMatch(/brief[?.]+sleep/);
  });

  it('contract 6 [UX-3 + F7]: source order is TodayNotableMoments → narrative block → Section 2 (single SoapSectionFrame)', () => {
    // F7 retired Sections 1 + 4's SoapSectionFrame wrappers, so Section
    // 2 is now the SOLE SoapSectionFrame in journal.tsx. Source order:
    //   TodayNotableMoments (S3) → journalNarrativeBlock (S1 prose) →
    //   Section 2 SoapSectionFrame → section4DustyCard (S4 dusty card).
    const section2 = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    const todayNotableMount = STRIPPED.indexOf('<TodayNotableMoments');
    const narrativeBlock = STRIPPED.indexOf('s.journalNarrativeBlock');
    const dustyCard = STRIPPED.indexOf('s.section4DustyCard');
    expect(section2).toBeGreaterThan(-1);
    expect(todayNotableMount).toBeLessThan(narrativeBlock);
    expect(narrativeBlock).toBeLessThan(section2);
    expect(section2).toBeLessThan(dustyCard);
  });

  it('contract 7: Section 2 is gated on brief being non-null', () => {
    // The gating shape is `brief && ... <SoapSectionFrame eyebrow="What was
    // logged"...`. Phase 27 F2 (2026-05-21) wraps the section render in an
    // IIFE that pre-computes per-bucket gates for the hybrid gutter +
    // empty-state — pushing the `brief &&` further from the open tag than
    // the original 200-char window. Window widened to 1500 chars to
    // accommodate the IIFE pre-computation block without losing the
    // intent (Section 2 still requires brief to render).
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    const before = STRIPPED.slice(Math.max(0, secondOpen - 1500), secondOpen);
    expect(before).toMatch(/\bbrief\b[^.]*&&|\bbrief\s*\?/);
  });
});
