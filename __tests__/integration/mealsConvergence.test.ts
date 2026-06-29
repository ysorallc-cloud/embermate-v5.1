// ============================================================================
// Wave-1 clinician-artifact convergence — MEALS (Fix #3) + the deferred vitals
// chip.
//
// All meals surfaces converge on the canonical INSTANCE unit (logged =
// completed||skipped; expected = plan-defined nutrition instances):
//   • Insights tile  — counted LogEntries (the 4.4/day overcount). RED.
//   • visit chip     — counted an events+instances UNION. RED.
//   • VP report      — already instance-based; convergence is STRUCTURAL
//                      (routed through the shared reader), so it's a parity
//                      check here, not a behavioral RED.
// The visit chip's VITALS counter (the 4th counter held back from Fix #2) is
// closed in the same pass — it now reads countCanonicalVitalsInRange (store B),
// not the events+instances union.
//
// Integration: instances (carePlanRepo → safeStorage → SecureStore, same AES
// path Now/Journal read), store-B vitals, and events all run for REAL. Divergent
// meal_logged / vitals_recorded EVENTS are seeded so the OLD union would count
// MORE than the canonical readers — making the chip RED real.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CarePlanItem } from '../../types/carePlan';
import { seedDeviceState } from './_helpers/seedDeviceState';
import { saveEvent } from '../../storage/eventRepo';
import { saveVitalsLog } from '../../utils/centralStorage';
import { toLocalDateString } from '../../services/carePlanGenerator';
import { assembleVisitPrepData, type VisitPrepConfig } from '../../services/visitPrepPdf';
import { getCarePlanStatsForRange } from '../../utils/understandInsights';
import { loadDataCoverage } from '../../utils/visitCoverage';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../../services/symptomChangeDetection', () => ({ detectSymptomChanges: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/functionalIssueExtraction', () => ({ extractFunctionalIssues: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/patientQuestionsRepo', () => ({ listQuestions: jest.fn(() => Promise.resolve([])), clearQuestions: jest.fn() }));
jest.mock('../../services/medicationChangeTracking', () => ({ listMedicationChanges: jest.fn(() => Promise.resolve([])), recordMedicationChange: jest.fn(() => Promise.resolve()) }));

const ISO = '2026-01-01T00:00:00.000Z';
const MEAL_ITEM: CarePlanItem = {
  id: 'meal-plan',
  carePlanId: 'placeholder',
  type: 'nutrition',
  name: 'Meal',
  priority: 'recommended',
  active: true,
  schedule: {
    frequency: 'daily',
    times: [
      { id: 'meal-b', kind: 'exact', label: 'morning', at: '08:00' },
      { id: 'meal-l', kind: 'exact', label: 'afternoon', at: '12:00' },
      { id: 'meal-d', kind: 'exact', label: 'evening', at: '18:00' },
    ],
  },
  emoji: '🍽️',
  createdAt: ISO,
  updatedAt: ISO,
} as CarePlanItem;

type Status = 'completed' | 'skipped' | 'missed' | 'pending';

async function seedMealDay(date: string, b: Status, l: Status, d: Status): Promise<void> {
  await seedDeviceState({
    date,
    items: [MEAL_ITEM],
    instances: [
      { itemId: 'meal-plan', windowId: 'meal-b', status: b },
      { itemId: 'meal-plan', windowId: 'meal-l', status: l },
      { itemId: 'meal-plan', windowId: 'meal-d', status: d },
    ],
  });
}

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const today = toLocalDateString(new Date());
const d1 = toLocalDateString(new Date(Date.now() - 1 * 86400000));
const d2 = toLocalDateString(new Date(Date.now() - 2 * 86400000));

// 3 days × 3 slots = 9 expected; logged (completed||skipped) = 3 + 2 + 1 = 6.
async function seedMeals(): Promise<void> {
  await seedMealDay(today, 'completed', 'completed', 'completed'); // 3 logged (full)
  await seedMealDay(d1, 'completed', 'skipped', 'missed');         // 2 logged (partial)
  await seedMealDay(d2, 'completed', 'missed', 'missed');          // 1 logged (partial)
}

describe('Clinician meals convergence (Fix #3) — canonical instance unit', () => {
  beforeEach(async () => {
    await clearAll();
  });

  describe('Insights tile (getCarePlanStatsForRange)', () => {
    it('meals come from instances (logged=completed||skipped), NOT LogEntries', async () => {
      await seedMeals();
      const stats = await getCarePlanStatsForRange(14 as any);
      // RED today: counts nutrition LogEntries (none seeded) → 0 / 0.0.
      expect(stats.mealLogs).toBe(6);
      expect(stats.avgMealsPerDay).toBeCloseTo(6 / 14, 5); // logged / range
    });
  });

  describe('Visit Prep report (assembleVisitPrepData) — parity (already instance-based)', () => {
    it('meal days reflect the canonical instances (skipped counts as logged → full day)', async () => {
      await seedMeals();
      const config: VisitPrepConfig = {
        dateRange: { start: d2, end: today },
        includeMeds: false, includeVitals: false, includeWellness: false,
        includeJournal: false, includeQuestions: false, includeHydrationNutrition: true,
        questions: '', patientName: 'Mom', caregiverName: 'Amber',
      };
      const data = await assembleVisitPrepData(config);
      expect(data.hydrationNutrition?.meals).not.toBeNull();
      expect(data.hydrationNutrition!.meals!.fullMealDays).toBe(1);    // today 3/3 (skipped counts)
      expect(data.hydrationNutrition!.meals!.partialMealDays).toBe(2); // d1, d2
    });
  });

  describe('Visit chip (visitCoverage.loadDataCoverage) — meals + vitals canonical, not union', () => {
    it('chip meals = canonical instance count; chip vitals = canonical store-B count; divergent events ignored', async () => {
      await seedMeals();
      // Divergent EVENTS the OLD union would have counted on top of instances.
      await saveEvent({ patientId: 'default', type: 'meal_logged', timestamp: `${today}T13:00:00Z`, metadata: {} } as any);
      await saveEvent({ patientId: 'default', type: 'meal_logged', timestamp: `${d1}T13:00:00Z`, metadata: {} } as any);
      // 2 canonical store-B vitals readings + 1 divergent vitals event.
      await saveVitalsLog({ timestamp: `${today}T08:00:00Z`, systolic: 130, diastolic: 82, heartRate: 76 });
      await saveVitalsLog({ timestamp: `${d1}T08:00:00Z`, systolic: 128, diastolic: 80, heartRate: 74 });
      await saveEvent({ patientId: 'default', type: 'vitals_recorded', timestamp: `${today}T09:00:00Z`, metadata: {} } as any);

      const cov = await loadDataCoverage(d2, today, 15);
      // RED (old union): meals = 6 instances + 2 events = 8.
      expect(cov.meals).toBe(6);
      // RED (old union): vitals = 0 instances + 1 event = 1.
      expect(cov.vitals).toBe(2);
    });
  });
});
