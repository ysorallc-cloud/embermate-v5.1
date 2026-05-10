// ============================================================================
// Phase 5.12.b — Journal header mood line.
//
// The header's third line is the page's emotional anchor — the single most
// important sentence on Journal. Resolution priority:
//   1. If the day has a handoffTone written by the caregiver → use verbatim.
//   2. Else, if narrativeSummaryBuilder produces a summary → use the summary
//      (factual-only mode, no interpretive language).
//   3. Else (empty day) → "No record from this day." in italic.
//
// Source-level audit: the wiring lives in app/(tabs)/journal.tsx and the
// resolution priority must be visible in the source so future devs can
// reason about it without running the screen.
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

  it('the mood line is rendered in italic (serif) at the small header size', () => {
    // The mood line carries the page's emotional weight, so the style block
    // must keep the italic convention used elsewhere for caregiver-voice copy.
    const moodBlock = journalSrc.match(/\bheaderMood:\s*\{([\s\S]*?)\}/);
    expect(moodBlock).toBeTruthy();
    expect(moodBlock![1]).toMatch(/fontStyle:\s*['"]italic['"]/);
    expect(moodBlock![1]).toMatch(/fontFamily:\s*['"]Georgia['"]/);
  });

  it('the resolution priority chain is visible in source (tone → summary → empty)', () => {
    // The chain must be expressed as a single conditional cascade — not
    // three independent renders — so the priority is unambiguous.
    expect(journalSrc).toMatch(
      /(handoffTone|tone)[\s\S]{0,200}narrativeSummary|(handoffTone|tone)[\s\S]{0,400}buildDayNarrative/,
    );
  });
});

describe('Phase 11.8 subtitle bug — Phase 12 deferral marker', () => {
  // The count-based subtitle ("5/5 medications logged. 1 vitals reading
  // recorded...") will be retired entirely by Phase 12's D2 layout. A
  // deferral marker must sit colocated with the render site so a future
  // maintainer can't "fix" the surface independently.
  it('the deferral comment is colocated with the headerMood render', () => {
    const marker = 'Phase 12 retires this subtitle in favor of headline tiles + narrative bridge. Do not patch independently — see Phase 12 spec.';
    expect(journalSrc).toContain(marker);

    const markerIdx = journalSrc.indexOf(marker);
    const renderIdx = journalSrc.indexOf('<Text style={s.headerMood}>{moodLine}</Text>');
    expect(renderIdx).toBeGreaterThan(-1);
    // The marker must precede and sit within ~200 chars of the render line.
    expect(markerIdx).toBeGreaterThan(-1);
    expect(markerIdx).toBeLessThan(renderIdx);
    expect(renderIdx - markerIdx).toBeLessThan(200);
  });
});
