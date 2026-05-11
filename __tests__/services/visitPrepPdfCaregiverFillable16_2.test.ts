// ============================================================================
// Phase 16.2 — Visit Prep PDF integration: caregiver-fillable block.
//
// The 4 caregiver-fillable categories (3 symptoms / 3 functional /
// 3 questions / daily activities) render in the Caregiver Notes
// section of the PDF (section 7 per Task 1's clinical-standard
// order). Spec rules pinned here:
//
//   • Filled values render as bulleted entries under labeled
//     sub-sections (one sub-section per category, when at least one
//     field in the category is filled).
//   • Empty fields are omitted from the PDF (never rendered as
//     empty bullets).
//   • Categories where all 3 fields are empty produce no sub-section.
//   • The daily-activities response renders as its own labeled
//     sub-section ("Help provided this week"), NOT commingled with
//     the symptom/functional/question categories.
//   • Within a filled category, bullets render in caregiver entry
//     order (index 0 first, index 2 last).
//   • Sub-sections live inside the Caregiver Notes section of the
//     PDF (after Sleep/Mood/Energy, before the footer — matching the
//     16.1 clinical-standard order).
//   • The block is wired ONLY when appointmentId is in the
//     VisitPrepConfig. Absence of appointmentId → no caregiver
//     sub-sections render. Pins the caregiver-driven coupling.
//   • No auto-population from logs/insights — the block reads only
//     from the caregiver-notes repo, not from any data aggregator.
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
const mockGetCaregiverNotes = jest.fn();

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
jest.mock('../../storage/visitPrepCaregiverNotesRepo', () => {
  const EMPTY = {
    symptomsChanged: ['', '', ''],
    functionalChanges: ['', '', ''],
    questionsForProvider: ['', '', ''],
    helpProvidedThisWeek: '',
  };
  return {
    EMPTY_CAREGIVER_NOTES: EMPTY,
    getCaregiverNotes: (...a: any[]) => mockGetCaregiverNotes(...a),
    saveCaregiverNotes: jest.fn(),
  };
});
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

function baseConfig(overrides: Partial<VisitPrepConfig> = {}): VisitPrepConfig {
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
  mockGetHydrationHistory.mockResolvedValue({});
  mockGetEventsByDateRange.mockResolvedValue([]);
  mockGetRangeWithMissingDays.mockResolvedValue([]);
  // Default: no caregiver notes saved.
  mockGetCaregiverNotes.mockResolvedValue({
    symptomsChanged: ['', '', ''],
    functionalChanges: ['', '', ''],
    questionsForProvider: ['', '', ''],
    helpProvidedThisWeek: '',
  });
});

async function generateHtml(config: VisitPrepConfig): Promise<string> {
  const Print = require('expo-print');
  const Sharing = require('expo-sharing');
  const FileSystem = require('expo-file-system');
  Print.printToFileAsync.mockResolvedValue({ uri: '/tmp/report.pdf' });
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue(undefined);
  FileSystem.moveAsync.mockResolvedValue(undefined);
  await visitPrepPdf.generateAndShareVisitPrep(config);
  return Print.printToFileAsync.mock.calls[0][0].html as string;
}

