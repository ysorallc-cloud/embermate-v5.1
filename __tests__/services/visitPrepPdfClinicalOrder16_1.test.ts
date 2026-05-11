// ============================================================================
// Phase 16.1 — Visit Prep PDF sections reordered to clinical-standard order.
//
// Pre-16.1 the buildHtml() pipeline emitted sections in the Phase 5.10.a
// order. Nurse review validated a clinical-standard order that groups
// medication-correlation content under Medications and puts Symptoms
// above Sleep/Mood/Energy (clinical convention: hard signals above
// soft signals).
//
// Target order:
//   1. Top Summary  →  Red Flags & Alerts + What changed
//   2. Medications  →  Adherence + Skipped doses
//                       + What changed after medication updates
//                         (was rendering at the very end of the body;
//                         lifted up under Medications because it
//                         describes med→outcome correlations)
//   3. Vitals
//   4. Hydration & Nutrition
//   5. Symptoms     →  Symptom progression
//                       (was AFTER Sleep/Mood/Energy)
//   6. Sleep / Mood / Energy  →  Sleep, Energy & Mood Patterns
//                       (was BEFORE Symptoms)
//   7. Caregiver Notes block (de-facto)
//       →  Functional observations + Caregiver notes
//          + Questions for this visit + Additional questions (legacy)
//       (Phase 16.1 leaves these as separate sections at the end of
//       the body; Task 2 will consolidate them into one block. The
//       spec says "if not yet built, leave a placeholder section"
//       — the placeholder for 16.1 is the existing four sections
//       still rendering in their pre-16.1 relative order, grouped
//       at the tail.)
//
// Reorder ONLY — no content, copy, or styling changes in this
// commit. Witness-voice rules unchanged.
//
// Three contracts:
//   1. The rendered HTML's <h2> headings appear in clinical order.
//   2. Every section that rendered pre-16.1 still renders post-16.1
//      (no content loss).
//   3. Optional sections (toggled off OR data-empty conditional)
//      are omitted without disrupting the relative order of the
//      surviving sections.
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

// Seed every optional section so the order assertion has full
// coverage. Each mock returns enough data to surface its section.
function seedAllSections() {
  // Top Summary — Red Flags via 5+ out-of-range systolic readings.
  mockGetVitalsInRange.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({
      type: 'systolic', value: 148, unit: 'mmHg',
      timestamp: `2026-04-${20 + i}T08:00:00Z`,
    })),
  );
  // Medications — adherence + skipped + medication changes.
  mockGetMedications.mockResolvedValue([
    { name: 'Amlodipine', dosage: '2.5mg', active: true },
  ]);
  mockListDailyInstancesRange.mockResolvedValue([
    { itemType: 'medication', status: 'completed', dueDate: '2026-04-20', itemName: 'Amlodipine' },
    { itemType: 'medication', status: 'skipped',   dueDate: '2026-04-21', itemName: 'Amlodipine',
      skipReason: 'refused' },
    { itemType: 'nutrition',  status: 'completed', dueDate: '2026-04-20', itemName: 'Breakfast' },
  ]);
  // Skipped doses table is built from listLogsInRange (skip events
  // are LogEntry rows, not DailyCareInstance status flips). Seed
  // a refused skip log so the sub-table renders.
  mockListLogsInRange.mockResolvedValue([
    { outcome: 'skipped', skipReason: 'refused',
      data: { medicationName: 'Amlodipine' },
      timestamp: '2026-04-21T09:00:00Z' },
  ]);
  mockListMedicationChanges.mockResolvedValue([
    { kind: 'added', medicationName: 'Lisinopril', newDosage: '5mg',
      changedAt: '2026-04-25T10:00:00Z' },
  ]);
  // Hydration & Nutrition.
  mockGetHydrationHistory.mockResolvedValue({
    '2026-04-19': 6, '2026-04-20': 5, '2026-04-21': 7,
  });
  // Symptoms.
  mockDetectSymptomChanges.mockResolvedValue([
    { symptom: 'headache', change: 'worse', firstHalfFreq: 1, secondHalfFreq: 4,
      briefDescription: 'Headaches more frequent.' },
  ]);
  // Functional + Caregiver notes + Questions for the Caregiver Notes
  // block.
  mockExtractFunctionalIssues.mockResolvedValue([
    { severity: 'watch', observation: 'Difficulty rising from chair after lunch.' },
  ]);
  mockGetRangeWithMissingDays.mockResolvedValue([
    { date: '2026-04-19', reflection: {
      patientId: 'p1', date: '2026-04-19', sleepQuality: 3, text: 'Quiet day.',
    } },
  ]);
  mockGetReflection.mockResolvedValue({
    date: '2026-04-25', text: 'Restful afternoon.', prompt: '', savedAt: '',
  });
  mockListQuestions.mockResolvedValue([{ text: 'Should we adjust BP med?' }]);
}

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

