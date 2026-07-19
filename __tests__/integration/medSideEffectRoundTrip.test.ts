// ============================================================================
// Med side-effect write→read INTEGRATION round-trip (Bug 3).
//
// The caregiver enters a side-effect when marking a med taken. It must reach the
// Journal / handoff. This exercises the REAL pipeline with no mocks on it:
//   logInstanceCompletion (canonical MedicationLogData shape) → buildCareBrief
//   → brief.medications[].sideEffects (what MedicationsNarrative renders).
//
// Pins the writer↔reader contract: the exact shape the log screen now emits
// ({ type:'medication', sideEffects: string[] }) is the shape careSummaryBuilder
// consumes. The prior malformed { sideEffect: "…" } would surface nothing here.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMedicationToPlan } from '../../storage/carePlanConfigRepo';
import { listDailyInstances, listLogsByDate, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';
import { buildCareBrief } from '../../utils/careSummaryBuilder';
import { buildJournalLoggedRows } from '../../utils/journalLoggedRows';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

// A dose time ~60min AHEAD of now so the born-overdue guard (Fix A) doesn't skip
// today's instance — we need a real pending med instance to complete.
function hhmm(totalMin: number): string {
  const c = Math.max(1, Math.min(1438, totalMin));
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
}
const FUTURE = hhmm(new Date().getHours() * 60 + new Date().getMinutes() + 60);
const TODAY = getTodayDateString();

describe('med side-effect round-trip — entered symptom reaches the Journal/handoff', () => {
  beforeEach(async () => { await clearAll(); });

  it('logInstanceCompletion(canonical shape) → buildCareBrief surfaces the side-effect', async () => {
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Atorvastatin', dosage: '10mg', timesOfDay: ['morning'],
      customTimes: [FUTURE], scheduledTimeHHmm: FUTURE, active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const med = (await listDailyInstances(DEFAULT_PATIENT_ID, TODAY)).find(i => i.itemType === 'medication');
    expect(med).toBeDefined();

    // The exact shape the log screen now writes.
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, TODAY, med!.id, 'taken',
      { type: 'medication', sideEffects: ['nausea'] } as any,
      { source: 'record' },
    );

    const brief = await buildCareBrief(TODAY);
    const briefMed = brief.medications.find(m => m.name.includes('Atorvastatin'));
    expect(briefMed).toBeDefined();
    expect(briefMed!.sideEffects).toEqual(['nausea']);
  });

  it('the JOURNAL logged-row shows the selected symptom (the on-screen display path)', async () => {
    // Same shape the selector emits, but assert the ACTUAL Journal display view-
    // model (buildJournalLoggedRows) — not just buildCareBrief — since the Journal
    // tab renders these rows, and they were instance-only (no logs) → symptoms
    // never showed even though the data was stored.
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Atorvastatin', dosage: '10mg', timesOfDay: ['morning'],
      customTimes: [FUTURE], scheduledTimeHHmm: FUTURE, active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
    const med = (await listDailyInstances(DEFAULT_PATIENT_ID, TODAY)).find(i => i.itemType === 'medication');

    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, TODAY, med!.id, 'taken',
      { type: 'medication', sideEffects: ['nausea', 'tired'] } as any,
      { source: 'record' },
    );

    const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, TODAY);
    const rows = buildJournalLoggedRows(instances, logs);

    const medRow = rows.find(r => r.type === 'MEDICATION' && r.name.includes('Atorvastatin'));
    expect(medRow).toBeDefined();
    expect(medRow!.detail).toBeDefined();
    expect(medRow!.detail).toContain('Nausea');
    expect(medRow!.detail).toContain('Tired');
  });

  it('a malformed { sideEffect } write does NOT surface (guards the regression)', async () => {
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
      customTimes: [FUTURE], scheduledTimeHHmm: FUTURE, active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);
    const med = (await listDailyInstances(DEFAULT_PATIENT_ID, TODAY)).find(i => i.itemType === 'medication');

    // The OLD (bug) shape — no `type`, singular `sideEffect` string.
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, TODAY, med!.id, 'taken',
      { sideEffect: 'nausea' } as any,
      { source: 'record' },
    );

    const brief = await buildCareBrief(TODAY);
    const briefMed = brief.medications.find(m => m.name.includes('Warfarin'));
    expect(briefMed!.sideEffects).toBeUndefined(); // confirms WHY the bug lost it
  });
});
