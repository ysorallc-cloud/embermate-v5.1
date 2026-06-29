// ============================================================================
// Wave-1 clinician-artifact convergence — VITALS (Fix #2).
//
// Vitals must come from the CANONICAL store (B `@embermate_central_vitals_logs`,
// what Now/Journal read), not a separate store that only happens to be co-
// populated. Two divergences:
//
//   • Visit Prep PDF read store A (`@vitals_readings`) — a parallel store that
//     could silently drift from the screens. RED: seed ONLY store B and the
//     PDF shows no vitals.
//   • The Insights "vitals logged N times" counter (getCarePlanStatsForRange)
//     counted vitals-typed LogEntry completions (store C), which the normal
//     vitals flow NEVER writes — so it sat at 0 even with BP/HR on Now. RED:
//     seed store B readings and the count is still 0.
//
// Integration: vitals stores + the canonical reader run for REAL (only the PDF
// render layer + unrelated peripheral builders are mocked). The seed is store B
// via saveVitalsLog — the same store getTodayVitalsLog/getVitalsLogs serve to
// Now and Journal.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveVitalsLog } from '../../utils/centralStorage';
import { assembleVisitPrepData, type VisitPrepConfig } from '../../services/visitPrepPdf';
import { getCarePlanStatsForRange } from '../../utils/understandInsights';

// PDF render/share layer + unrelated peripheral builders — NOT the vitals path.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../../services/symptomChangeDetection', () => ({ detectSymptomChanges: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/functionalIssueExtraction', () => ({ extractFunctionalIssues: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../services/patientQuestionsRepo', () => ({ listQuestions: jest.fn(() => Promise.resolve([])), clearQuestions: jest.fn() }));
jest.mock('../../services/medicationChangeTracking', () => ({ listMedicationChanges: jest.fn(() => Promise.resolve([])), recordMedicationChange: jest.fn(() => Promise.resolve()) }));

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

describe('Clinician vitals convergence (Fix #2) — canonical store B', () => {
  beforeEach(async () => {
    await clearAll();
  });

  describe('Visit Prep PDF vitals section (assembleVisitPrepData)', () => {
    const CONFIG: VisitPrepConfig = {
      dateRange: { start: '2026-06-10', end: '2026-06-20' },
      includeMeds: false,
      includeVitals: true,
      includeWellness: false,
      includeJournal: false,
      includeQuestions: false,
      questions: '',
      patientName: 'Mom',
      caregiverName: 'Amber',
    };

    it('reads vitals from the canonical store B (the store Now/Journal read), not store A', async () => {
      // Seed ONLY store B (centralStorage). Store A (@vitals_readings) stays empty.
      await saveVitalsLog({ timestamp: '2026-06-12T08:00:00Z', systolic: 145, diastolic: 90, heartRate: 78 });
      await saveVitalsLog({ timestamp: '2026-06-15T08:00:00Z', systolic: 138, diastolic: 85, heartRate: 74 });
      await saveVitalsLog({ timestamp: '2026-06-18T08:00:00Z', systolic: 132, diastolic: 82, heartRate: 72 });

      const data = await assembleVisitPrepData(CONFIG);
      const systolic = data.vitals.find((v) => v.type === 'systolic');
      // RED today: VP reads store A (empty) → no systolic entry. GREEN: store B.
      expect(systolic).toBeDefined();
      expect(systolic!.latestValue).toContain('132'); // most recent in window
      const hr = data.vitals.find((v) => v.type === 'heartRate');
      expect(hr).toBeDefined();
    });
  });

  describe('Insights vitals counter (getCarePlanStatsForRange)', () => {
    it('counts vitals READING EVENTS from store B, not store-C LogEntry completions', async () => {
      // Four reading events in the last-14-day window (canonical store B).
      const now = Date.now();
      for (let i = 0; i < 4; i++) {
        const ts = new Date(now - i * 24 * 60 * 60 * 1000).toISOString(); // today, -1, -2, -3 days
        // eslint-disable-next-line no-await-in-loop
        await saveVitalsLog({ timestamp: ts, systolic: 130, diastolic: 82, heartRate: 76 });
      }

      const stats = await getCarePlanStatsForRange(14 as any);
      // RED today: counts vitals-typed LogEntries (store C, empty) → 0.
      // GREEN: counts store-B reading events → 4.
      expect(stats.vitalsLogs).toBe(4);
    });
  });
});
