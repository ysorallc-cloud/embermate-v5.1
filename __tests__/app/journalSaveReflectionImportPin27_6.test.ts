// ============================================================================
// Phase 27.6 F4 — journal.tsx save-path import pin (privacy boundary).
//
// EmberMate keeps two reflection-shaped stores intentionally separated:
//
//   • storage/reflectionStorage    key prefix:  reflection_
//     - Patient-facing notes written by JournalNotesCard (via journal.tsx's
//       onSave handler, which now routes through saveConsolidatedNotes per
//       Phase 31 F2). Read by visitPrepPdf, handoffDayBuilder (indirectly
//       via getConsolidatedNotes), narrativeSummaryBuilder. Content IS
//       part of the patient record. (Phase 31 retired handoffReportBuilder
//       as a direct reader.)
//
//   • services/reflectionRepo      key prefix:  reflection_card_
//     - Caregiver-private wellness reflections written by the You-tab
//       ReflectionCard (mood + text). Read by NOBODY downstream. Stays
//       private to the caregiver on this device.
//
// The two stores live at different AsyncStorage key prefixes, hold different
// shapes (notes vs mood+text), and serve different audiences. The original
// Phase 27.6 concern was that a future refactor might rewire journal.tsx's
// save path from reflectionStorage → reflectionRepo, which would route
// patient-facing notes into the caregiver-private bucket (visitPrepPdf would
// silently lose the notes section) AND route caregiver-private reflections
// into the patient-record bucket (caregiver wellness leaks into the doctor
// PDF).
//
// Phase 31 F2 (2026-05-21) — journal.tsx routes its Section 4 save through
// utils/consolidatedNotes (saveConsolidatedNotes), which itself wraps
// saveReflection from storage/reflectionStorage. The privacy boundary is
// PRESERVED: notes still land in the patient-facing store, just via one
// layer of indirection. This pin reframes to assert the new shape AND the
// preserved boundary AT BOTH LAYERS (journal.tsx + the consolidatedNotes
// utility), so the indirection doesn't open a hole.
//
// Companion behavioral pins for the three patient-facing builders live in:
//   __tests__/services/caregiverWellnessNotInVisitPrep27_6.test.ts
//   __tests__/utils/caregiverWellnessNotInHandoffReport27_6.test.ts
//   __tests__/utils/caregiverWellnessNotInNarrativeSummary27_6.test.ts
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const JOURNAL_SRC = readFileSync(
  join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
  'utf8',
);
const CONSOLIDATED_NOTES_SRC = readFileSync(
  join(__dirname, '../..', 'utils/consolidatedNotes.ts'),
  'utf8',
);

describe('Phase 27.6 F4 — journal.tsx save-path import pin (Phase 31 F2 reframe)', () => {
  it('contract 1: journal.tsx routes its save path through saveConsolidatedNotes (Phase 31 F2 — replaces the pre-F2 direct saveReflection import)', () => {
    // Phase 31 F2 retired the direct saveReflection import from
    // journal.tsx; the save path now routes through
    // utils/consolidatedNotes which writes to reflectionStorage AND
    // sets the per-date authoritative flag. Contract reframed from
    // "imports saveReflection directly" → "imports
    // saveConsolidatedNotes from the consolidated utility." Privacy
    // boundary preserved by contract 4 below (the utility itself
    // writes only to reflectionStorage).
    expect(JOURNAL_SRC).toMatch(
      /import\s*\{[^}]*\bsaveConsolidatedNotes\b[^}]*\}\s*from\s*['"][^'"]*utils\/consolidatedNotes['"]/,
    );
  });

  it('contract 2: journal.tsx routes its load path through getConsolidatedNotes (Phase 31 F2 — replaces the pre-F2 direct getReflection import)', () => {
    expect(JOURNAL_SRC).toMatch(
      /import\s*\{[^}]*\bgetConsolidatedNotes\b[^}]*\}\s*from\s*['"][^'"]*utils\/consolidatedNotes['"]/,
    );
  });

  it('contract 3: journal.tsx does NOT import anything from services/reflectionRepo (privacy boundary — caregiver-private store off-limits)', () => {
    // The caregiver-private store is off-limits to the Journal screen.
    // Any import statement whose source path ends in services/reflectionRepo
    // is a privacy-boundary violation — fail loudly. Unchanged from the
    // original Phase 27.6 contract 3 (the privacy boundary outlived the
    // Phase 31 F2 indirection).
    expect(JOURNAL_SRC).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });

  it('contract 4 (NEW — Phase 31 F2 defense-in-depth): consolidatedNotes utility itself writes to reflectionStorage, never reflectionRepo', () => {
    // The Phase 31 F2 indirection means the privacy boundary now
    // lives partially in utils/consolidatedNotes. Defense-in-depth:
    // assert that the utility's save path imports saveReflection
    // from storage/reflectionStorage AND does NOT import anything
    // from services/reflectionRepo. If a future contributor swapped
    // the utility's storage backend to reflectionRepo, the journal-
    // level pin would still pass (the imports look correct at the
    // call site) but patient notes would leak into the caregiver-
    // private bucket. This pin closes that loophole.
    expect(CONSOLIDATED_NOTES_SRC).toMatch(
      /import\s*\{[^}]*\bsaveReflection\b[^}]*\}\s*from\s*['"][^'"]*storage\/reflectionStorage['"]/,
    );
    expect(CONSOLIDATED_NOTES_SRC).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });
});
