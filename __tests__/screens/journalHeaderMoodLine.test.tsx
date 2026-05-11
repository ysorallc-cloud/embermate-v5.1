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

describe('Phase 5.12.b — Journal header mood line', () => {
  it('reads the canonical handoff tone for the selected date', () => {
    // The mood-line resolution must consume getHandoffTone(selectedDate)
    // — same source the HandoffSheet writes to. Otherwise the caregiver's
    // authored tone wouldn't surface on the Journal header.
    expect(journalSrc).toMatch(/getHandoffTone\b/);
  });

  it('falls back to the narrative builder summary when no tone is set', () => {
    // narrativeSummaryBuilder is the second priority — facts only, no
    // interpretive language.
    expect(journalSrc).toMatch(/buildDayNarrative\b/);
  });

  it('renders the empty-day fallback string when no events and no tone', () => {
    expect(journalSrc).toContain('No record from this day.');
  });

  it('the mood line content flows into GestaltSummary (Phase 22.1 relocation)', () => {
    // Phase 22.1 — the headerMood inline style was retired when the
    // mood line moved into GestaltSummary. Pin the new wiring: the
    // resolved moodLine string is passed to <GestaltSummary
    // summary={moodLine} />.
    expect(journalSrc).toMatch(/<GestaltSummary\b[\s\S]{0,200}?summary=\{moodLine\}/);
  });

  it('the resolution priority chain is visible in source (tone → summary → empty)', () => {
    // The chain must be expressed as a single conditional cascade — not
    // three independent renders — so the priority is unambiguous.
    expect(journalSrc).toMatch(
      /(handoffTone|tone)[\s\S]{0,200}narrativeSummary|(handoffTone|tone)[\s\S]{0,400}buildDayNarrative/,
    );
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
