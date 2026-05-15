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
//   1. journal.tsx imports JournalSection from components/journal.
//   2. Section 1 (Subjective) — eyebrow "How today went", tint
//      caregiverAccent.
//   3. Section 2 (Objective) — eyebrow "What was logged", tint
//      neutral. Renders AFTER Section 1.
//   4. Section 3 (Assessment) — mounted as
//      <TodayNotableMoments wrapInSection />; TodayNotableMoments
//      owns the JournalSection amber chrome internally and returns
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

function findJournalSectionByEyebrow(eyebrow: string): { start: number; tag: string } | null {
  // Phase 27.X — Section 4's eyebrow turned into a JSX conditional
  // expression. This matcher accepts both string-literal eyebrows
  // (Sections 1-3) and expression-embedded ones (Section 4) by
  // checking the opener tag for the eyebrow substring.
  let cursor = 0;
  while (true) {
    const open = STRIPPED.indexOf('<JournalSection', cursor);
    if (open === -1) return null;
    const tagEnd = STRIPPED.indexOf('>', open);
    if (tagEnd === -1) return null;
    const tag = STRIPPED.slice(open, tagEnd + 1);
    if (tag.includes(eyebrow)) return { start: open, tag };
    cursor = open + 1;
  }
}

describe('Phase 27 F8 — Journal SOAP four-section structure', () => {
  it('contract 1: journal.tsx imports JournalSection from components/journal', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bJournalSection\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/JournalSection['"]/,
    );
  });

  it('contract 2: Section 1 (Subjective) — eyebrow "How today went", tint caregiverAccent', () => {
    const s1 = findJournalSectionByEyebrow('How today went');
    expect(s1).toBeTruthy();
    expect(s1!.tag).toMatch(/tint=["']caregiverAccent["']/);
  });

  it('contract 3: Section 2 (Objective) — eyebrow "What was logged", tint neutral, AFTER Section 1', () => {
    const s1 = findJournalSectionByEyebrow('How today went');
    const s2 = findJournalSectionByEyebrow('What was logged');
    expect(s1 && s2).toBeTruthy();
    expect(s2!.tag).toMatch(/tint=["']neutral["']/);
    expect(s2!.start).toBeGreaterThan(s1!.start);
  });

  it('contract 4: Section 3 (Assessment) — mounted as <TodayNotableMoments wrapInSection />, AFTER Section 2', () => {
    const s2 = findJournalSectionByEyebrow('What was logged');
    expect(s2).toBeTruthy();
    const notableMount = STRIPPED.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    expect(notableMount![0]).toMatch(/\bwrapInSection\b/);
    const notableIdx = STRIPPED.indexOf(notableMount![0]);
    expect(notableIdx).toBeGreaterThan(s2!.start);
  });

  it('contract 5: Section 4 (Plan) — eyebrow conditional today/past, tint caregiverAccent, AFTER Section 3', () => {
    // Phase 27.X — the eyebrow is now a JSX conditional expression
    // surfacing "For the next caregiver" on today and "Notes from
    // that day" on past. Both literals must appear in the opener tag.
    const s4 = findJournalSectionByEyebrow('For the next caregiver');
    expect(s4).toBeTruthy();
    expect(s4!.tag).toMatch(/tint=["']caregiverAccent["']/);
    expect(s4!.tag).toContain('Notes from that day');
    const notableMount = STRIPPED.match(/<TodayNotableMoments[\s\S]*?\/>/);
    expect(notableMount).toBeTruthy();
    const notableIdx = STRIPPED.indexOf(notableMount![0]);
    expect(s4!.start).toBeGreaterThan(notableIdx);
  });

  it('contract 6: lavender bookend rhythm — Sections 1 and 4 are both caregiverAccent', () => {
    const s1 = findJournalSectionByEyebrow('How today went');
    const s4 = findJournalSectionByEyebrow('For the next caregiver');
    expect(s1!.tag).toMatch(/tint=["']caregiverAccent["']/);
    expect(s4!.tag).toMatch(/tint=["']caregiverAccent["']/);
    // Section 2 is neutral; Section 3 is amber (rendered by
    // TodayNotableMoments internally — the chrome lives in the
    // component, not in journal.tsx). Pin the inner-bookend
    // distinction: Sections 2 and 4 are NOT the same tint as each
    // other (4 is lavender, 2 is neutral).
    const s2 = findJournalSectionByEyebrow('What was logged');
    expect(s2!.tag).not.toMatch(/tint=["']caregiverAccent["']/);
  });

  it('contract 7: NarrativeSnapshot mount is gone from the today path', () => {
    // F7 retirement pin. Defends against re-introducing the pre-27
    // recap mount which the SOAP Section 2 (Objective) supersedes.
    expect(STRIPPED).not.toMatch(/<NarrativeSnapshot\b/);
  });
});
