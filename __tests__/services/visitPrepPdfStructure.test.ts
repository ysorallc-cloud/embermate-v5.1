// ============================================================================
// visitPrepPdf — restructured assembly contract (Prompt 5).
//
// Verifies the PDF data shape exposes the new nurse-format sections (symptoms
// changed, functional issues, questions and concerns, med changes) plus the
// caregiver disclaimer footer. The full HTML render isn't asserted here —
// just the assembled data the template consumes.
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

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: (...args: any[]) => mockGetMedications(...args),
}));

jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: (...args: any[]) => mockGetVitalsInRange(...args),
}));

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  listLogsInRange: (...args: any[]) => mockListLogsInRange(...args),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: (...args: any[]) => mockGetReflection(...args),
}));

jest.mock('../../services/patientQuestionsRepo', () => ({
  listQuestions: (...args: any[]) => mockListQuestions(...args),
  clearQuestions: (...args: any[]) => mockClearQuestions(...args),
}));

jest.mock('../../services/symptomChangeDetection', () => ({
  detectSymptomChanges: (...args: any[]) => mockDetectSymptomChanges(...args),
}));

jest.mock('../../services/functionalIssueExtraction', () => ({
  extractFunctionalIssues: (...args: any[]) => mockExtractFunctionalIssues(...args),
}));

jest.mock('../../services/medicationChangeTracking', () => ({
  listMedicationChanges: (...args: any[]) => mockListMedicationChanges(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

// expo-print / expo-sharing / expo-file-system aren't ESM-friendly under
// jest-node — stub the modules. Only assembleVisitPrepData is exercised here.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  moveAsync: jest.fn(),
}));

import { assembleVisitPrepData } from '../../services/visitPrepPdf';

const baseConfig = () => ({
  dateRange: { start: '2026-04-01', end: '2026-04-14' },
  patientName: 'Mom',
  caregiverName: 'Amber',
  includeMeds: true,
  includeVitals: true,
  includeWellness: true,
  includeJournal: true,
  includeQuestions: true,
  questions: '',
});

beforeEach(() => {
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
});

describe('assembleVisitPrepData — new sections', () => {
  it('exposes symptomChanges from detectSymptomChanges', async () => {
    mockDetectSymptomChanges.mockResolvedValue([
      {
        symptom: 'dizziness',
        change: 'new',
        firstHalfFreq: 0,
        secondHalfFreq: 3,
        briefDescription: 'dizziness reported 3 times',
      },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.symptomChanges.length).toBe(1);
    expect(data.symptomChanges[0].symptom).toBe('dizziness');
  });

  it('exposes functionalIssues from extractFunctionalIssues', async () => {
    mockExtractFunctionalIssues.mockResolvedValue([
      { category: 'mood', observation: 'Mood averaged 2/5', severity: 'concerning' },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.functionalIssues.length).toBe(1);
    expect(data.functionalIssues[0].category).toBe('mood');
  });

  it('exposes patientQuestions from patientQuestionsRepo', async () => {
    mockListQuestions.mockResolvedValue([
      { id: 'q1', text: 'Is the new dose making her dizzy?', createdAt: '', updatedAt: '' },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.patientQuestions.length).toBe(1);
    expect(data.patientQuestions[0]).toContain('dizzy');
  });

  it('exposes medicationChanges from listMedicationChanges', async () => {
    mockListMedicationChanges.mockResolvedValue([
      {
        id: 'mc1',
        kind: 'dose_changed',
        medicationId: 'med-1',
        medicationName: 'Metformin',
        previousDosage: '500mg',
        newDosage: '1000mg',
        changedAt: '2026-04-08T12:00:00.000Z',
        patientId: 'default',
      },
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.medicationChanges.length).toBe(1);
    expect(data.medicationChanges[0].medicationName).toBe('Metformin');
  });
});

describe('assembleVisitPrepData — caregiver disclaimer footer (Phase 5.8.b)', () => {
  it('includes the new attribution + clinical-record copy', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.footer.toLowerCase()).toContain('kept by');
    expect(data.footer.toLowerCase()).toContain('not a clinical record');
    expect(data.footer.toLowerCase()).toContain('cross-reference with medical history');
    expect(data.footer).toContain('EmberMate');
  });

  it('substitutes the period length (in days) into the disclaimer', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.footer).toContain('14');
  });

  it('throws ProfileMissingError when caregiverName is missing (5.8.b gating)', async () => {
    // Phase 5.8.b — caregiver name is now required for the visit-prep
    // header attribution. The visit-prep entry screen catches this and
    // surfaces the profile prompt; the assembly itself fast-fails.
    const config = { ...baseConfig(), caregiverName: undefined };
    await expect(assembleVisitPrepData(config)).rejects.toThrow(/caregiver|profile/i);
  });
});

describe('assembleVisitPrepData — questions empty-state', () => {
  it('emits the helper line when no questions exist', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.patientQuestions.length).toBe(0);
    expect(data.questionsEmptyHint).toMatch(/Care Plan.*Questions for the doctor/i);
  });
});

describe('assembleVisitPrepData — symptom insufficient-data hint', () => {
  it('flags symptomDataInsufficient when the range is < 14 days', async () => {
    const config = {
      ...baseConfig(),
      dateRange: { start: '2026-04-01', end: '2026-04-10' }, // 10 days
    };
    const data = await assembleVisitPrepData(config);
    expect(data.symptomDataInsufficient).toBe(true);
  });

  it('clears the flag for ranges of 14+ days', async () => {
    const data = await assembleVisitPrepData(baseConfig()); // 14 days
    expect(data.symptomDataInsufficient).toBe(false);
  });
});
