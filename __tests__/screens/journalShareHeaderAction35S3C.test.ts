// ============================================================================
// Phase 35 Slice 3-C — Share action relocates to Journal header (sage-outline).
//
// Phase 33 banked the decision (memory: project_phase_33_audit.md) but
// the work never landed:
//   "Journal 'Share handoff' button — RELOCATE to the upper-right corner
//    as a compact header action ... RECOLOR off the saturated green fill
//    → SAGE-OUTLINE (sage border + sage text, transparent fill)."
//
// Slice 3-C builds it. The new header action fires the SAME
// handleShareDaily handler (the PDF + OS share path Phase 31 F3 wired);
// works on both today AND past days because handleShareDaily already
// threads selectedDate through buildHandoffDay (journal.tsx:753-764).
//
// The bottom green sticky CTA (testID journal-share-cta) RETIRES — two
// CTAs for one action is clutter, and the loud bottom one was the
// off-brand surface. Hide-not-delete: handleShareDaily stays in source
// (it's the action wired to the new header button); the now-unused
// shareCta / shareCtaText style blocks stay in createStyles awaiting
// the dead-code sweep at phase close.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const JOURNAL_SRC = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(JOURNAL_SRC);

describe('Phase 35 Slice 3-C — header share action + bottom CTA retired', () => {
  // --------------------------------------------------------------------------
  // The new header action.
  // --------------------------------------------------------------------------

  it('contract 1 (HEADER ACTION): a Share action with testID="journal-share-header-action" lives inside the Journal headerRow', () => {
    // The new action sits in the upper-right of the Journal screen
    // header (next to the "Journal" title). Pin its testID; pin
    // that it's positioned inside the headerRow (anchor on the
    // headerRow View, look forward 1000 chars for the testID).
    const headerRowIdx = STRIPPED.search(/<View\s+style=\{s\.headerRow\}/);
    expect(headerRowIdx).toBeGreaterThan(-1);
    const headerWindow = STRIPPED.slice(
      headerRowIdx,
      Math.min(STRIPPED.length, headerRowIdx + 1500),
    );
    expect(headerWindow).toMatch(/testID=['"]journal-share-header-action['"]/);
  });

  it('contract 2 (HANDLER WIRING): the header action onPress fires handleShareDaily (the existing PDF + OS share path)', () => {
    // Same handler the bottom CTA used (handleShareDaily threads
    // selectedDate through buildHandoffDay, so it works on today
    // AND past days — pinned in journal.tsx:753).
    const actionIdx = STRIPPED.search(/testID=['"]journal-share-header-action['"]/);
    expect(actionIdx).toBeGreaterThan(-1);
    const window = STRIPPED.slice(
      Math.max(0, actionIdx - 400),
      Math.min(STRIPPED.length, actionIdx + 600),
    );
    expect(window).toMatch(/onPress=\{handleShareDaily\}/);
  });

  it('contract 3 (NO TODAY-ONLY GATE): the header action is visible on past days too (handleShareDaily already handles selectedDate)', () => {
    // The bottom CTA was today-only (b1 lock from Slice 3-B). The
    // header action is the past-day path; it must NOT be wrapped in
    // an `!isViewingToday return null` or `isViewingPast && (` gate.
    // Pin: 800-char window around the header-action testID contains
    // no `isViewingToday`/`isViewingPast` short-circuit.
    const actionIdx = STRIPPED.search(/testID=['"]journal-share-header-action['"]/);
    expect(actionIdx).toBeGreaterThan(-1);
    const window = STRIPPED.slice(
      Math.max(0, actionIdx - 600),
      Math.min(STRIPPED.length, actionIdx + 400),
    );
    expect(window).not.toMatch(/!isViewingToday[^?]*\?\s*null/);
    expect(window).not.toMatch(/isViewingPast\s*&&/);
  });

  // --------------------------------------------------------------------------
  // Sage-outline style (Phase 33 brand spec).
  // --------------------------------------------------------------------------

  it('contract 4 (SAGE-OUTLINE STYLE): the header action style block uses sage border + sage text + transparent fill (no saturated-green background)', () => {
    // Pin the style shape so a future refactor can't silently
    // re-introduce the loud green fill. The style block is named
    // shareHeaderAction (matching the testID convention).
    const styleBlock = STRIPPED.match(/shareHeaderAction\s*:\s*\{([^}]+)\}/);
    expect(styleBlock).not.toBeNull();
    const body = styleBlock![1];
    // Sage border via the canon accent token.
    expect(body).toMatch(/borderColor\s*:\s*c\.accent\b/);
    expect(body).toMatch(/borderWidth\s*:\s*1\b/);
    // Transparent fill — no backgroundColor: c.accent (the loud
    // saturated shape the Phase 33 spec retires).
    expect(body).not.toMatch(/backgroundColor\s*:\s*c\.accent\b/);

    // Label uses sage text.
    const labelBlock = STRIPPED.match(/shareHeaderActionLabel\s*:\s*\{([^}]+)\}/);
    expect(labelBlock).not.toBeNull();
    expect(labelBlock![1]).toMatch(/color\s*:\s*c\.accent\b/);
  });

  // --------------------------------------------------------------------------
  // Bottom CTA retired; handler preserved (hide-not-delete).
  // --------------------------------------------------------------------------

  it('contract 5 (BOTTOM CTA RETIRED): the testID="journal-share-cta" render is GONE from journal.tsx', () => {
    // The loud bottom-green CTA is the surface being retired.
    // No JSX rendering it should remain.
    expect(STRIPPED).not.toMatch(/testID=['"]journal-share-cta['"]/);
  });

  it('contract 6 (HIDE-NOT-DELETE — HANDLER): handleShareDaily stays exported / defined in journal.tsx (it\'s wired to the new header action)', () => {
    expect(STRIPPED).toMatch(/(?:async\s+function\s+handleShareDaily|const\s+handleShareDaily\s*=)/);
  });

  it('contract 7 (HIDE-NOT-DELETE — STYLES): the retired shareCta / shareCtaText style blocks stay in createStyles (dead-code sweep target, not auto-deleted)', () => {
    // Per the user-locked hide-not-delete rule for this slice —
    // "retired bottom-CTA component preserved in source if cross-
    // referenced; surface for the dead-code sweep at phase close,
    // don't auto-delete." The styles are unused but preserved.
    expect(STRIPPED).toMatch(/\bshareCta\s*:\s*\{/);
    expect(STRIPPED).toMatch(/\bshareCtaText\s*:\s*\{/);
  });
});
