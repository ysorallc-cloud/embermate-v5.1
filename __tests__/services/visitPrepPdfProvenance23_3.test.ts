// ============================================================================
// Phase 23.3 — Visit Prep PDF cover provenance line.
//
// Adds a single one-line provenance statement between the existing subtitle
// row and the first content section on the PDF cover, so a clinician
// reading cold knows what the document is (caregiver-reported observations)
// and what it isn't (a clinical record) BEFORE they reach the first
// clinical content (Red Flags & Alerts or What changed).
//
// The exact line: "Caregiver-reported observations · Not a clinical record"
//
// Four pinned contracts:
//   1. Presence — the literal line appears in the rendered HTML.
//   2. Position vs subtitle — the provenance line renders AFTER the
//      `<div class="subtitle">` block (so it reads as a quiet second
//      cover row, not above the dateRange / preparedBy line).
//   3. Position vs first content — the provenance line renders BEFORE
//      the first `<h2>` heading (so the clinician calibrates the
//      document BEFORE the first clinical signal).
//   4. CSS pin — the `.provenance` style rule is present in the head
//      so a future change can't drop the style block and silently
//      un-style the line (size / color / italics matter for the read).
// ============================================================================

const mockGetMedications = jest.fn();
const mockGetVitalsInRange = jest.fn();
const mockListDailyInstancesRange = jest.fn();
const mockGetReflection = jest.fn();
const mockListLogsInRange = jest.fn();
const mockListQuestions = jest.fn();
const mockClearQuestions = jest.fn();
const mockDetectSymptomChanges = jest.fn();
const mockExtractFunctionalIssues = jest.fn();
const mockListMedicationChanges = jest.fn();
const mockGetVisitPrepDraft = jest.fn();
const mockGetHydrationHistory = jest.fn();
const mockGetEventsByDateRange = jest.fn();
const mockGetRangeWithMissingDays = jest.fn();

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: (...a: any[]) => mockGetMedications(...a),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: (...a: any[]) => mockGetVitalsInRange(...a),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...a: any[]) => mockListDailyInstancesRange(...a),
  listLogsInRange: (...a: any[]) => mockListLogsInRange(...a),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: (...a: any[]) => mockGetReflection(...a),
}));
jest.mock('../../services/symptomChangeDetection', () => ({
  detectSymptomChanges: (...a: any[]) => mockDetectSymptomChanges(...a),
}));
jest.mock('../../services/functionalIssueExtraction', () => ({
  extractFunctionalIssues: (...a: any[]) => mockExtractFunctionalIssues(...a),
}));
jest.mock('../../services/patientQuestionsRepo', () => ({
  listQuestions: (...a: any[]) => mockListQuestions(...a),
  clearQuestions: (...a: any[]) => mockClearQuestions(...a),
}));
jest.mock('../../services/medicationChangeTracking', () => ({
  listMedicationChanges: (...a: any[]) => mockListMedicationChanges(...a),
}));
jest.mock('../../storage/visitPrepDraftRepo', () => ({
  getVisitPrepDraft: (...a: any[]) => mockGetVisitPrepDraft(...a),
  saveVisitPrepDraft: jest.fn(),
}));
jest.mock('../../storage/hydrationRepo', () => ({
  getHistory: (...a: any[]) => mockGetHydrationHistory(...a),
}));
jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: (...a: any[]) => mockGetEventsByDateRange(...a),
}));
jest.mock('../../storage/dailyReflectionRepo', () => ({
  getRangeWithMissingDays: (...a: any[]) => mockGetRangeWithMissingDays(...a),
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  moveAsync: jest.fn(),
}));

const visitPrepPdf = require('../../services/visitPrepPdf');
import { VisitPrepConfig } from '../../services/visitPrepPdf';

function baseConfig(): VisitPrepConfig {
  return {
    dateRange: { start: '2026-04-19', end: '2026-05-03' },
    includeMeds: true,
    includeVitals: true,
    includeWellness: true,
    includeJournal: true,
    includeQuestions: true,
    questions: '',
    patientName: 'Mom',
    caregiverName: 'Sarah',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMedications.mockResolvedValue([]);
  mockGetVitalsInRange.mockResolvedValue([]);
  mockListDailyInstancesRange.mockResolvedValue([]);
  mockGetReflection.mockResolvedValue(null);
  mockListLogsInRange.mockResolvedValue([]);
  mockListQuestions.mockResolvedValue([]);
  mockClearQuestions.mockResolvedValue(undefined);
  mockDetectSymptomChanges.mockResolvedValue([]);
  mockExtractFunctionalIssues.mockResolvedValue([]);
  mockListMedicationChanges.mockResolvedValue([]);
  mockGetVisitPrepDraft.mockResolvedValue(null);
  mockGetHydrationHistory.mockResolvedValue({});
  mockGetEventsByDateRange.mockResolvedValue([]);
  mockGetRangeWithMissingDays.mockResolvedValue([]);
});

async function generateHtml(): Promise<string> {
  const Print = require('expo-print');
  const Sharing = require('expo-sharing');
  const FileSystem = require('expo-file-system');
  Print.printToFileAsync.mockResolvedValue({ uri: '/tmp/report.pdf' });
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue(undefined);
  FileSystem.moveAsync.mockResolvedValue(undefined);
  await visitPrepPdf.generateAndShareVisitPrep(baseConfig());
  return Print.printToFileAsync.mock.calls[0][0].html as string;
}

const PROVENANCE_LINE = 'Caregiver-reported observations · Not a clinical record';

describe('Phase 23.3 — Visit Prep PDF cover provenance line', () => {
  it('contract 1: the literal provenance line is present in the rendered HTML', async () => {
    const html = await generateHtml();
    expect(html).toContain(PROVENANCE_LINE);
  });

  it('contract 2: provenance renders AFTER the existing subtitle row (quiet second cover line)', async () => {
    const html = await generateHtml();
    const subtitleIdx = html.indexOf('<div class="subtitle">');
    const provenanceIdx = html.indexOf(PROVENANCE_LINE);
    expect(subtitleIdx).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeGreaterThan(subtitleIdx);
  });

  it('contract 3: provenance renders BEFORE the first clinical <h2> (calibrates before content)', async () => {
    const html = await generateHtml();
    // The first <h2> in the rendered body is either the Red Flags eyebrow
    // (inside the callout) when redFlags is on (default), or "What changed"
    // when redFlags is off. Both are clinical content — the provenance line
    // must sit before either.
    const provenanceIdx = html.indexOf(PROVENANCE_LINE);
    // Anchor on the first <h2> AFTER the <body> tag (the head's CSS
    // selector "h2 { ... }" is a style rule, not a heading).
    const bodyIdx = html.indexOf('<body>');
    expect(bodyIdx).toBeGreaterThan(-1);
    const firstH2Idx = html.indexOf('<h2', bodyIdx);
    expect(firstH2Idx).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeGreaterThan(-1);
    expect(provenanceIdx).toBeLessThan(firstH2Idx);
  });

  it('contract 4: the .provenance CSS rule is present in the style block', async () => {
    const html = await generateHtml();
    // Anchor on the selector + at least one of the visual properties so a
    // future refactor can't drop the style block (which would render the
    // line at default body-text weight and compete with the title).
    expect(html).toMatch(/\.provenance\s*\{[^}]*font-style:\s*italic[^}]*\}/);
    expect(html).toMatch(/\.provenance\s*\{[^}]*color:\s*#9a9aa8[^}]*\}/);
  });
});
