// ============================================================================
// Visit Prep symptom progression — write→read round-trip over the LIVE store.
//
// ROOT (audit): detectSymptomChanges read the eventRepo `symptom_reported` stream,
// which the live app NEVER writes — so symptom progression always rendered "no
// changes." Real symptoms are written by saveSymptom (symptomStorage / SYMPTOMS
// key) from log-symptom / log-pain. This drives the REAL writer (saveSymptom) and
// asserts detectSymptomChanges surfaces the change — no synthetic eventRepo array.
//
// The detection is FREQUENCY-based (occurrence counts per half-window), NOT
// severity-based: 'new' when a symptom appears only in the recent half, 'worse'
// when it's ~2x more frequent in the recent half, etc. Severity is stored but the
// logic doesn't read it.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSymptom } from '../../utils/symptomStorage';
import { detectSymptomChanges, type DateRange } from '../../services/symptomChangeDetection';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

// 14-day window (>= MIN_DAYS_FOR_DETECTION=7). midpoint ≈ 06-07/08 → 06-01..06-06
// is the earlier half, 06-09..06-14 the recent half.
const RANGE: DateRange = { start: '2026-06-01', end: '2026-06-14' };

async function logSymptom(name: string, day: string, severity = 5): Promise<void> {
  await saveSymptom({
    symptom: name,
    severity,
    description: '',
    timestamp: `${day}T12:00:00.000Z`,
    date: day,
  } as any);
}

describe('Visit Prep symptom progression — live store round-trip', () => {
  beforeEach(async () => { await clearAll(); });

  it('a NEW symptom (recent half only) → detected as "new"', async () => {
    await logSymptom('Dizziness', '2026-06-11'); // recent half, nothing earlier
    const changes = await detectSymptomChanges(DEFAULT_PATIENT_ID, RANGE);
    const dizzy = changes.find((c) => c.symptom === 'dizziness');
    expect(dizzy).toBeDefined();
    expect(dizzy!.change).toBe('new');
  });

  it('a WORSENING symptom (≥2x more frequent in the recent half) → "worse"', async () => {
    await logSymptom('Headache', '2026-06-02');            // 1 earlier
    await logSymptom('Headache', '2026-06-10');            // 2 recent
    await logSymptom('Headache', '2026-06-12');
    const changes = await detectSymptomChanges(DEFAULT_PATIENT_ID, RANGE);
    const h = changes.find((c) => c.symptom === 'headache');
    expect(h).toBeDefined();
    expect(h!.change).toBe('worse');
    expect(h!.firstHalfFreq).toBe(1);
    expect(h!.secondHalfFreq).toBe(2);
  });

  it('a RESOLVED symptom (earlier half only) → "resolved"', async () => {
    await logSymptom('Nausea', '2026-06-02');
    await logSymptom('Nausea', '2026-06-04');
    const changes = await detectSymptomChanges(DEFAULT_PATIENT_ID, RANGE);
    const n = changes.find((c) => c.symptom === 'nausea');
    expect(n!.change).toBe('resolved');
  });

  it('reads the whole multi-day window, not just one day (symptoms OUTSIDE the range are ignored)', async () => {
    await logSymptom('Fatigue', '2026-05-20');   // before the window → ignored
    await logSymptom('Fatigue', '2026-06-11');   // inside recent half → new
    await logSymptom('Cramping', '2026-06-30');  // after the window → ignored
    const changes = await detectSymptomChanges(DEFAULT_PATIENT_ID, RANGE);
    expect(changes.find((c) => c.symptom === 'fatigue')?.change).toBe('new');
    expect(changes.find((c) => c.symptom === 'cramping')).toBeUndefined();
  });

  it('empty store → no changes (graceful)', async () => {
    expect(await detectSymptomChanges(DEFAULT_PATIENT_ID, RANGE)).toEqual([]);
  });
});
