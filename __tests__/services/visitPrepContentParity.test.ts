// ============================================================================
// Phase 5.8.b — Visit Prep content parity tests.
//
// Asserts the new sections that bring Visit Prep up to the reference
// output: "What changed" lede, curated notes (3 max, full text, dated),
// caregiver attribution in header + footer.
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

function baseConfig(overrides: Partial<VisitPrepConfig> = {}): VisitPrepConfig {
  return {
    dateRange: { start: '2026-04-19', end: '2026-05-03' }, // 15 days
    includeMeds: true,
    includeVitals: true,
    includeWellness: true,
    includeJournal: true,
    includeQuestions: true,
    questions: '',
    patientName: 'Mom',
    caregiverName: 'Sarah',
    ...overrides,
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

describe('Phase 5.8.b — What changed lede', () => {
  it('exposes a whatChanged field on the assembled data', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data).toHaveProperty('whatChanged');
    expect(Array.isArray(data.whatChanged.observations)).toBe(true);
  });

  it('renders 1-3 observations when symptom changes are present', async () => {
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent in the past week.' },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.whatChanged.observations.length).toBeGreaterThanOrEqual(1);
    expect(data.whatChanged.observations.length).toBeLessThanOrEqual(3);
    expect(data.whatChanged.observations.join(' ')).toMatch(/Headaches/);
    expect(data.whatChanged.insufficientData).toBe(false);
  });

  it('returns deferred message when window is under 7 days', async () => {
    const data = await assembleVisitPrepData(baseConfig({
      dateRange: { start: '2026-05-01', end: '2026-05-03' }, // 3 days
    }));
    expect(data.whatChanged.insufficientData).toBe(true);
    expect(data.whatChanged.observations[0]).toMatch(
      /two weeks of tracking suggested/i,
    );
  });

  it('user-edited draft from visitPrepDraftRepo wins over auto-draft', async () => {
    mockGetVisitPrepDraft.mockResolvedValue('Sarah edited this manually.');
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'x', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 3,
        briefDescription: 'X worsened (auto-draft).' },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.whatChanged.observations.length).toBe(1);
    expect(data.whatChanged.observations[0]).toBe('Sarah edited this manually.');
    expect(data.whatChanged.userEdited).toBe(true);
  });

  it('userEdited is false when no draft has been saved', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.whatChanged.userEdited).toBe(false);
  });
});

describe('Phase 5.8.b — Curated notes', () => {
  it('selects up to 3 notes, flagged-keyword first', async () => {
    // 5 daily reflections, 2 with flag keywords ("hard", "refused").
    mockGetReflection.mockImplementation(async (date: string) => {
      const map: Record<string, string> = {
        '2026-04-19': 'Quiet day.',
        '2026-04-21': "Mom said today felt hard.",
        '2026-04-23': 'Quiet day.',
        '2026-04-25': 'Refused her morning meds twice.',
        '2026-04-27': 'Quiet day.',
        '2026-04-29': 'Quiet day.',
        '2026-05-01': 'Quiet day.',
        '2026-05-03': 'Quiet day.',
      };
      return map[date]
        ? { date, text: map[date], prompt: '', savedAt: '' }
        : null;
    });
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.selectedNotes.length).toBeLessThanOrEqual(3);
    const flaggedCount = data.selectedNotes.filter(
      (n: any) => n.flagged === true,
    ).length;
    expect(flaggedCount).toBeGreaterThanOrEqual(2); // both flagged notes picked
  });

  it('renders full note text — no truncation', async () => {
    const longText = 'A'.repeat(300);
    mockGetReflection.mockImplementation(async (date: string) =>
      date === '2026-04-25'
        ? { date, text: longText, prompt: '', savedAt: '' }
        : null,
    );
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.selectedNotes.length).toBe(1);
    expect(data.selectedNotes[0].text).toBe(longText);
    expect(data.selectedNotes[0].text).not.toContain('...');
  });

  it('renders all available notes when fewer than 3 exist (no fabrication)', async () => {
    mockGetReflection.mockImplementation(async (date: string) =>
      date === '2026-04-25'
        ? { date, text: 'The only note in the window.', prompt: '', savedAt: '' }
        : null,
    );
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.selectedNotes.length).toBe(1);
    expect(data.selectedNotes[0].text).toBe('The only note in the window.');
  });
});

describe('Phase 5.8.b — Caregiver attribution', () => {
  it('header carries Prepared by <caregiverName>', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.header.preparedBy).toBe('Sarah');
  });

  it('footer carries the new "kept by … over N days" copy', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.footer).toMatch(/kept by Sarah over 15 days/i);
    expect(data.footer).toMatch(/not a clinical record/i);
    expect(data.footer).toMatch(/cross-reference with medical history/i);
    expect(data.footer).toMatch(/EmberMate/);
  });

  it('throws ProfileMissingError when caregiverName is empty', async () => {
    await expect(
      assembleVisitPrepData(baseConfig({ caregiverName: '' })),
    ).rejects.toThrow(/caregiver|profile/i);
  });

  it('throws ProfileMissingError when caregiverName is undefined', async () => {
    await expect(
      assembleVisitPrepData(baseConfig({ caregiverName: undefined })),
    ).rejects.toThrow(/caregiver|profile/i);
  });
});
