// ============================================================================
// Phase 35 Slice 3-B — Share Handoff action decoupled from note saves.
// Reframed at Phase 35 Slice 3-C to point at the relocated surface.
//
// ORIGINAL BUG (Slice 3-B): saving the "For the next caregiver" reflection
// in JournalNotesCard caused the green Share Handoff CTA to pop up. The
// pre-fix gate in app/(tabs)/journal.tsx:1125-1130 was:
//   const hasShareableContent =
//     (dayEvents && dayEvents.length > 0) ||
//     (reflection?.text?.trim().length ?? 0) > 0;
//   if (!isViewingToday || !hasShareableContent) return null;
//
// Pre-save: empty day → CTA hidden. The save mutated reflection.text →
// hasShareableContent flipped false→true → CTA materialized. The fix
// dropped the hasShareableContent clause; visibility became
// isViewingToday-only. Saving a note no longer affects CTA visibility
// because the CTA was already there.
//
// USER-LOCKED in Slice 3-B (option b1): persistent on today only. Past-
// day share lived in the Slice 3-C upper-right header action.
//
// REFRAMED IN SLICE 3-C: the bottom sticky CTA retired entirely; the
// Share affordance moved to an upper-right sage-outline header action
// (testID journal-share-header-action). The Slice 3-B regression class
// — "saving a note does NOT pop a share affordance" — is preserved on
// the new surface. Slice 3-B's contract 2 (past-day hide on the sticky
// CTA) no longer applies: the header action is intentionally visible
// on past days. The regression class shifts target; contract 2 retires.
//
// SCOPE: source-level pin that the header action's render is NOT
// dependent on content-derived flags (reflection text / dayEvents
// length / hasShareableContent). Behavioral proof of "no-pop-on-save"
// remains walk-only — TestRenderer can't meaningfully simulate a real
// save + scroll + re-render — but the source-pin is the structural
// regression guard.
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

describe('Phase 35 Slice 3-B — Share Handoff action decoupled from content (reframed at Slice 3-C to the header action)', () => {
  it('contract 1 (DECOUPLE — reframed to header action): the header action render is NOT gated by reflection text, dayEvents length, or hasShareableContent', () => {
    // Anchor on the new surface's testID — uniquely identifies the
    // header action's render block. Walk a 1500-char BACKWARD window
    // from there to capture any visibility guard above the JSX.
    const actionIdx = STRIPPED.search(/testID=['"]journal-share-header-action['"]/);
    expect(actionIdx).toBeGreaterThan(-1);
    const gateWindow = STRIPPED.slice(
      Math.max(0, actionIdx - 1500),
      actionIdx,
    );

    // Hard reject the pre-fix shape: hasShareableContent and the
    // two content-derived inputs that built it. If any of these
    // re-appear as a render-gate for the header action, the
    // Slice 3-B regression class has re-emerged on the new surface.
    expect(gateWindow).not.toMatch(/hasShareableContent/);
    expect(gateWindow).not.toMatch(/reflection\??\.text[^a-zA-Z][^?]*\?\s*null/);
    expect(gateWindow).not.toMatch(/dayEvents\s*&&\s*dayEvents\.length[^?]*\?\s*null/);
  });

  // Slice 3-B's contract 2 ("past-day lock — option b1") retired at
  // Slice 3-C: the relocated header action is intentionally visible
  // on past days (the whole point of the relocation — give caregivers
  // a way to re-share past handoffs). Past-day visibility is pinned
  // positively at journalShareHeaderAction35S3C.test.ts contract 3.
});
