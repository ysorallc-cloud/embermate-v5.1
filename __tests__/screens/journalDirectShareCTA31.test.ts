// ============================================================================
// Phase 31 F3 — kill HandoffSheet, direct share from Journal Share CTA.
//
// The Journal page already shows all the data; the separate HandoffSheet
// preview modal (638 lines) was redundant. F3 (2026-05-21) retires
// HandoffSheet entirely and wires the Share CTA directly to
// generateAndShareHandoff (PDF + OS share sheet). The OS share sheet
// offers Copy / Messages / Mail / Save natively, so the in-app
// Copy/SMS duplicate actions retire alongside.
//
// Bundled with F3 per Q-F3.4 lock — the Section 1 gestalt's
// tone-as-override branch retires too. No surface writes the legacy
// handoffTone store going forward (the read path stays in
// utils/consolidatedNotes for the first-load merge that surfaces
// existing legacy content into Section 4's notes input). The gestalt
// becomes narrativeSummary-only.
//
// Past-day notes EDITABILITY landed in F3 — caregivers recall things
// later and need to amend past-day notes. JournalNotesCard's bare
// mode is fully writable on today AND past; the saved-at timestamp
// records WHEN the note was saved (no "added later" marker).
//
// Pinned invariants:
//   1. HandoffSheet module retired — component file deleted; the 4
//      HandoffSheet-specific test files deleted alongside.
//   2. journal.tsx does NOT import HandoffSheet.
//   3. journal.tsx does NOT render <HandoffSheet ...>.
//   4. journal.tsx imports generateAndShareHandoff (the direct-share
//      path) + buildHandoffReport (body builder).
//   5. The Share CTA wires onPress to handleShareDaily (not to a
//      setHandoffSheetVisible state setter).
//   6. handoffSheetVisible state retired.
//   7. handoffTone state retired; the tone-as-override branch in the
//      moodLine resolution is gone (gestalt reads narrativeSummary
//      only).
//   8. journal.tsx does NOT directly import getHandoffTone — the
//      legacy tone read happens only inside utils/consolidatedNotes
//      now (via the read-time merge).
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

