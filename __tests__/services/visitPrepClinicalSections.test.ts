// ============================================================================
// Phase 5.10.a — Visit Prep clinical sections integration.
//
// Asserts that the assembled VisitPrepData carries the new Phase 5.10.a
// fields (redFlags, hydrationNutrition, wellnessPatterns) and that the
// rendered HTML includes them in the new section order.
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
// Wave-1 Fix #2 — vitals now read from the CANONICAL store (B) via
// vitalsCanonical. Same VitalReading[] fixtures; only the mocked function moves.
jest.mock('../../utils/vitalsCanonical', () => ({
  getCanonicalVitalReadingsInRange: (...a: any[]) => mockGetVitalsInRange(...a),
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

import {
  assembleVisitPrepData,
  VisitPrepConfig,
} from '../../services/visitPrepPdf';

const visitPrepPdf = require('../../services/visitPrepPdf');

function baseConfig(): VisitPrepConfig {
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

describe('Phase 5.10.a — Red Flags & Alerts', () => {
  it('does NOT raise a vitals threshold verdict, even with 5+ out-of-range BP readings (Gate D)', async () => {
    // Pre-v1 this produced a "Systolic BP: 5 readings outside the usual range."
    // critical callout — a fixed-cutoff clinical claim on the most prominent
    // provider-facing surface. That branch was removed; out-of-range vitals
    // alone now surface no red flag. Per-person deviation is a v1.1 concern.
    mockGetVitalsInRange.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'systolic', value: 148, unit: 'mmHg',
        timestamp: `2026-04-${20 + i}T08:00:00Z`,
      })),
    ]);
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.redFlags.some((f) => /Systolic BP/.test(f.text))).toBe(false);
    expect(data.redFlags.some((f) => /out of range|outside the usual range/i.test(f.text))).toBe(false);
  });

  it('omits the callout entirely when no flags surface', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.redFlags).toEqual([]);
  });
});

describe('Phase 5.10.a — Hydration & Nutrition', () => {
  it('renders hydration data when only hydration is tracked', async () => {
    mockGetHydrationHistory.mockResolvedValue({
      '2026-04-19': 6, '2026-04-20': 5, '2026-04-21': 7,
    });
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.hydrationNutrition).not.toBeNull();
    expect(data.hydrationNutrition!.hydration).not.toBeNull();
    expect(data.hydrationNutrition!.hydration!.target).toBe(8);
    expect(data.hydrationNutrition!.meals).toBeNull();
  });

  it('omits the section entirely when neither hydration nor meals tracked', async () => {
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.hydrationNutrition).toBeNull();
  });
});

describe('Phase 5.10.a — Sleep, Energy & Mood Patterns', () => {
  it('shows comparison to prior period when both windows have sleep data', async () => {
    mockGetRangeWithMissingDays.mockImplementation(
      async (_pid: string, start: string) => {
        if (start === '2026-04-19') {
          return Array.from({ length: 15 }, (_, i) => ({
            date: `2026-04-${19 + i}`,
            reflection: { patientId: 'p1', date: `2026-04-${19 + i}`, sleepQuality: 3 },
          }));
        }
        return Array.from({ length: 15 }, (_, i) => ({
          date: `2026-04-${4 + i}`,
          reflection: { patientId: 'p1', date: `2026-04-${4 + i}`, sleepQuality: 4 },
        }));
      },
    );
    const data = await assembleVisitPrepData(baseConfig());
    expect(data.wellnessPatterns.sleep).not.toBeNull();
    expect(data.wellnessPatterns.sleep!.avgQuality).toBeCloseTo(3, 1);
    expect(data.wellnessPatterns.sleep!.priorAvg).toBeCloseTo(4, 1);
  });
});