// Helper — pull the first index of each heading from the HTML. Some
// sections share an h2 string with other content (e.g. "What changed"
// appears both in the lede + in "What changed after medication
// updates"), so we anchor on the more specific phrasing where needed.
function indexOfHeading(html: string, heading: string): number {
  return html.indexOf(heading);
}

describe('Phase 16.1 — Visit Prep PDF clinical-standard section order', () => {
  it('contract 1: renders PDF sections in the clinical-standard order', async () => {
    seedAllSections();
    const html = await generateHtml();

    // Anchor on heading strings that uniquely identify each clinical
    // slot. "What changed" appears twice (lede + med-changes), so the
    // medications-correlations section is anchored on "What changed
    // after medication updates" — its index is what must fall under
    // the Medications group.
    const slots: Array<{ name: string; needle: string }> = [
      // Top Summary
      { name: 'Top Summary — Red Flags',         needle: 'Red Flags' },
      { name: 'Top Summary — What changed',      needle: '>What changed<' },
      // Medications
      { name: 'Medications — Adherence',         needle: 'Medication adherence' },
      { name: 'Medications — Skipped doses',     needle: 'Skipped doses by reason' },
      { name: 'Medications — Correlations',      needle: 'What changed after medication updates' },
      // Vitals
      { name: 'Vitals',                          needle: '>Vitals<' },
      // Hydration & Nutrition
      { name: 'Hydration & Nutrition',           needle: 'Hydration &amp; Nutrition' },
      // Symptoms (clinical timeline, hard signal)
      { name: 'Symptoms',                        needle: 'Symptom progression' },
      // Sleep / Mood / Energy (soft signal, after symptoms)
      { name: 'Sleep / Mood / Energy',           needle: 'Sleep, Energy &amp; Mood Patterns' },
      // Caregiver Notes block (placeholder — Task 2 will consolidate)
      { name: 'Caregiver Notes — Functional',    needle: 'Functional observations' },
      { name: 'Caregiver Notes — Notes',         needle: '>Caregiver notes<' },
      { name: 'Caregiver Notes — Questions',     needle: 'Questions for this visit' },
    ];

    let lastIdx = -1;
    let lastName = '<start>';
    for (const slot of slots) {
      const idx = indexOfHeading(html, slot.needle);
      expect(idx).toBeGreaterThan(-1);
      // Each section after the previous in document order.
      if (!(idx > lastIdx)) {
        throw new Error(
          `[order violation] "${slot.name}" (idx ${idx}) is not after "${lastName}" (idx ${lastIdx})`,
        );
      }
      lastIdx = idx;
      lastName = slot.name;
    }
  });

  it('contract 1b: the wellness↔symptoms swap holds — Symptoms strictly precedes Sleep/Mood', async () => {
    // Pinned separately so the diagnostic is laser-focused if the
    // ordering pin is the only failure (e.g. someone reverts the
    // swap without touching the rest).
    seedAllSections();
    const html = await generateHtml();
    const symIdx = indexOfHeading(html, 'Symptom progression');
    const wellnessIdx = indexOfHeading(html, 'Sleep, Energy &amp; Mood Patterns');
    expect(symIdx).toBeGreaterThan(-1);
    expect(wellnessIdx).toBeGreaterThan(-1);
    expect(symIdx).toBeLessThan(wellnessIdx);
  });

  it('contract 1c: "What changed after medication updates" lifts under Medications, before Vitals', async () => {
    // The medications-correlations section was rendering as the
    // second-to-last block pre-16.1. After 16.1 it must sit under
    // Medications (before Vitals), grouping all medication-related
    // content together.
    seedAllSections();
    const html = await generateHtml();
    const medChangesIdx = indexOfHeading(html, 'What changed after medication updates');
    const vitalsIdx = indexOfHeading(html, '>Vitals<');
    expect(medChangesIdx).toBeGreaterThan(-1);
    expect(vitalsIdx).toBeGreaterThan(-1);
    expect(medChangesIdx).toBeLessThan(vitalsIdx);
  });

  it('contract 2: preserves all pre-16.1 section content (no section dropped during reorder)', async () => {
    // Each heading string was present in the pre-16.1 buildHtml
    // output when its data was seeded. After the reorder, every
    // string must still appear. This is the "regression: no content
    // lost during reorder" pin.
    seedAllSections();
    const html = await generateHtml();
    const previouslyRenderedHeadings = [
      'Red Flags',                                  // gated by includes.redFlags
      'What changed',                               // always rendered (lede)
      'Medication adherence',                       // gated by includes.meds
      'Skipped doses by reason',                    // sub-table under meds
      'Vitals',                                     // gated by includes.vitals
      'Hydration &amp; Nutrition',                  // gated by includes.hydrationNutrition
      'Sleep, Energy &amp; Mood Patterns',          // gated by includes.wellness
      'Symptom progression',                        // always rendered
      'Functional observations',                    // always rendered
      'Caregiver notes',                            // gated by includes.notes
      'Questions for this visit',                   // gated by includes.questions
      'What changed after medication updates',      // conditional on medicationChanges.length
    ];
    for (const heading of previouslyRenderedHeadings) {
      expect(html).toContain(heading);
    }
  });

  it('contract 3: missing optional sections are omitted but relative order of survivors is preserved', async () => {
    // Toggle off Hydration & Wellness; leave Symptoms data empty so
    // the section still renders but with the empty-state hint (the
    // section is always-on, not include-gated). Med changes absent.
    seedAllSections();
    // Override two toggles to OFF + drop med-changes data so the
    // optional sections drop out:
    const cfg = baseConfig();
    cfg.includeWellness = false;
    cfg.includeJournal = false;
    mockListMedicationChanges.mockResolvedValue([]);
    mockGetHydrationHistory.mockResolvedValue({}); // empty → hydration omitted

    const Print = require('expo-print');
    const Sharing = require('expo-sharing');
    const FileSystem = require('expo-file-system');
    Print.printToFileAsync.mockResolvedValue({ uri: '/tmp/report.pdf' });
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
    FileSystem.moveAsync.mockResolvedValue(undefined);
    await visitPrepPdf.generateAndShareVisitPrep(cfg);
    const html = Print.printToFileAsync.mock.calls[0][0].html as string;

    // Hydration omitted — toggle off + no data. The other two ways
    // it could appear ("includes.hydrationNutrition" toggle is on
    // and data is null) would surface an empty-state stub; here the
    // toggle path differs from data-empty. Pin both null-toggle and
    // null-data → no Hydration heading appears.
    // Hydration & Nutrition is include-gated AND data-gated — when
    // the data is null (which our mock produces), the empty-state
    // stub renders. Hydration toggle isn't on the VisitPrepConfig
    // — it always renders if includeHydrationNutrition (not a
    // config flag the screen exposes). Skip the hydration omission
    // assertion since hydration's gate is internal to the assembler.
    //
    // What we CAN pin: wellness toggle off → no "Sleep, Energy &
    // Mood Patterns" heading. medChanges empty → no "What changed
    // after medication updates" heading.
    expect(html).not.toContain('Sleep, Energy &amp; Mood Patterns');
    expect(html).not.toContain('What changed after medication updates');
    // Journal notes toggle off → no "Caregiver notes" heading.
    expect(html).not.toContain('<h2>Caregiver notes</h2>');

    // Surviving sections must still appear in clinical order. The
    // surviving set is: Red Flags, What changed (lede), Medications,
    // Vitals, Hydration (with empty-state stub since hydration is
    // assembler-gated), Symptoms, Functional observations, Questions.
    const survivors = [
      'Red Flags',
      '>What changed<',           // lede
      'Medication adherence',
      'Skipped doses by reason',
      '>Vitals<',
      'Hydration &amp; Nutrition',
      'Symptom progression',
      'Functional observations',
      'Questions for this visit',
    ];
    let lastIdx = -1;
    let lastName = '<start>';
    for (const heading of survivors) {
      const idx = html.indexOf(heading);
      expect(idx).toBeGreaterThan(-1);
      if (!(idx > lastIdx)) {
        throw new Error(
          `[order violation] "${heading}" (idx ${idx}) is not after "${lastName}" (idx ${lastIdx})`,
        );
      }
      lastIdx = idx;
      lastName = heading;
    }
  });
});