// Strip line + block comments so the F3 retirement narrative can
// reference retired symbols by name without false-positiving the
// absence pins below.
const journalStripped = journalSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 31 F3 — kill HandoffSheet + direct share + tone-override retire', () => {
  // ------------------------------------------------------------------------
  // INVARIANT 1 — HandoffSheet module is GONE
  // ------------------------------------------------------------------------

  it('invariant 1: components/journal/HandoffSheet.tsx is deleted', () => {
    expect(existsSync(join(ROOT, 'components/journal/HandoffSheet.tsx'))).toBe(false);
  });

  it('invariant 1 corollary: the 4 HandoffSheet-specific test files are deleted', () => {
    // These tested HandoffSheet's preview/styling/tone-input/date-
    // routing internals. With HandoffSheet retired they have no
    // valid surface to test.
    expect(existsSync(join(ROOT, '__tests__/components/handoffSheetStylePolish.test.ts'))).toBe(false);
    expect(existsSync(join(ROOT, '__tests__/components/handoffSheetStructured.test.ts'))).toBe(false);
    expect(existsSync(join(ROOT, '__tests__/components/handoffSheetDateRouting.test.ts'))).toBe(false);
    expect(existsSync(join(ROOT, '__tests__/components/handoffSheetToneInput.test.tsx'))).toBe(false);
  });

  // ------------------------------------------------------------------------
  // INVARIANTS 2 + 3 — journal.tsx no longer imports / renders HandoffSheet
  // ------------------------------------------------------------------------

  it('invariant 2: journal.tsx does NOT import HandoffSheet', () => {
    expect(journalStripped).not.toMatch(
      /import\s*\{[^}]*\bHandoffSheet\b[^}]*\}\s*from\s*['"][^'"]+HandoffSheet['"]/,
    );
  });

  it('invariant 3: journal.tsx does NOT render <HandoffSheet ...>', () => {
    expect(journalStripped).not.toMatch(/<HandoffSheet\b/);
  });

  // ------------------------------------------------------------------------
  // INVARIANT 4 — direct-share machinery imported
  // ------------------------------------------------------------------------

  it('invariant 4: journal.tsx imports generateAndShareHandoff from services/handoffPdf', () => {
    expect(journalStripped).toMatch(
      /import\s*\{[^}]*\bgenerateAndShareHandoff\b[^}]*\}\s*from\s*['"][^'"]*services\/handoffPdf['"]/,
    );
  });

  it('invariant 4 corollary (reframed for Phase 31 PDF rebuild): journal.tsx imports buildHandoffDay from utils/handoffDayBuilder', () => {
    // Pre-Phase-31 the corollary pinned buildHandoffReport — the curated
    // today-hardcoded body builder. Phase 31 rebuilds Journal Share as a
    // faithful single-day itemized PDF; the body now comes from
    // buildHandoffDay(selectedDate), which bundles the four date-keyed
    // feeders the Journal screen already renders from (no drift,
    // selected-date threaded through). Importing buildHandoffReport here
    // is now PROHIBITED — that path produces the thin curated template
    // the rebuild replaces.
    expect(journalStripped).toMatch(
      /import\s*\{[^}]*\bbuildHandoffDay\b[^}]*\}\s*from\s*['"][^'"]*utils\/handoffDayBuilder['"]/,
    );
    expect(journalStripped).not.toMatch(
      /import\s*\{[^}]*\bbuildHandoffReport\b[^}]*\}\s*from\s*['"][^'"]*utils\/handoffReportBuilder['"]/,
    );
  });

  // ------------------------------------------------------------------------
  // INVARIANT 5 — Share CTA wires to handleShareDaily (not modal state)
  // ------------------------------------------------------------------------

  it('invariant 5 (reframed Phase 35 Slice 3-C): the Share action TouchableOpacity onPress wires to handleShareDaily', () => {
    // Phase 31 F3 originally pinned this on the bottom-sticky CTA
    // (testID journal-share-cta). Phase 35 Slice 3-C relocated the
    // Share affordance to an upper-right sage-outline header action
    // (testID journal-share-header-action) and retired the bottom CTA.
    // The F3 architectural invariant — "Share fires handleShareDaily
    // directly, not via a HandoffSheet modal toggle" — is preserved;
    // only the testID handle changes.
    const ctaBlock = journalStripped.match(
      /testID=["']journal-share-header-action["'][\s\S]{0,600}?onPress=\{([^}]+)\}/,
    );
    expect(ctaBlock).not.toBeNull();
    expect(ctaBlock![1].trim()).toBe('handleShareDaily');
  });

  it('invariant 5 corollary: handleShareDaily calls generateAndShareHandoff (not setHandoffSheetVisible)', () => {
    // Phase 31 F3 — handleShareDaily is a regular `async function`
    // declaration, NOT a useCallback hook. journal.tsx has
    // early-return guards (loading-state, error-state) above this
    // handler; a useCallback here would cause "Rendered more hooks
    // than during the previous render" since it'd fire in the
    // loaded render but not in the loading render. Function
    // declarations sit outside the hook-counting machinery so the
    // early-returns don't matter.
    // Anchor on the declaration, then scan a 1500-char window for the
    // body content. Non-greedy match would stop at the first nested
    // `}` (the early-return guard), so a fixed-window slice is more
    // reliable than trying to balance braces in regex.
    const declIdx = journalStripped.search(/async\s+function\s+handleShareDaily\s*\(/);
    expect(declIdx).toBeGreaterThan(-1);
    const handlerBlock = journalStripped.slice(declIdx, declIdx + 1500);
    expect(handlerBlock).toMatch(/generateAndShareHandoff\s*\(/);
    expect(handlerBlock).not.toMatch(/setHandoffSheetVisible/);
  });

  // ------------------------------------------------------------------------
  // INVARIANT 6 — handoffSheetVisible state retired
  // ------------------------------------------------------------------------

  it('invariant 6: handoffSheetVisible state retired from journal.tsx', () => {
    expect(journalStripped).not.toMatch(/\bhandoffSheetVisible\b/);
    expect(journalStripped).not.toMatch(/\bsetHandoffSheetVisible\b/);
  });

  // ------------------------------------------------------------------------
  // INVARIANT 7 — handoffTone state + override retired
  // ------------------------------------------------------------------------

  it('invariant 7: handoffTone state retired from journal.tsx', () => {
    // Pre-F3: const [handoffTone, setHandoffTone] = useState... — read
    // the legacy tone for the Section 1 gestalt override. Post-F3:
    // gone. Any tone content is folded into Section 4's notes input
    // via consolidatedNotes; the gestalt no longer overrides.
    expect(journalStripped).not.toMatch(/useState[^;]*handoffTone/);
    expect(journalStripped).not.toMatch(/setHandoffTone\s*\(/);
  });

  it('invariant 7 corollary: moodLine resolution no longer branches on handoffTone', () => {
    // Pre-F3 moodLine =
    //   (handoffTone && ...) ? handoffTone : narrativeSummary || fallback
    // Post-F3 moodLine = narrativeSummary || fallback. The
    // handoffTone identifier doesn't appear in the moodLine
    // assignment.
    const moodLineBlock = journalStripped.match(
      /const\s+moodLine\s*:[\s\S]{0,400}?;/,
    );
    expect(moodLineBlock).not.toBeNull();
    expect(moodLineBlock![0]).not.toMatch(/handoffTone/);
    expect(moodLineBlock![0]).toMatch(/narrativeSummary/);
  });

  // ------------------------------------------------------------------------
  // INVARIANT 8 — getHandoffTone is no longer imported by journal.tsx
  // (it's still imported by utils/consolidatedNotes for the legacy merge)
  // ------------------------------------------------------------------------

  it('invariant 8: journal.tsx does NOT import getHandoffTone directly', () => {
    // The legacy tone read happens inside utils/consolidatedNotes for
    // the first-load read-time merge. journal.tsx accesses it only
    // through that utility's API now.
    expect(journalStripped).not.toMatch(
      /import\s*\{[^}]*\bgetHandoffTone\b[^}]*\}\s*from\s*['"][^'"]*storage\/handoffToneRepo['"]/,
    );
  });
});