describe('Phase 16.2 — Caregiver-fillable block in Visit Prep PDF', () => {
  it('contract 1: renders filled values in entry order, omits empty fields', async () => {
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['Headache more frequent', '', 'Appetite down'],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['Should we adjust BP med?', '', ''],
      helpProvidedThisWeek: '',
    });
    const html = await generateHtml(baseConfig({ appointmentId: 'appt-test' }));

    // Filled symptoms (indices 0 and 2) appear in entry order; the
    // empty middle slot is OMITTED (no empty bullet).
    const symptomA = html.indexOf('Headache more frequent');
    const symptomC = html.indexOf('Appetite down');
    expect(symptomA).toBeGreaterThan(-1);
    expect(symptomC).toBeGreaterThan(-1);
    expect(symptomA).toBeLessThan(symptomC);

    // Empty functional category → no sub-section heading.
    expect(html).not.toMatch(/Functional changes \(caregiver/i);

    // Filled question (only index 0) appears once.
    const qMatches = html.match(/Should we adjust BP med\?/g) || [];
    expect(qMatches.length).toBe(1);

    // No empty bullet rendered for the unfilled question slots.
    // Use a defensive check: no <li> with whitespace-only content
    // sits inside the caregiver-questions sub-section.
    expect(html).not.toMatch(/<li>\s*<\/li>/);
  });

  it('contract 2: renders daily-activities as a separate "Help provided this week" sub-section', async () => {
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek:
        'Drove to two appointments this week. Picked up groceries Tuesday and Friday.',
    });
    const html = await generateHtml(baseConfig({ appointmentId: 'appt-test' }));
    expect(html).toContain('Help provided this week');
    expect(html).toContain('Drove to two appointments this week.');
    // The daily-activities sub-section is its own label — must NOT
    // commingle with the symptoms/functional/question sub-sections.
    // It renders as a paragraph (longer-form text), not a bullet
    // under those.
    const helpIdx = html.indexOf('Help provided this week');
    expect(helpIdx).toBeGreaterThan(-1);
  });

  it('contract 3: empty categories produce no sub-section at all', async () => {
    // Only daily-activities filled — none of the 3-field categories.
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: 'Helped with bills.',
    });
    const html = await generateHtml(baseConfig({ appointmentId: 'appt-test' }));
    // None of the caregiver-curated category headings appear.
    expect(html).not.toMatch(/Symptoms changed \(caregiver/i);
    expect(html).not.toMatch(/Functional changes \(caregiver/i);
    expect(html).not.toMatch(/Questions for the provider/i);
    // Help provided still renders.
    expect(html).toContain('Help provided this week');
    expect(html).toContain('Helped with bills.');
  });

  it('contract 4: caregiver sub-sections sit inside the Caregiver Notes block (after Sleep/Mood/Energy)', async () => {
    // Seed wellness + caregiver content so order can be checked.
    mockGetRangeWithMissingDays.mockResolvedValue([
      { date: '2026-04-19', reflection: {
        patientId: 'p1', date: '2026-04-19', sleepQuality: 3,
      } },
    ]);
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['Headache more frequent', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: 'Drove to clinic.',
    });
    const html = await generateHtml(baseConfig({ appointmentId: 'appt-test' }));

    const wellnessIdx = html.indexOf('Sleep, Energy &amp; Mood Patterns');
    const caregiverSymptomsIdx = html.indexOf('Headache more frequent');
    const helpIdx = html.indexOf('Help provided this week');
    expect(wellnessIdx).toBeGreaterThan(-1);
    expect(caregiverSymptomsIdx).toBeGreaterThan(-1);
    expect(helpIdx).toBeGreaterThan(-1);
    // Both caregiver sub-sections render AFTER the Wellness section
    // (i.e. inside the Caregiver Notes block per the 16.1 order).
    expect(caregiverSymptomsIdx).toBeGreaterThan(wellnessIdx);
    expect(helpIdx).toBeGreaterThan(wellnessIdx);
  });

  it('contract 5: no caregiver content renders when appointmentId is absent from config', async () => {
    // Even if the repo has data for some appointment, omitting
    // appointmentId from the config means the assembler doesn't
    // query it. Pin caregiver-driven coupling: the data has to be
    // EXPLICITLY anchored to the visit being prepped.
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['Stale leftover', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: 'Stale help text',
    });
    const html = await generateHtml(baseConfig()); // no appointmentId
    expect(html).not.toContain('Stale leftover');
    expect(html).not.toContain('Stale help text');
    expect(mockGetCaregiverNotes).not.toHaveBeenCalled();
  });

  it('contract 6: assembler reads ONLY from the caregiver-notes repo (no auto-population)', async () => {
    // Seed every log/aggregator with data; seed caregiver-notes
    // empty. Caregiver content in the PDF must remain empty.
    mockDetectSymptomChanges.mockResolvedValue([
      { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
        briefDescription: 'App-detected: headache worsening.' },
    ]);
    mockExtractFunctionalIssues.mockResolvedValue([
      { severity: 'watch', observation: 'App-detected: difficulty rising.' },
    ]);
    mockListQuestions.mockResolvedValue([{ text: 'App-detected question?' }]);
    mockGetCaregiverNotes.mockResolvedValue({
      symptomsChanged: ['', '', ''],
      functionalChanges: ['', '', ''],
      questionsForProvider: ['', '', ''],
      helpProvidedThisWeek: '',
    });
    const html = await generateHtml(baseConfig({ appointmentId: 'appt-test' }));

    // Auto-detected content STILL renders in its own sections
    // (Symptom progression, Functional observations, Questions for
    // this visit) — Task 2 complements, doesn't replace those.
    expect(html).toContain('App-detected: headache worsening.');
    expect(html).toContain('App-detected: difficulty rising.');
    expect(html).toContain('App-detected question?');

    // But NONE of the caregiver-curated sub-sections render, because
    // the caregiver-notes repo returned all empties.
    expect(html).not.toMatch(/Symptoms changed \(caregiver/i);
    expect(html).not.toMatch(/Functional changes \(caregiver/i);
    expect(html).not.toMatch(/Questions for the provider/i);
    expect(html).not.toMatch(/Help provided this week/i);
  });
});
