// ============================================================================
// Phase 5.12.g — Share Handoff CTA (reframed Phase 35 Slice 3-C).
//
// HISTORICAL: Phase 5.12.g introduced a single anchored "Share handoff →"
// button at the BOTTOM of the Journal page as the only primary action on
// the screen. Hidden when the day was empty (no events, no notes) and on
// past days (handoff was today-only).
//
// PHASE 35 EVOLUTION:
//   • Slice 3-B (commit dde95a31) — decoupled visibility from content
//     (the gate became `isViewingToday`-only; saving a note no longer
//     "popped up" the CTA).
//   • Slice 3-C — relocated the Share affordance entirely from a bottom
//     sticky CTA to an upper-right sage-outline HEADER ACTION (per the
//     Phase 33 banked brand spec). The action now lives inside the
//     Journal headerRow, fires the same handleShareDaily handler, and
//     shows on BOTH today AND past days (handleShareDaily threads
//     selectedDate through buildHandoffDay).
//
// The Phase 5.12.g architectural invariants this file pinned — "single
// primary share action; fires handleShareDaily directly; no HandoffCard
// alternative" — are preserved. Only the visual placement + style
// changed. Each contract below is reframed to the post-Slice-3-C
// surface.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(
  join(ROOT, 'app/(tabs)/journal.tsx'),
  'utf8',
);

describe('Phase 5.12.g — Share Handoff action (reframed Phase 35 Slice 3-C)', () => {
  it('renders the "Share" CTA copy (the action label)', () => {
    // Pre-Slice-3-C the copy was "Share handoff →" inside a saturated-
    // green sticky CTA. The relocated sage-outline header action uses
    // a tighter "Share" label (the headerRow real estate is narrow).
    // Pin: the word "Share" appears in source as the action label.
    expect(journalSrc).toMatch(/>Share</);
  });

  it('Phase 31 F3 — the Share action fires handleShareDaily directly (reframed from sticky-bottom testID to header-action testID)', () => {
    // Pre-F3 the CTA opened HandoffSheet via setHandoffSheetVisible(true).
    // Phase 31 F3 (2026-05-21) retired HandoffSheet; onPress wires
    // directly to handleShareDaily → generateAndShareHandoff (PDF +
    // OS share). Phase 35 Slice 3-C only changes the testID handle
    // (the architectural invariant — direct handler wiring — survives).
    expect(journalSrc).toMatch(
      /testID=['"]journal-share-header-action['"][\s\S]{0,600}onPress=\{handleShareDaily\}/,
    );
  });

  it('Phase 35 Slice 3-C — the Share action is a sage-outline header action (reframed from "absolute-positioned sticky" pin)', () => {
    // Pre-Slice-3-C the sticky pattern was position: absolute + bottom
    // inset. Slice 3-C retires the sticky in favor of an in-flow
    // header action; the style block is shareHeaderAction (sage
    // border + sage text + transparent fill, NO backgroundColor:
    // c.accent — the canon-defended invariant against the loud green
    // re-creeping back).
    const styleBlock = journalSrc.match(/shareHeaderAction\s*:\s*\{([^}]*)\}/);
    expect(styleBlock).toBeTruthy();
    expect(styleBlock![1]).toMatch(/borderColor\s*:\s*c\.accent\b/);
    expect(styleBlock![1]).toMatch(/borderWidth\s*:\s*1\b/);
    expect(styleBlock![1]).not.toMatch(/backgroundColor\s*:\s*c\.accent\b/);
  });

  it('Phase 35 Slice 3-C — the Share action shows on past days too (reframed from "hides on past days" pin)', () => {
    // Pre-Slice-3-C the sticky CTA was today-only (no past-day share
    // entry point existed; user-locked option b1 in Slice 3-B kept
    // this restriction for the bottom surface). Slice 3-C's full
    // design moves past-day Share to the header action — caregivers
    // need to re-share or amend past days. The header action must
    // NOT be wrapped in an isViewingToday gate.
    const actionIdx = journalSrc.search(/testID=['"]journal-share-header-action['"]/);
    expect(actionIdx).toBeGreaterThan(-1);
    const window = journalSrc.slice(
      Math.max(0, actionIdx - 600),
      Math.min(journalSrc.length, actionIdx + 400),
    );
    expect(window).not.toMatch(/!isViewingToday[^?]*\?\s*null/);
    expect(window).not.toMatch(/isViewingPast\s*&&/);
  });

  it('Phase 35 Slice 3-C — the Share action is NOT gated by content state (reframed from "hides on empty days" pin)', () => {
    // Pre-Slice-3-B the sticky CTA's gate was
    //   if (!isViewingToday || !hasShareableContent) return null;
    // where hasShareableContent = dayEvents.length > 0 || reflection.text.
    // That meant saving a note "popped up" the CTA — a deliberate share
    // action coupled to an incidental save (the bug Slice 3-B fixed).
    // Slice 3-C extends the decoupling to the new surface — the
    // header action's render must NOT reference any content-derived
    // shareability flag.
    const actionIdx = journalSrc.search(/testID=['"]journal-share-header-action['"]/);
    expect(actionIdx).toBeGreaterThan(-1);
    const window = journalSrc.slice(
      Math.max(0, actionIdx - 800),
      actionIdx,
    );
    expect(window).not.toMatch(/hasShareableContent/);
    expect(window).not.toMatch(/dayEvents\s*&&\s*dayEvents\.length/);
  });
});

describe('Phase 5.12.g — single primary action contract (preserved through Slice 3-C)', () => {
  it('removes the legacy HandoffCard share button (header action is the only primary)', () => {
    // The Phase 5.12.g spec: "The CTA is the page's only primary action."
    // HandoffCard's "Share summary" button was the previous primary;
    // both can't coexist or Journal grows two competing share entry
    // points. Slice 3-C preserves this invariant — the header action
    // is the sole share surface.
    expect(journalSrc).not.toMatch(/<HandoffCard\b/);
  });

  it('Phase 35 Slice 3-C — the retired bottom CTA render is GONE (single-primary preserved through relocation)', () => {
    // If both the header action AND the bottom CTA rendered, Journal
    // would have two competing primary share entry points. Slice 3-C
    // commits to one: the header action. Pin the absence of the
    // bottom-CTA testID render.
    expect(journalSrc).not.toMatch(/testID=['"]journal-share-cta['"]/);
  });
});
