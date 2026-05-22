// ============================================================================
// Phase 31 F2 — Section 4 (Plan) wires through consolidatedNotes + Q-31 prompt.
//
// Pins the Section 4 wire-up changes:
//
//   1. journal.tsx loads Section 4 content via getConsolidatedNotes
//      (not direct getReflection). The merge + authoritative-flag
//      rules in utils/consolidatedNotes govern what the user sees.
//
//   2. journal.tsx saves via saveConsolidatedNotes (not direct
//      saveReflection). The save sets the authoritative flag so
//      subsequent loads skip the legacy tone merge.
//
//   3. The pre-F2 direct getReflection / saveReflection runtime calls
//      no longer appear at the Section 4 wire-up path. Type-only
//      `StoredReflection` import is permitted (saveConsolidatedNotes
//      returns it).
//
//   4. JournalNotesCard's bare-mode placeholder copy is exactly the
//      locked Q-31 prompt: "Anything to pass to the next caregiver,
//      or to flag at the next appointment?" — verbatim, no provider
//      interpolation, no trailing ellipsis. One prompt, in the field,
//      vanishes on type (Q-31 Q4 lock — no persistent prompt above).
//
//   5. The non-readOnly placeholder branch on JournalNotesCard is the
//      Q-31 copy (not the past-day "Notes from this day" copy).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const notesCardSrc = readFileSync(
  join(ROOT, 'components/journal/JournalNotesCard.tsx'),
  'utf8',
);

// Strip line + block comments so commit-narrative mentions of the
// retired symbols don't false-positive against absence pins.
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const journalStripped = strip(journalSrc);
const notesCardStripped = strip(notesCardSrc);

const Q31_PROMPT =
  'Anything to pass to the next caregiver, or to flag at the next appointment?';

describe('Phase 31 F2 — Section 4 consolidated notes wire-up + Q-31 prompt', () => {
  // --------------------------------------------------------------------------
  // Wire-up — load + save route through consolidatedNotes
  // --------------------------------------------------------------------------

  it('contract 1: journal.tsx imports getConsolidatedNotes from utils/consolidatedNotes', () => {
    expect(journalStripped).toMatch(
      /import\s*\{[^}]*\bgetConsolidatedNotes\b[^}]*\}\s*from\s*['"][^'"]*utils\/consolidatedNotes['"]/,
    );
  });

  it('contract 2: journal.tsx imports saveConsolidatedNotes from utils/consolidatedNotes', () => {
    expect(journalStripped).toMatch(
      /import\s*\{[^}]*\bsaveConsolidatedNotes\b[^}]*\}\s*from\s*['"][^'"]*utils\/consolidatedNotes['"]/,
    );
  });

  it('contract 3: journal.tsx invokes getConsolidatedNotes (load path active)', () => {
    expect(journalStripped).toMatch(/\bgetConsolidatedNotes\s*\(/);
  });

  it('contract 4: journal.tsx invokes saveConsolidatedNotes (save path active)', () => {
    expect(journalStripped).toMatch(/\bsaveConsolidatedNotes\s*\(/);
  });

  // --------------------------------------------------------------------------
  // Retirement — direct reflectionStorage runtime calls retire from journal.tsx
  // --------------------------------------------------------------------------

  it('contract 5: journal.tsx does NOT invoke getReflection or saveReflection directly', () => {
    // Type-only `StoredReflection` import is permitted (it's
    // surfaced by saveConsolidatedNotes' return type). RUNTIME calls
    // to the retired direct functions are forbidden — any survivor
    // bypasses the authoritative-flag mechanism and re-introduces
    // the after-save corruption bug class.
    expect(journalStripped).not.toMatch(/\bgetReflection\s*\(/);
    expect(journalStripped).not.toMatch(/\bsaveReflection\s*\(/);
  });

  it('contract 6: journal.tsx does NOT import getReflection / saveReflection as values', () => {
    // Defensive on the import surface too — even if a function is
    // imported but never called, a later contributor could uncomment
    // a use. The type-only import `type StoredReflection` stays;
    // value imports of the storage operations retire.
    expect(journalStripped).not.toMatch(
      /import\s*\{[^}]*\bgetReflection\b[^}]*\}\s*from\s*['"][^'"]*storage\/reflectionStorage['"]/,
    );
    expect(journalStripped).not.toMatch(
      /import\s*\{[^}]*\bsaveReflection\b[^}]*\}\s*from\s*['"][^'"]*storage\/reflectionStorage['"]/,
    );
  });

  // --------------------------------------------------------------------------
  // Prompt copy — Q-31 lock
  // --------------------------------------------------------------------------

  it('contract 7: JournalNotesCard bare-mode placeholder is the verbatim Q-31 prompt copy', () => {
    expect(notesCardStripped).toContain(Q31_PROMPT);
  });

  it('contract 8: the pre-F2 "A note for the next caregiver" copy retires (absence pin)', () => {
    // The old placeholder used provider-name interpolation and
    // ellipsis-styled phrasing. Q-31 lock replaces it with a single
    // question-mark-terminated prompt with no interpolation. Retire
    // the substring so re-introduction fails.
    expect(notesCardStripped).not.toMatch(/A note for the next caregiver/);
  });

  it('contract 9: no persistent prompt above the bare-mode input (Q-31 Q4 lock — placeholder only)', () => {
    // The redesigned Section 4 carries the prompt inside the input
    // as the placeholder; no separate persistent label above. The
    // bare-mode branch in JournalNotesCard renders a single
    // <TextInput> with the Q-31 placeholder — no preceding <Text>
    // node carrying the same prompt copy.
    //
    // Source pin: the Q-31 prompt string appears EXACTLY ONCE in the
    // component source (only as the placeholder value). If a future
    // contributor adds an above-input <Text>{barePlaceholder}</Text>,
    // the string would appear twice and this assertion would fail.
    const occurrences = notesCardStripped.split(Q31_PROMPT).length - 1;
    expect(occurrences).toBe(1);
  });
});
