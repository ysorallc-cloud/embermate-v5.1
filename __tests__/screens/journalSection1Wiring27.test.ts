// ============================================================================
// Phase 27 F3b — Section 1 (Subjective) wired into journal.tsx today path.
//
// Pre-27 journal.tsx rendered the standalone GestaltSummary on line 659,
// directly under JournalIdentityStrip, on BOTH today and past paths.
// Phase 27 keeps that standalone mount for the past-day path (spec says
// past-day path is unchanged) but routes the today path through a new
// JournalSection container — Section 1 — that wraps GestaltSummary in
// bare mode inside a lavender card.
//
// Phase 27 D7 (audit-confirmed) — Section 1's empty-state must NOT mount
// a second JournalNotesCard alongside Section 4's. F3b ships the empty
// state as a non-interactive prompt; F6 wires the tap-to-focus
// interaction once JournalNotesCard moves into Section 4 with a ref.
//
// Pinned contracts:
//   1. journal.tsx imports JournalSection from components/journal.
//   2. The first <JournalSection block in source has eyebrow text
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
  it('contract 1: imports JournalSection from components/journal', () => {
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bJournalSection\b[^}]*\}\s*from\s*['"][^'"]*\/journal\/JournalSection['"]/,
    );
  });

  it('contract 2: first <JournalSection has eyebrow "How today went" and tint "caregiverAccent"', () => {
    // Locate the first <JournalSection ... > tag.
    const m = STRIPPED.match(/<JournalSection[\s\S]*?>/);
    expect(m).toBeTruthy();
    const tag = m![0];
    expect(tag).toMatch(/eyebrow=["']How today went["']/);
    expect(tag).toMatch(/tint=["']caregiverAccent["']/);
  });

  it('contract 3: Section 1 contains <GestaltSummary ... bare={true}', () => {
    // Locate the first <JournalSection block including its children up
    // to the matching </JournalSection> close (or self-close — for F3b
    // we expect children, so the open form).
    const start = STRIPPED.indexOf('<JournalSection');
    expect(start).toBeGreaterThan(-1);
    const end = STRIPPED.indexOf('</JournalSection>', start);
    expect(end).toBeGreaterThan(start);
    const block = STRIPPED.slice(start, end);
    expect(block).toMatch(/<GestaltSummary[\s\S]*?bare/);
  });

  it('contract 4: standalone <GestaltSummary at the pre-27 position is gated on isViewingPast', () => {
    // Find a <GestaltSummary that is OUTSIDE a <JournalSection block.
    // The pre-27 mount sat above DateTabStrip; post-27 the today path
    // routes through Section 1 (which contains its own GestaltSummary
    // in bare mode). The past path keeps the original mount — gated.
    //
    // Pin: there's at least one <GestaltSummary reference outside of
    // Section 1's body, and the gating condition `isViewingPast` is
    // within the 200 chars preceding it.
    const sectionStart = STRIPPED.indexOf('<JournalSection');
    const sectionEnd = STRIPPED.indexOf('</JournalSection>', sectionStart);
    // Walk all <GestaltSummary occurrences.
    const occurrences: number[] = [];
    let idx = 0;
    while ((idx = STRIPPED.indexOf('<GestaltSummary', idx)) !== -1) {
      occurrences.push(idx);
      idx += 1;
    }
    // At least 2 occurrences: one inside Section 1 (contract 3) and
    // one for the past-path standalone mount.
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    // Find an occurrence OUTSIDE Section 1's range.
    const outside = occurrences.filter(
      (o) => o < sectionStart || o > sectionEnd,
    );
    expect(outside.length).toBeGreaterThanOrEqual(1);
    // The 200 chars preceding the outside mount must reference
    // isViewingPast (the gating condition).
    const standaloneIdx = outside[0];
    const before = STRIPPED.slice(Math.max(0, standaloneIdx - 200), standaloneIdx);
    expect(before).toMatch(/isViewingPast/);
  });

  it('contract 5: Section 1 empty-state prompt copy "How would you describe today?" exists in source', () => {
    // The exact prompt copy is part of the Section 1 empty-state branch.
    // F3b ships this as non-interactive text; F6 wires the tap-to-focus.
    expect(STRIPPED).toMatch(/How would you describe today\?/);
  });
});
