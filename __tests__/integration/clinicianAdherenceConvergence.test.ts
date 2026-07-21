// ============================================================================
// Wave-1 clinician-artifact convergence — ADHERENCE (Fix #1).
//
// The numbers on the documents handed to a clinician must equal what Now/
// Journal read (DailyCareInstance.status), over the labeled window, with a
// SKIPPED dose counted AGAINST adherence (locked definition). Two artifacts:
//
//   • care-report Comprehensive Report (generateComprehensiveReport) — was
//     computing overallAdherence from a MedicationLog/`m.taken` today-snapshot
//     MISLABELED "7-day". RED: ignores instances + ignores the passed date.
//   • Visit Prep PDF (assembleVisitPrepData) — already read instances but
//     CREDITED skipped as adherent (completed | skipped / total). RED: a
//     half-skipped med reads 100%.
//
// Integration round-trip: the adherence computation runs for REAL —
// listDailyInstancesRange (seeded via seedDeviceState) + getMedications
// (real). Only the PDF render/share layer + unrelated peripheral builders
// are mocked. No mock stands between the seeded instance state and the
// number on the artifact.
//
// DATE-HONORING: the same seeded data yields 60% for a PAST referenceDate
// (its 7-day window) and 100% for today (today's window) — proving the
// report honors the caller-passed date instead of silently recomputing off
// "now". If it ignored the date, both would read the same.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CarePlanItem } from '../../types/carePlan';
import { seedDeviceState } from './_helpers/seedDeviceState';
import { assembleVisitPrepData, type VisitPrepConfig } from '../../services/visitPrepPdf';
import { createMedication } from '../../utils/medicationStorage';

// PDF render/share layer + unrelated peripheral builders — mocked because
// they are NOT the adherence computation. getMedications, listDailyInstances
// Range, medicationStorage, carePlanRepo are deliberately NOT mocked.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../../services/symptomChangeDetection', () => ({ detectSymptomChanges: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/functionalIssueExtraction', () => ({ extractFunctionalIssues: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/patientQuestionsRepo', () => ({ listQuestions: jest.fn(() => Promise.resolve([])), clearQuestions: jest.fn() }));
jest.mock('../../services/medicationChangeTracking', () => ({ listMedicationChanges: jest.fn(() => Promise.resolve([])), recordMedicationChange: jest.fn(() => Promise.resolve()) }));

const ISO = '2026-01-01T00:00:00.000Z';
const MED_ITEM: CarePlanItem = {
  id: 'med-warfarin',
  carePlanId: 'placeholder',
  type: 'medication',
  name: 'Warfarin',
  priority: 'recommended',
  active: true,
  schedule: {
    frequency: 'daily',
    times: [
      { id: 'med-warfarin-morning-time', kind: 'exact', label: 'morning', at: '08:00' },
      { id: 'med-warfarin-evening-time', kind: 'exact', label: 'evening', at: '18:00' },
    ],
  },
  emoji: '💊',
  createdAt: ISO,
  updatedAt: ISO,
} as CarePlanItem;

type Status = 'completed' | 'skipped' | 'missed' | 'pending';

async function seedMedDay(date: string, morning: Status, evening: Status): Promise<void> {
  await seedDeviceState({
    date,
    items: [MED_ITEM],
    instances: [
      { itemId: MED_ITEM.id, windowId: 'med-warfarin-morning-time', status: morning },
      { itemId: MED_ITEM.id, windowId: 'med-warfarin-evening-time', status: evening },
    ],
  });
}

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

describe('Clinician adherence convergence (Fix #1) — canonical source, skipped-against, date-honoring', () => {
  beforeEach(async () => {
    await clearAll();
  });

  // NOTE: the Care Report (generateComprehensiveReport) was RETIRED — its
  // adherence-convergence block was deleted with it. The two surviving clinician
  // reports are the Handoff (buildCareBrief) and Visit Prep. Adherence
  // skipped-against + date-honoring are retargeted onto Visit Prep below.
  describe('Visit Prep PDF (assembleVisitPrepData)', () => {
    const CONFIG: VisitPrepConfig = {
      dateRange: { start: '2026-06-10', end: '2026-06-11' },
      includeMeds: true,
      includeVitals: false,
      includeWellness: false,
      includeJournal: false,
      includeQuestions: false,
      questions: '',
      patientName: 'Dad',
      caregiverName: 'Amber',
    };

    it('per-med rate counts skipped AGAINST adherence (2 completed + 2 skipped → 50%, not 100%)', async () => {
      // Real medication so assembleVisitPrepData's getMedications() match hits.
      await createMedication({ name: 'Warfarin', dosage: '5mg', time: '08:00', taken: false, active: true } as any);
      // 06-10 both completed, 06-11 both skipped → 2 completed / 4 total.
      await seedMedDay('2026-06-10', 'completed', 'completed');
      await seedMedDay('2026-06-11', 'skipped', 'skipped');

      const data = await assembleVisitPrepData(CONFIG);
      const warfarin = data.adherence.find((e) => e.name === 'Warfarin');
      expect(warfarin).toBeDefined();
      // RED today: credits skipped → (2+2)/4 = 100. GREEN: completed-only → 50.
      expect(warfarin!.rate).toBe(50);
    });

    it('honors the passed dateRange, not "now" — the SAME data yields a different rate for a later all-completed window', async () => {
      await createMedication({ name: 'Warfarin', dosage: '5mg', time: '08:00', taken: false, active: true } as any);
      // Two windows on ONE dataset: 06-10/06-11 = 2 completed + 2 skipped;
      // 06-27/06-28 = 4 completed.
      await seedMedDay('2026-06-10', 'completed', 'completed');
      await seedMedDay('2026-06-11', 'skipped', 'skipped');
      await seedMedDay('2026-06-27', 'completed', 'completed');
      await seedMedDay('2026-06-28', 'completed', 'completed');

      // The default CONFIG range (06-10..06-11) → 50% (skipped against).
      const early = await assembleVisitPrepData(CONFIG);
      expect(early.adherence.find((e) => e.name === 'Warfarin')!.rate).toBe(50);

      // A later range over the same data → 100%, proving the range is honored.
      const late = await assembleVisitPrepData({ ...CONFIG, dateRange: { start: '2026-06-27', end: '2026-06-28' } });
      expect(late.adherence.find((e) => e.name === 'Warfarin')!.rate).toBe(100);
    });
  });
});
