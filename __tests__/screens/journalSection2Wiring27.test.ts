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
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    expect(secondOpen).toBeGreaterThan(-1);
    // Slice from the second opener to the next '>' to capture the tag's attribute span.
    const tagEnd = STRIPPED.indexOf('>', secondOpen);
    const tag = STRIPPED.slice(secondOpen, tagEnd + 1);
    expect(tag).toMatch(/eyebrow=["']What was logged["']/);
    expect(tag).toMatch(/tint=["']neutral["']/);
  });

  it('contract 2: Section 2 body references all four narrative components', () => {
    // Locate Section 2 (the second <SoapSectionFrame block) by scanning
    // from the second opener to its matching close tag.
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    expect(secondOpen).toBeGreaterThan(-1);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    expect(secondClose).toBeGreaterThan(secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    expect(body).toMatch(/<MedicationsNarrative/);
    expect(body).toMatch(/<VitalsNarrative/);
    expect(body).toMatch(/<MoodWellnessNarrative/);
    expect(body).toMatch(/<MealsNarrative/);
  });

  it('contract 3: the four narrative components are imported', () => {
    for (const name of [
      'MedicationsNarrative',
      'VitalsNarrative',
      'MoodWellnessNarrative',
      'MealsNarrative',
    ]) {
      const re = new RegExp(
        `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*\\/journal\\/${name}['"]`,
      );
      expect(STRIPPED).toMatch(re);
    }
  });

  it('contract 4: each narrative is mounted with bare prop (no card-in-card)', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    for (const name of [
      'MedicationsNarrative',
      'VitalsNarrative',
      'MoodWellnessNarrative',
      'MealsNarrative',
    ]) {
      // Match `<NameNarrative ... bare ... />` — accept `bare`, `bare={true}`,
      // or `bare = true`. The narrative must be followed by `bare` within
      // its props span (up to the next `/>` or `>`).
      const tagRe = new RegExp(`<${name}[\\s\\S]*?\\/?>`);
      const tagMatch = body.match(tagRe);
      expect(tagMatch).toBeTruthy();
      expect(tagMatch![0]).toMatch(/\bbare\b/);
    }
  });

  it('contract 5: Section 2 body references brief.hydration and brief.sleep for the inline rows', () => {
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    const secondClose = STRIPPED.indexOf('</SoapSectionFrame>', secondOpen);
    const body = STRIPPED.slice(secondOpen, secondClose);
    expect(body).toMatch(/brief[?.]+hydration/);
    expect(body).toMatch(/brief[?.]+sleep/);
  });

  it('contract 6 [UX-3 reshuffle]: Section 2 renders AFTER Section 1, AFTER Section 3 (TodayNotableMoments) leads', () => {
    // Pre-UX-3 history: Phase 27 F7 retired NarrativeSnapshot from
    // the today path; the order was S1 → S2 → S3 (TodayNotableMoments)
    // → S4. UX-3 pre-launch moved S3 to the lead position so flags
    // surface without scrolling. The new order is
    //   S3 (TodayNotableMoments) → S1 → S2 → S4
    // Section 2 is now between Section 1 and Section 4; TodayNotable
    // Moments precedes both S1 and S2.
    const section1 = nthIndexOf(STRIPPED, '<SoapSectionFrame', 1);
    const section2 = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    const todayNotableMount = STRIPPED.indexOf('<TodayNotableMoments');
    expect(section1).toBeGreaterThan(-1);
    expect(section2).toBeGreaterThan(section1);
    expect(todayNotableMount).toBeLessThan(section1);
    expect(todayNotableMount).toBeLessThan(section2);
  });

  it('contract 7: Section 2 is gated on brief being non-null', () => {
    // The gating shape is `brief && ... <SoapSectionFrame eyebrow="What was
    // logged"...`. Phase 27 F2 (2026-05-21) wraps the section render in an
    // IIFE that pre-computes per-bucket gates for the hybrid gutter +
    // empty-state — pushing the `brief &&` further from the open tag than
    // the original 200-char window. Window widened to 1500 chars to
    // accommodate the IIFE pre-computation block without losing the
    // intent (Section 2 still requires brief to render).
    const secondOpen = nthIndexOf(STRIPPED, '<SoapSectionFrame', 2);
    const before = STRIPPED.slice(Math.max(0, secondOpen - 1500), secondOpen);
    expect(before).toMatch(/\bbrief\b[^.]*&&|\bbrief\s*\?/);
  });
});
