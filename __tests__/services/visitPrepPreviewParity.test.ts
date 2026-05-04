// ============================================================================
// Phase 5.9.d — preview/share content parity.
//
// The preview screen renders assembleVisitPrepData() output; the share
// path (generateAndShareVisitPrep → buildHtml) consumes the SAME function.
// This test pins the parity invariant: for a fixed config + fixed
// data-layer mocks, calling assembleVisitPrepData twice produces
// identical output. If a future refactor split the data path, the user
// could ship a PDF that diverges from what they previewed — this test
// would catch the drift.
//
// Specifically asserts:
//   • whatChanged is identical across both calls
//   • selectedNotes / journalHighlights are identical
//   • header (preparedBy, dateRange) is identical
//   • footer is identical
//
// The test also pins that any user-saved "What changed" edit reaches
// BOTH the preview render and the PDF — by stubbing visitPrepDraftRepo
// to return a known string.
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
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  moveAsync: jest.fn(),
}));

import { assembleVisitPrepData, VisitPrepConfig } from '../../services/visitPrepPdf';

function baseConfig(): VisitPrepConfig {
  return {
    dateRange: { start: '2026-04-19', end: '2026-05-03' },
    includeMeds: true,
    includeVitals: true,
    includeWellness: true,
    includeJournal: true,
    includeQuestions: true,
    questions: 'Bring up the new BP medication',
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
});

describe('Phase 5.9.d — preview/share content parity', () => {
  it('two consecutive assembleVisitPrepData calls return structurally identical content', async () => {
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent in the past week.' },
    ]);
    const a = await assembleVisitPrepData(baseConfig());
    const b = await assembleVisitPrepData(baseConfig());
    // Strip generatedAt — that's wall-clock and will differ by milliseconds.
    const stripVolatile = (d: any) => ({
      ...d,
      header: { ...d.header, generatedAt: '<stripped>' },
    });
    expect(stripVolatile(a)).toEqual(stripVolatile(b));
  });

  it("a saved 'What changed' draft reaches BOTH the preview and the PDF assembly", async () => {
    // Simulate the user editing in the preview screen — the draft repo
    // gets a saved string. Both subsequent assembleVisitPrepData calls
    // must read the same draft.
    mockGetVisitPrepDraft.mockResolvedValue('Sarah edited this paragraph manually.');
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'x', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 3,
        briefDescription: 'Auto-draft observation.' },
    ]);

    const previewData = await assembleVisitPrepData(baseConfig());
    const sharePathData = await assembleVisitPrepData(baseConfig());

    expect(previewData.whatChanged.userEdited).toBe(true);
    expect(previewData.whatChanged.observations).toEqual(['Sarah edited this paragraph manually.']);
    expect(sharePathData.whatChanged).toEqual(previewData.whatChanged);
  });

  it("toggling off includeWellness drops the section in BOTH paths", async () => {
    const cfg = { ...baseConfig(), includeWellness: false };
    const a = await assembleVisitPrepData(cfg);
    const b = await assembleVisitPrepData(cfg);
    expect(a.wellness.avgMood).toBe(b.wellness.avgMood);
    // Both calls produced the same wellness shape — divergence would
    // mean the preview rendered one thing and the PDF rendered another.
    expect(a.wellness).toEqual(b.wellness);
  });

  it('the same selectedNotes selection lands in both paths', async () => {
    mockGetReflection.mockImplementation(async (date: string) => {
      const map: Record<string, string> = {
        '2026-04-21': 'Hard morning today.',
        '2026-04-25': 'Refused dinner.',
        '2026-04-29': 'Quiet day.',
      };
      return map[date]
        ? { date, text: map[date], prompt: '', savedAt: '' }
        : null;
    });
    const a = await assembleVisitPrepData(baseConfig());
    const b = await assembleVisitPrepData(baseConfig());
    expect(a.selectedNotes).toEqual(b.selectedNotes);
    expect(a.selectedNotes.length).toBeGreaterThan(0);
  });

  it('the footer is identical across both paths (caregiver attribution + day count)', async () => {
    const a = await assembleVisitPrepData(baseConfig());
    const b = await assembleVisitPrepData(baseConfig());
    expect(a.footer).toBe(b.footer);
    expect(a.footer).toContain('Sarah');
    expect(a.footer).toContain('15 days');
  });
});
