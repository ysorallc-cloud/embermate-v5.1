// ============================================================================
// Phase 27 F3b — Section 1 (Subjective) wired into journal.tsx today path.
//
// Pre-27 journal.tsx rendered the standalone GestaltSummary on line 659,
// directly under JournalIdentityStrip, on BOTH today and past paths.
// Phase 27 keeps that standalone mount for the past-day path (spec says
// past-day path is unchanged) but routes the today path through a new
// SoapSectionFrame container — Section 1 — that wraps GestaltSummary in
// bare mode inside a lavender card.
//
// Phase 27 D7 (audit-confirmed) — Section 1's empty-state must NOT mount
// a second JournalNotesCard alongside Section 4's. F3b ships the empty
// state as a non-interactive prompt; F6 wires the tap-to-focus
// interaction once JournalNotesCard moves into Section 4 with a ref.
//
// Pinned contracts:
//   1. journal.tsx imports SoapSectionFrame from components/journal.
//   2. The first <SoapSectionFrame block in source has eyebrow text
//      "How today went" and tint "caregiverAccent" (Section 1).
//   3. Section 1 contains a <GestaltSummary block passing bare={true}
//      (when summary or notes have content).
//   4. The standalone GestaltSummary at the pre-27 line ~659 position
//      is gated on isViewingPast — today path skips it (avoids
//      double-render with Section 1).
//   5. The Section 1 empty-state prompt copy "How would you describe
//      today?" is rendered in source (used when both summary and
//      notes are absent).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

// Strip comments — the file header / inline migration notes shouldn't
// false-positive against absence pins.
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 27 F3b — Section 1 (Subjective) wired into journal.tsx', () => {
  it('contract 1: imports SoapSectionFrame from components/journal', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bSoapSectionFrame\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/SoapSectionFrame['"]/,
    );
  });

  it('contract 2: first <SoapSectionFrame has eyebrow "How today went" and tint "caregiverAccent"', () => {
    // Locate the first <SoapSectionFrame ... > tag.
    const m = STRIPPED.match(/<SoapSectionFrame[\s\S]*?>/);
    expect(m).toBeTruthy();
    const tag = m![0];
    expect(tag).toMatch(/eyebrow=["']How today went["']/);
    expect(tag).toMatch(/tint=["']caregiverAccent["']/);
  });

  it('contract 3: Section 1 contains <GestaltSummary ... bare={true}', () => {
    // Locate the first <SoapSectionFrame block including its children up
    // to the matching </SoapSectionFrame> close (or self-close — for F3b
    // we expect children, so the open form).
    const start = STRIPPED.indexOf('<SoapSectionFrame');
    expect(start).toBeGreaterThan(-1);
    const end = STRIPPED.indexOf('</SoapSectionFrame>', start);
    expect(end).toBeGreaterThan(start);
    const block = STRIPPED.slice(start, end);
    expect(block).toMatch(/<GestaltSummary[\s\S]*?bare/);
  });

  it('contract 4 (retired Phase 27.X): standalone past-only <GestaltSummary mount above DateTabStrip is gone', () => {
    // Pre-27.X journal.tsx kept a past-only mount above DateTabStrip:
    //   {isViewingPast && <GestaltSummary summary={moodLine} />}
    // Phase 27.X retired it. Past-day gestalt now renders inside
    // Section 1 (Subjective) of the SOAP layout — same path as today.
    // This contract flips from a presence pin to an absence pin
    // defending the retirement direction (the standalone is gone).
    expect(STRIPPED).not.toMatch(/isViewingPast\s*&&\s*<GestaltSummary/);
  });

  it('contract 5: Section 1 empty-state prompt copy "How would you describe today?" exists in source', () => {
    // The exact prompt copy is part of the Section 1 empty-state branch.
    // F3b ships this as non-interactive text; F6 wires the tap-to-focus.
    expect(STRIPPED).toMatch(/How would you describe today\?/);
  });
});
