// ============================================================================
// Phase 27.6 F4 — journal.tsx save-path import pin (privacy boundary).
//
// EmberMate keeps two reflection-shaped stores intentionally separated:
//
//   • storage/reflectionStorage    key prefix:  reflection_
//     - Patient-facing notes written by JournalNotesCard (via journal.tsx's
//       onSave handler). Read by visitPrepPdf, handoffReportBuilder,
//       narrativeSummaryBuilder. Content IS part of the patient record.
//
//   • services/reflectionRepo      key prefix:  reflection_card_
//     - Caregiver-private wellness reflections written by the You-tab
//       ReflectionCard (mood + text). Read by NOBODY downstream. Stays
//       private to the caregiver on this device.
//
// The two stores live at different AsyncStorage key prefixes, hold different
// shapes (notes vs mood+text), and serve different audiences. The Phase 27.6
// concern was that a future refactor might rewire journal.tsx's save path
// from reflectionStorage → reflectionRepo, which would route patient-facing
// notes into the caregiver-private bucket (visitPrepPdf would silently lose
// the notes section) AND route caregiver-private reflections into the
// patient-record bucket (caregiver wellness leaks into the doctor PDF).
//
// This pin guards against that rewire by asserting at the source level that:
//   1. journal.tsx imports saveReflection + getReflection from
//      storage/reflectionStorage (the correct patient-facing path).
//   2. journal.tsx does NOT import anything from services/reflectionRepo
//      (caregiver-private path is OFF-LIMITS to the Journal screen).
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

describe('Phase 27.6 F4 — journal.tsx save-path import pin', () => {
  it('contract 1: imports saveReflection from storage/reflectionStorage', () => {
    // Match the import-statement shape. `saveReflection` may appear alone
    // or alongside other named imports (`getReflection`, type imports);
    // either is acceptable as long as the named import comes from the
    // patient-facing storage module.
    expect(JOURNAL_SRC).toMatch(
      /import\s*\{[^}]*\bsaveReflection\b[^}]*\}\s*from\s*['"][^'"]*storage\/reflectionStorage['"]/,
    );
  });

  it('contract 2: imports getReflection from storage/reflectionStorage', () => {
    expect(JOURNAL_SRC).toMatch(
      /import\s*\{[^}]*\bgetReflection\b[^}]*\}\s*from\s*['"][^'"]*storage\/reflectionStorage['"]/,
    );
  });

  it('contract 3: does NOT import anything from services/reflectionRepo', () => {
    // The caregiver-private store is off-limits to the Journal screen.
    // Any import statement whose source path ends in services/reflectionRepo
    // is a privacy-boundary violation — fail loudly.
    expect(JOURNAL_SRC).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });
});
