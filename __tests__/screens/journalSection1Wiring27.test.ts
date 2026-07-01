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

describe('Section 1 (Subjective) wired into journal.tsx — F7 reshape', () => {
  // F7 (2026-06-12) retired Section 1's SoapSectionFrame +
  // caregiverAccent eyebrow. The gestalt now renders as flat
  // italic-serif narrative prose. Contracts 1+2 below pin the new
  // narrative-block shape; contract 3 still requires the
  // GestaltSummary mount to live inside the new wrapper.
  it('contract 1 [S2 rebuild]: the gestalt framing line folds into the middle frame — no standalone narrative block', () => {
    // Journal rebuild 4→3 fold — the standalone journalNarrativeBlock is
    // retired; the gestalt + empty-state prompt render inside the "What was
    // logged" frame as the one framing line.
    expect(STRIPPED).not.toMatch(/s\.journalNarrativeBlock\b/);
    expect(STRIPPED).toMatch(/s\.journalNarrativePrompt\b/);
    expect(STRIPPED).toMatch(/<GestaltSummary\b/);
  });

  it('contract 2 [F7]: "How today went" eyebrow + caregiverAccent tint are RETIRED on Section 1', () => {
    expect(STRIPPED).not.toMatch(/eyebrow=["']How today went["']/);
    expect(STRIPPED).not.toMatch(/<SoapSectionFrame\b[\s\S]{0,200}?tint=["']caregiverAccent["'][\s\S]{0,200}?eyebrow=["']How today went["']/);
  });

  it('contract 3 [S2 rebuild]: GestaltSummary mounts inside the "What was logged" frame as the framing line (bare)', () => {
    const start = STRIPPED.indexOf('eyebrow="What was logged"');
    expect(start).toBeGreaterThan(-1);
    // The gestalt framing line lives just inside the middle frame, above the
    // JournalLoggedRows log list.
    const block = STRIPPED.slice(start, start + 1600);
    expect(block).toMatch(/<GestaltSummary[\s\S]*?bare/);
    expect(block).toMatch(/<JournalLoggedRows/);
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
