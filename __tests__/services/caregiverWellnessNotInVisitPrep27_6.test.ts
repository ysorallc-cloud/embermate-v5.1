// ============================================================================
// Phase 27.6 F1 — Caregiver-private wellness content MUST NOT appear in the
// Visit Prep PDF data assembly (privacy boundary).
//
// Two reflection-shaped stores live in the app:
//   • storage/reflectionStorage   (key reflection_${date})   — patient-facing
//   • services/reflectionRepo     (key reflection_card_${date}) — caregiver
//
// The Visit Prep PDF feeds the doctor visit and reads patient-facing notes
// via storage/reflectionStorage.getReflection (visitPrepPdf.ts:402). It MUST
// NOT read from services/reflectionRepo — that store holds caregiver-private
// wellness content ("I'm struggling this week") and surfacing it to a
// clinician is the exact privacy violation Phase 27.6 guards against.
//
// This test plants a distinctive marker string in services/reflectionRepo
// (via mock) and verifies that assembleVisitPrepData's output does NOT
// contain it. If a future refactor wires the caregiver-private repo into
// the visit-prep data pipeline, the marker leaks into the assembled data
// and this test fails loudly.
//
// Companion F4 source-grep pin: __tests__/app/journalSaveReflectionImportPin27_6.test.ts.
// ============================================================================

const LEAK_CANARY = 'CAREGIVER_WELLNESS_LEAK_CANARY_27_6';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Patient-facing notes store — returns null so the assembled data has no
// notes content of its own; any string that surfaces in the output must
// have come from somewhere ELSE (and the caregiver-private repo is the
// only suspect carrying the canary).
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn().mockResolvedValue(null),
  saveReflection: jest.fn(),
}));

// Caregiver-private repo — planted with the canary string. If any code path
// in visitPrepPdf imports + reads this module, the canary lands in the
// assembled output.
jest.mock('../../services/reflectionRepo', () => ({
  getReflection: jest.fn().mockResolvedValue({
    date: '2026-04-15',
    mood: 'rough',
    text: LEAK_CANARY,
    savedAt: '2026-04-15T10:00:00Z',
  }),
  getReflections: jest.fn().mockResolvedValue([
    {
      date: '2026-04-15',
      mood: 'rough',
      text: LEAK_CANARY,
      savedAt: '2026-04-15T10:00:00Z',
    },
  ]),
  saveReflection: jest.fn(),
}));

// Standard mocks copied from __tests__/services/visitPrepPdf.test.ts so
// assembleVisitPrepData runs to completion with empty fixtures.
jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn().mockResolvedValue([]),
  listLogsInRange: jest.fn().mockResolvedValue([]),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../services/symptomChangeDetection', () => ({
  detectSymptomChanges: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/functionalIssueExtraction', () => ({
  extractFunctionalIssues: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/patientQuestionsRepo', () => ({
  listQuestions: jest.fn().mockResolvedValue([]),
  clearQuestions: jest.fn(),
}));
jest.mock('../../services/medicationChangeTracking', () => ({
  listMedicationChanges: jest.fn().mockResolvedValue([]),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  assembleVisitPrepData,
  VisitPrepConfig,
} from '../../services/visitPrepPdf';

const BASE_CONFIG: VisitPrepConfig = {
  dateRange: { start: '2026-04-10', end: '2026-04-24' },
  includeMeds: true,
  includeVitals: true,
  includeWellness: true,
  includeJournal: true,
  includeQuestions: false,
  questions: '',
  patientName: 'Mom',
  caregiverName: 'Amber',
};

describe('Phase 27.6 F1 — caregiver-private wellness MUST NOT leak into Visit Prep', () => {
  it('behavioral pin: planted caregiver-private marker does NOT appear in assembled Visit Prep data', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    // Stringify the entire assembled payload — any field that carries
    // the canary fails the test. Covers selectedNotes, journalHighlights,
    // and any future field that might hoover up the wrong source.
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(LEAK_CANARY);
  });

  it('source pin: services/visitPrepPdf.ts does NOT import from services/reflectionRepo', () => {
    // Belt + suspenders. The behavioral pin catches dynamic / late-bound
    // reads; this catches the literal regression case (someone adding a
    // top-level import). Both fail loudly if the boundary breaks.
    const src = readFileSync(
      join(__dirname, '../..', 'services/visitPrepPdf.ts'),
      'utf8',
    );
    expect(src).not.toMatch(
      /from\s*['"][^'"]*services\/reflectionRepo['"]/,
    );
  });
});
