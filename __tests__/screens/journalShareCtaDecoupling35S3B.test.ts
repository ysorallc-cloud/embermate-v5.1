// ============================================================================
// Phase 35 Slice 3-B — Share Handoff CTA decoupled from note saves.
//
// BUG: saving the "For the next caregiver" reflection in JournalNotesCard
// causes the green Share Handoff CTA to pop up. Trigger pinned in
// app/(tabs)/journal.tsx:1125-1130:
//   const hasShareableContent =
//     (dayEvents && dayEvents.length > 0) ||
//     (reflection?.text?.trim().length ?? 0) > 0;
//   if (!isViewingToday || !hasShareableContent) return null;
//
// Pre-save: empty day → CTA hidden. The save mutates reflection.text →
// hasShareableContent flips false→true → CTA materializes. Reads as
// "pops up on save" — coupling a deliberate share action to an
// incidental note save.
//
// USER-LOCKED (option b1): persistent on today only. Drop the
// hasShareableContent gate. Past-day share lives in the upper-right
// header action (Slice 3-C). Saving a note has no effect on CTA
// visibility because the CTA was already there.
//
// SCOPE: one-line fix to the gate. Behavioral proof of "no-pop-up-on-
// save" is walk-only (TestRenderer can't simulate a real save + scroll
// + re-render meaningfully); source-level pin is the regression guard
// — the visibility condition must NOT reference reflection.text /
// dayEvents.length / any content-derived shareability flag.
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

describe('Phase 35 Slice 3-B — Share Handoff CTA visibility decoupled from content', () => {
  it('contract 1 (DECOUPLE): the CTA visibility gate is ONLY `isViewingToday` — no reference to reflection text or dayEvents length in the gate', () => {
    // Anchor on the testID literal — uniquely identifies the CTA's
    // render block. Walk a 1500-char BACKWARD window from there to
    // capture the gate (the visibility check immediately above the
    // <TouchableOpacity>).
    const ctaIdx = STRIPPED.search(/testID=['"]journal-share-cta['"]/);
    expect(ctaIdx).toBeGreaterThan(-1);
    const gateWindow = STRIPPED.slice(
      Math.max(0, ctaIdx - 1500),
      ctaIdx,
    );

    // The gate now references isViewingToday only — pin its presence.
    expect(gateWindow).toMatch(/isViewingToday/);

    // Hard reject the pre-fix shape: `hasShareableContent` and the
    // two content-derived inputs that built it. If any of these
    // re-appear in the gate window, the regression is back.
    expect(gateWindow).not.toMatch(/hasShareableContent/);
    expect(gateWindow).not.toMatch(/reflection\??\.text/);
    expect(gateWindow).not.toMatch(/dayEvents\s*&&\s*dayEvents\.length/);
  });

  it('contract 2 (PAST-DAY LOCK — option b1): the gate still hides the CTA on past days (past-day share lives in the C upper-right action)', () => {
    // User-locked option b1: today-only. Past-day share moves to the
    // upper-right header action in Slice 3-C. The gate must still
    // return null for past views; pin its shape includes either
    // `!isViewingToday` or `isViewingPast` as a short-circuit.
    const ctaIdx = STRIPPED.search(/testID=['"]journal-share-cta['"]/);
    expect(ctaIdx).toBeGreaterThan(-1);
    const gateWindow = STRIPPED.slice(
      Math.max(0, ctaIdx - 1500),
      ctaIdx,
    );

    // One of these short-circuit patterns must appear: either
    // `!isViewingToday` or `isViewingPast`. (b1 — past hides.)
    const blocksPast =
      /!\s*isViewingToday/.test(gateWindow) ||
      /\bisViewingPast\b[^)]*return\s+null/.test(gateWindow);
    expect(blocksPast).toBe(true);
  });
});