describe('Phase 5.10.a — Section order in rendered HTML', () => {
  // We invoke the full pipeline and read the printed HTML out of the
  // expo-print mock — the expo-print mock captures the HTML argument.
  const Print = require('expo-print');
  const Sharing = require('expo-sharing');
  const FileSystem = require('expo-file-system');

  // Phase 16.1 — the Phase 5.10.a section order was revised to a
  // clinical-standard order validated against nurse input. Two moves:
  //   • Wellness (Sleep/Mood/Energy) ↔ Symptom progression swap.
  //     Symptoms (clinical hard signal) precedes Sleep/Mood (soft
  //     signal) in the new layout.
  //   • "What changed after medication updates" lifts from the end
  //     of the body to right after the medications adherence/skipped
  //     block, grouping all medication-related content together.
  // The sectionOrder array below is updated to match. A dedicated
  // 16.1 test file (visitPrepPdfClinicalOrder16_1.test.ts) carries
  // the broader contracts (content preservation + missing-section
  // graceful handling).
  it('emits sections in the Phase 16.1 clinical-standard order (was Phase 5.10.a)', async () => {
    Print.printToFileAsync.mockResolvedValue({ uri: '/tmp/report.pdf' });
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
    FileSystem.moveAsync.mockResolvedValue(undefined);

    // Seed flags + hydration + meds + symptom + notes so every section
    // gets a chance to render.
    mockGetMedications.mockResolvedValue([
      { name: 'Amlodipine', dosage: '2.5mg', active: true },
    ]);
    mockListDailyInstancesRange.mockResolvedValue([
      { itemType: 'medication', status: 'completed', dueDate: '2026-04-20', itemName: 'Amlodipine' },
      { itemType: 'nutrition', status: 'completed', dueDate: '2026-04-20', itemName: 'Breakfast' },
    ]);
    mockGetVitalsInRange.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'systolic', value: 148, unit: 'mmHg',
        timestamp: `2026-04-${20 + i}T08:00:00Z`,
      })),
    ]);
    mockGetHydrationHistory.mockResolvedValue({
      '2026-04-19': 6, '2026-04-20': 5,
    });
    mockGetRangeWithMissingDays.mockResolvedValue([
      { date: '2026-04-19', reflection: { patientId: 'p1', date: '2026-04-19', sleepQuality: 3 } },
    ]);
    mockGetReflection.mockResolvedValue({
      date: '2026-04-25', text: 'Quiet day.', prompt: '', savedAt: '',
    });
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'Headaches more frequent.' },
    ]);
    mockListQuestions.mockResolvedValue([{ text: 'Should we adjust BP med?' }]);

    await visitPrepPdf.generateAndShareVisitPrep(baseConfig());

    expect(Print.printToFileAsync).toHaveBeenCalled();
    const html = Print.printToFileAsync.mock.calls[0][0].html as string;

    const sectionOrder = [
      'Red Flags',
      'What changed',
      'Medication adherence',
      'Vitals',
      'Hydration &amp; Nutrition',
      // Phase 16.1 — swapped relative to Phase 5.10.a:
      // Symptoms now precedes Sleep, Energy & Mood Patterns.
      'Symptom progression',
      'Sleep, Energy &amp; Mood Patterns',
      'Functional observations',
      'Caregiver notes',
      'Questions for this visit',
    ];

    let lastIdx = -1;
    for (const heading of sectionOrder) {
      const idx = html.indexOf(heading);
      expect(idx).toBeGreaterThan(lastIdx); // each section after the previous
      lastIdx = idx;
    }
  });

  it('Wellness flat label is gone (replaced by Sleep, Energy & Mood Patterns)', async () => {
    Print.printToFileAsync.mockResolvedValue({ uri: '/tmp/report.pdf' });
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
    FileSystem.moveAsync.mockResolvedValue(undefined);
    mockGetRangeWithMissingDays.mockResolvedValue([
      { date: '2026-04-19', reflection: { patientId: 'p1', date: '2026-04-19', sleepQuality: 3 } },
    ]);
    await visitPrepPdf.generateAndShareVisitPrep(baseConfig());
    const html = Print.printToFileAsync.mock.calls[0][0].html as string;
    expect(html).not.toMatch(/<h2>\s*Wellness\s*<\/h2>/);
    expect(html).toContain('Sleep, Energy &amp; Mood Patterns');
  });
});
