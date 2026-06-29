// ============================================================================
// Phase 11.6 — Visit Prep adherence populates after the medication-
// instance seed fix.
//
// Bug repro: Visit Prep card displayed "0 of 15 days logged · 0 meds ·
// 0 vitals · 0 meals · 0 notes" despite seeded sample data.
// assembleVisitPrepData reads listDailyInstancesRange filtered to
// itemType === 'medication' (visitPrepPdf.ts:272-275). Pre-fix the
// historical-instance loop in initializeSampleData skipped medications
// → no past-day medication instances → adherence array stayed empty.
//
// This file pins the consumer side: given the post-fix shape (past-day
// medication instances spanning the period, ~90% completed/skipped),
// assembleVisitPrepData populates adherence with at least one entry
// at rate > 0. The seed side is tested in
// sampleDataGenerator.medicationInstances.test.ts.
// ============================================================================

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn(),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn(),
  listLogsInRange: jest.fn(() => Promise.resolve([])),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../services/symptomChangeDetection', () => ({
  detectSymptomChanges: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/functionalIssueExtraction', () => ({
  extractFunctionalIssues: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/patientQuestionsRepo', () => ({
  listQuestions: jest.fn(() => Promise.resolve([])),
  clearQuestions: jest.fn(),
}));
jest.mock('../../services/medicationChangeTracking', () => ({
  listMedicationChanges: jest.fn(() => Promise.resolve([])),
}));

import { assembleVisitPrepData, VisitPrepConfig } from '../../services/visitPrepPdf';
import { getMedications } from '../../utils/medicationStorage';
import { listDailyInstancesRange } from '../../storage/carePlanRepo';

const mockGetMedications = getMedications as jest.MockedFunction<typeof getMedications>;
const mockListInstances = listDailyInstancesRange as jest.MockedFunction<
  typeof listDailyInstancesRange
>;

const BASE_CONFIG: VisitPrepConfig = {
  dateRange: { start: '2026-04-10', end: '2026-04-24' },
  includeMeds: true,
  includeVitals: false,
  includeWellness: false,
  includeJournal: false,
  includeQuestions: false,
  questions: '',
  patientName: 'Dad',
  caregiverName: 'Amber',
};

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function medInstance(date: string, name: string, status: 'completed' | 'skipped' | 'missed' = 'completed', id?: string): any {
  return {
    id: id ?? `inst-${name}-${date}`,
    carePlanId: 'cp1',
    carePlanItemId: `item-${name}`,
    patientId: 'default',
    date,
    scheduledTime: `${date}T08:00:00Z`,
    windowLabel: 'morning',
    windowId: 'morning',
    status,
    itemName: name,
    itemType: 'medication',
    priority: 'required',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: `${date}T08:00:00Z`,
  };
}

beforeEach(() => {
  mockGetMedications.mockReset();
  mockListInstances.mockReset();
});

describe('Phase 11.6 — Visit Prep adherence after medication-instance seed', () => {
  it('contract 6: adherence populates with at least one entry at rate > 0 (post-fix shape)', async () => {
    // Post-fix shape: 14 days of medication instances at ~90% adherence.
    // Use 2 active meds × 14 days = 28 instances.
    //
    // Wave-1 clinician convergence (LOCKED DEFINITION): a SKIPPED dose is NOT
    // adherent — only 'completed' counts. So the rates below are completed/total,
    // NOT the old (completed | skipped)/total. Warfarin = 12 completed / 14 = 86%;
    // Metformin = 13 completed / 14 = 93%. (Pre-convergence both read 100%.)
    mockGetMedications.mockResolvedValue([
      { id: 'm1', name: 'Warfarin', dosage: '5mg', time: '08:00', timeSlot: 'morning', taken: false, active: true, createdAt: '2026-01-01T00:00:00Z' } as any,
      { id: 'm2', name: 'Metformin', dosage: '500mg', time: '08:00', timeSlot: 'morning', taken: false, active: true, createdAt: '2026-01-01T00:00:00Z' } as any,
    ]);

    const instances: any[] = [];
    const startDate = new Date(`${BASE_CONFIG.dateRange.start}T00:00:00`);
    for (let day = 0; day < 14; day++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + day);
      const dateStr = ymd(d);
      // Warfarin: 12 completed + 2 skipped = ~86% completed, all acted.
      instances.push(medInstance(dateStr, 'Warfarin', day < 12 ? 'completed' : 'skipped'));
      // Metformin: 13 completed + 1 skipped.
      instances.push(medInstance(dateStr, 'Metformin', day < 13 ? 'completed' : 'skipped'));
    }
    mockListInstances.mockResolvedValue(instances);

    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.adherence.length).toBeGreaterThan(0);
    // At least one entry should report a rate > 0 — the bug surface
    // showed 0 across all medications.
    const hasNonZero = data.adherence.some((entry) => entry.rate > 0);
    expect(hasNonZero).toBe(true);
    // LOCKED DEFINITION (skipped-against): exact rates, NOT a loose range —
    // this is what stops a future regression from re-crediting skips. The 2
    // skipped Warfarin doses and 1 skipped Metformin dose drop OUT of the
    // numerator.
    const warfarin = data.adherence.find((e) => e.name === 'Warfarin');
    const metformin = data.adherence.find((e) => e.name === 'Metformin');
    expect(warfarin!.rate).toBe(86);   // 12 completed / 14
    expect(metformin!.rate).toBe(93);  // 13 completed / 14
  });

  it('contract 7: pre-fix shape (no past-day medication instances) still shows empty adherence', async () => {
    // Regression-pin the pre-fix behavior so future debugging is
    // unambiguous. With NO past-day medication instances, the
    // adherence array still gets entries (one per active med) but
    // the rate is computed against `total = matching.length || 1`,
    // i.e. divide-by-1 with 0 matched → rate 0.
    mockGetMedications.mockResolvedValue([
      { id: 'm1', name: 'Warfarin', dosage: '5mg', time: '08:00', timeSlot: 'morning', taken: false, active: true, createdAt: '2026-01-01T00:00:00Z' } as any,
    ]);
    mockListInstances.mockResolvedValue([]);

    const data = await assembleVisitPrepData(BASE_CONFIG);
    // Pre-fix: every medication shows rate=0 in this shape — that's
    // the "0 of 15 days logged · 0 meds" surface.
    expect(data.adherence.every((e) => e.rate === 0)).toBe(true);
  });
});
