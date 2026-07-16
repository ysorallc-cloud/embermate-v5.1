// ============================================================================
// SAMPLE-DATA LEAK (Cause #1: storage tagging gap) — residue survives clear.
//
// Repro: a user explores sample/example mode (sample_data_seeded='true',
// initializeSampleData() seeds a full demo dataset), then taps "Start
// Fresh" / "Clear sample data". EVERY such button routes to
// sampleDataManager.clearSampleData() (ManageSampleDataSheet,
// sample-data-transition, data-privacy-settings, care-plan/manage).
// clearSampleData() must remove every seeded record while preserving
// anything the user typed. It doesn't — four seeded record types survive
// and then surface on the caregiver's real screens as a real loved one's
// record:
//
//   1. Caregiver NOTE ("Dad seemed confused about his evening meds…") —
//      saveNotesLog → CENTRAL_NOTES_LOGS, written WITHOUT an origin tag,
//      and clearSampleData cleared a DIFFERENT key (StorageKeys.NOTES) that
//      nothing seeds to. Read by Journal + Care Report (getNotesLogs).
//   2. Daily VITALS aggregates (BP 158/95 …) — CENTRAL_VITALS_LOGS,
//      correctly origin-tagged but clearSampleData never iterated the key.
//      Read by Calendar / Baselines / Now / Visit-Prep (getVitalsLogs).
//   3. Legacy MEDICATION_LOGS (med-1..med-5) — written WITHOUT an origin tag
//      to a key clearSampleData never iterated. Read by the Now-page med
//      count + reports (getMedicationLogs).
//   4. "Knee stiffness" SYMPTOM — written WITHOUT an origin tag, so the
//      origin filter can't recognize it (key IS iterated). Read by Provider
//      Prep + Now (getSymptoms). This is the already-✅ key-coverage case;
//      the miss here is purely the missing tag.
//
// Signatures are CONTENT-based, not origin-only, so the test goes RED even
// for the untagged records (an origin-only check would pass on missing
// tags and hide the bug).
//
// PRIMARY: storage-layer sweep — after seed → clear, NO seeded key may hold
// a sample record (including the keys clearSampleData does not currently
// iterate). ADD: reader-layer — the device-facing readers must return no
// sample content (catches a key you tag/clear but a surface still reads a
// different one). Plus: user data added between seed and clear is preserved
// (proves origin-filtering, not a blanket wipe).
// ============================================================================

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    multiSet: (pairs: Array<[string, string]>) => {
      for (const [k, v] of pairs) store.set(k, v);
      return Promise.resolve();
    },
    multiRemove: (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    },
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, store.get(k) ?? null] as [string, string | null])),
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
    clear: () => { store.clear(); return Promise.resolve(); },
  },
}));

// Real safeStorage shape: JSON round-trip through the same in-memory map so
// encryptedSetRaw (raw string) and safeSetItem (stringified) interoperate
// exactly as they do on device for these keys.
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (k: string, v: any): Promise<boolean> => {
    store.set(k, JSON.stringify(v));
    return true;
  },
  encryptedSetRaw: async (k: string, raw: string): Promise<void> => {
    store.set(k, raw);
  },
  encryptedGetRaw: async (k: string): Promise<string | null> => {
    return store.get(k) ?? null;
  },
  isSensitiveKey: () => false,
  safeJSONParse: <T,>(s: string | null, fallback: T): T => {
    if (!s) return fallback;
    try { return JSON.parse(s) as T; } catch { return fallback; }
  },
}));

jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

import { initializeSampleData } from '../../utils/sampleDataGenerator';
import { clearSampleData } from '../../utils/sampleDataManager';
import {
  getNotesLogs,
  getVitalsLogs,
  getTodayVitalsLog,
  saveNotesLog,
  saveVitalsLog,
} from '../../utils/centralStorage';
import { getSymptoms, saveSymptom } from '../../utils/symptomStorage';
import { getMedicationLogs } from '../../utils/medicationStorage';
import { scopedKey, StorageKeys } from '../../utils/storageKeys';

const PID = 'default';

// --- Sample-record signatures (content-based so untagged records are caught) ---
const isSampleNote = (n: any) => (n?.origin === 'sample') || /evening meds/i.test(n?.content ?? '');
const isSampleVitalsLog = (v: any) => (v?.origin === 'sample') || (v?.systolic === 158 && v?.diastolic === 95);
const isSampleSymptom = (s: any) => (s?.origin === 'sample') || s?.symptom === 'Knee stiffness';
const isSampleMedLog = (m: any) => (m?.origin === 'sample') || /^med-[1-5]$/.test(m?.medicationId ?? '');

