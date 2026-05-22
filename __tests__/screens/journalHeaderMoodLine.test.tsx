// ============================================================================
// Phase 5.12.b — Journal header mood line (relocated in Phase 22.1).
//
// The page's emotional anchor — single most important sentence on
// Journal. Resolution priority (unchanged):
//   1. If the day has a handoffTone written by the caregiver → use verbatim.
//   2. Else, if narrativeSummaryBuilder produces a summary → use the summary
//      (factual-only mode, no interpretive language).
//   3. Else (empty day) → "No record from this day." in italic.
//
// Phase 22.1 — the mood line was moved OUT of the header (where it
// was the third line below title/date) and INTO a dedicated
// GestaltSummary block below the new identity strip. The resolution
// pipeline (getHandoffTone → buildDayNarrative → fallback) still
// lives in app/(tabs)/journal.tsx; this test now pins that pipeline
// without asserting the header-block typography (the GestaltSummary
// component owns its own style now).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(
  join(ROOT, 'app/(tabs)/journal.tsx'),
  'utf8',
);

describe('Phase 31 F3 reframe — Journal header mood line (was Phase 5.12.b)', () => {
  // ORIGINAL Phase 5.12.b priority chain:
  //   1. handoffTone (verbatim caregiver-authored)
  //   2. narrativeSummary (factual builder)
  //   3. "No record from this day." (empty fallback)
  //
  // Phase 31 F3 (2026-05-21) retired #1 — HandoffSheet is gone, so
  // no surface writes handoffTone going forward, and the gestalt
  // tone-as-override branch retired alongside. Legacy tone content
  // surfaces in Section 4's notes input via consolidatedNotes, not
  // in the gestalt line. The post-F3 chain is two-tier:
  //   1. narrativeSummary (shape-of-day prose, the canonical voice)
  //   2. "No record from this day." (empty fallback)

  it('Phase 31 F3 — journal.tsx no longer reads getHandoffTone directly for the gestalt line', () => {
    // Reframed from "reads the canonical handoff tone" — the override
    // branch retired. The tone IS still read by utils/consolidatedNotes
    // (for the legacy first-load merge into Section 4 notes), but
    // journal.tsx itself does not import getHandoffTone post-F3.
    expect(journalSrc).not.toMatch(
      /import\s*\{[^}]*\bgetHandoffTone\b[^}]*\}\s*from\s*['"][^'"]*storage\/handoffToneRepo['"]/,
    );
  });

  it('falls back to the shape-of-day narrative when no notes are set', () => {
    // Shape-of-day is now the sole source for the gestalt line. The
    // narrative builder must still be the source of truth.
    expect(journalSrc).toMatch(/buildShapeOfDay\b/);
  });

  it('renders the empty-day fallback string when no events and no narrative', () => {
    expect(journalSrc).toContain('No record from this day.');
  });

  it('the mood line content flows into GestaltSummary (Phase 22.1 relocation)', () => {
    // Phase 22.1 — the headerMood inline style was retired when the
    // mood line moved into GestaltSummary. Pin the new wiring: the
    // resolved moodLine string is passed to <GestaltSummary
    // summary={moodLine} />.
    expect(journalSrc).toMatch(/<GestaltSummary\b[\s\S]{0,200}?summary=\{moodLine\}/);
  });

  it('Phase 31 F3 — moodLine resolution is the two-tier narrative-or-fallback chain (no tone branch)', () => {
    // Reframed from the three-tier "tone → summary → empty" assertion.
    // Post-F3 the chain is: narrativeSummary → "No record from this
    // day." The handoffTone identifier must NOT appear in the
    // moodLine assignment.
    const moodLineBlock = journalSrc.match(
      /const\s+moodLine\s*:[\s\S]{0,400}?;/,
    );
    expect(moodLineBlock).not.toBeNull();
    expect(moodLineBlock![0]).toMatch(/narrativeSummary/);
    expect(moodLineBlock![0]).not.toMatch(/handoffTone/);
  });
});

describe('Phase 22.1 — Phase 11.8 / 12 subtitle deferral resolved', () => {
  // Pre-22.1 a deferral marker sat colocated with the headerMood
  // render warning future maintainers not to patch the surface
  // independently because Phase 12's D2 layout would retire it.
  // Phase 22.1 retired the inline header-mood render outright when
  // the content moved into GestaltSummary; the deferral marker is
  // resolved and removed alongside it.
  it('the legacy <Text style={s.headerMood}> render is gone', () => {
    expect(journalSrc).not.toContain('<Text style={s.headerMood}>{moodLine}</Text>');
  });
});