beforeEach(async () => {
  store.clear();
  // User opted into sample/example mode during onboarding.
  store.set('sample_data_seeded', JSON.stringify('true'));
});

describe('Sample-data residue must not survive clearSampleData() (Cause #1)', () => {
  it('PRIMARY — storage layer: no seeded key retains a sample record after clear', async () => {
    await initializeSampleData();

    // Sanity: the four leaking records are actually present after seeding.
    expect((await getNotesLogs(PID)).some(isSampleNote)).toBe(true);
    expect((await getVitalsLogs(PID)).some(isSampleVitalsLog)).toBe(true);
    expect((await getSymptoms(PID)).some(isSampleSymptom)).toBe(true);
    expect((await getMedicationLogs(PID)).some(isSampleMedLog)).toBe(true);

    await clearSampleData();

    // Sweep every key that holds a seeded record — including the ones
    // clearSampleData did NOT iterate pre-fix. Read raw and check by
    // content signature so an untagged residue can't slip through.
    const readRaw = (key: string): any[] => {
      const raw = store.get(key);
      if (raw == null) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    expect(readRaw(scopedKey(StorageKeys.CENTRAL_NOTES_LOGS, PID)).some(isSampleNote)).toBe(false);
    expect(readRaw(scopedKey(StorageKeys.CENTRAL_VITALS_LOGS, PID)).some(isSampleVitalsLog)).toBe(false);
    expect(readRaw(scopedKey(StorageKeys.SYMPTOMS, PID)).some(isSampleSymptom)).toBe(false);
    expect(readRaw(scopedKey(StorageKeys.MEDICATION_LOGS, PID)).some(isSampleMedLog)).toBe(false);

    // Regression guard: the keys clearSampleData already handled stay clean.
    expect(readRaw(StorageKeys.MEDICATIONS).some((m: any) => m?.origin === 'sample')).toBe(false);
    expect(readRaw(StorageKeys.CENTRAL_MOOD_LOGS).some((m: any) => m?.origin === 'sample')).toBe(false);
    expect(readRaw(StorageKeys.APPOINTMENTS).some((a: any) => a?.origin === 'sample')).toBe(false);
    expect(readRaw(StorageKeys.CAREGIVERS).some((c: any) => c?.origin === 'sample')).toBe(false);
  });

  it('ADD — reader layer: device-facing readers return no sample content after clear', async () => {
    await initializeSampleData();
    await clearSampleData();

    // Journal / Care Report caregiver notes.
    expect((await getNotesLogs(PID)).some(isSampleNote)).toBe(false);
    // Calendar / Baselines / Now / Visit-Prep daily vitals aggregates.
    expect((await getVitalsLogs(PID)).some(isSampleVitalsLog)).toBe(false);
    const todayVital = await getTodayVitalsLog(PID);
    expect(todayVital == null || !isSampleVitalsLog(todayVital)).toBe(true);
    // Provider Prep / Now symptoms.
    expect((await getSymptoms(PID)).some(isSampleSymptom)).toBe(false);
    // Now-page med count / reports.
    expect((await getMedicationLogs(PID)).some(isSampleMedLog)).toBe(false);
  });

  it('preserves the user\'s own data across clear (origin filter, not blanket wipe)', async () => {
    await initializeSampleData();

    // The caregiver adds REAL data of their own (untagged / origin='user').
    await saveNotesLog({ content: 'MY REAL NOTE — keep this', timestamp: new Date().toISOString() });
    await saveVitalsLog({ timestamp: new Date().toISOString(), systolic: 118, diastolic: 74 } as any);
    await saveSymptom({
      symptom: 'MY REAL SYMPTOM',
      severity: 3,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });

    await clearSampleData();

    const notes = await getNotesLogs(PID);
    const vitals = await getVitalsLogs(PID);
    const symptoms = await getSymptoms(PID);

    // Sample gone…
    expect(notes.some(isSampleNote)).toBe(false);
    expect(vitals.some(isSampleVitalsLog)).toBe(false);
    expect(symptoms.some(isSampleSymptom)).toBe(false);

    // …user's own data preserved.
    expect(notes.some((n) => n.content === 'MY REAL NOTE — keep this')).toBe(true);
    expect(vitals.some((v) => v.systolic === 118 && v.diastolic === 74)).toBe(true);
    expect(symptoms.some((s) => s.symptom === 'MY REAL SYMPTOM')).toBe(true);
  });
});
