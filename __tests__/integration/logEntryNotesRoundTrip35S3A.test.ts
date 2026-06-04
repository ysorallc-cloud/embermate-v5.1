// ============================================================================
// Phase 35 Slice 3-A — INTEGRATION ROUND-TRIP for the LogEntry-notes
// write→read pipeline that feeds the Journal "OBSERVATIONS FROM
// LOGGING" sub-section AND the Now done-row "View note" affordance.
//
// STANDING PATTERN (locked by reflectionRoundTrip35S3C.test.ts and
// vitalsRoundTrip35S3C.test.ts headers, applies here verbatim):
//
//   For any user-visible action that writes data which another
//   surface will later read, an integration test must exercise the
//   REAL write fn → REAL storage layer → REAL read fn round-trip,
//   with mocks ONLY at the bottom-layer native modules
//   (AsyncStorage, expo-secure-store, expo-crypto — already mocked
//   globally in jest.setup.js with realistic in-memory
//   implementations).
//
//   Mocks of `createLogEntry` / `logInstanceCompletion` /
//   `listLogsByDate` / `getLogById` / `upsertDailyInstances` /
//   `safeStorage` / `secureStorage` are FORBIDDEN in this file.
//   Any future maintainer adding such a mock undoes the guard.
//
// THIS FILE — the per-entry note path (Slice 3-A).
//   Journal sub-section: reads listLogsByDate(date), filters
//   entry.notes?.trim().length > 0, renders one row per entry with
//   itemName + notes + time. Now done-row: chevron rendered when
//   instance.logId != null AND log.notes?.trim().length > 0.
//   Both surfaces share the same write→read contract: production
//   writes flow through logInstanceCompletion({ notes }); reads
//   flow through listLogsByDate / getLogById. The round-trip pinned
//   below is the floor both surfaces stand on.
//
// SISTER FILES:
//   reflectionRoundTrip35S3C.test.ts (Bug B — consolidated notes)
//   vitalsRoundTrip35S3C.test.ts     (Bug A — vitals)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createLogEntry,
  listLogsByDate,
  getLogById,
  logInstanceCompletion,
  upsertDailyInstances,
  getDailyInstance,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance, LogEntry } from '../../types/carePlan';
import { isSensitiveKey } from '../../utils/safeStorage';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-06-04';

function makeInstance(overrides: Partial<DailyCareInstance> = {}): DailyCareInstance {
  const now = new Date().toISOString();
  return {
    id: 'inst-1',
    carePlanId: 'plan-1',
    carePlanItemId: 'item-1',
    patientId: DEFAULT_PATIENT_ID,
    date: DATE,
    scheduledTime: '08:00',
    windowLabel: 'Morning',
    windowId: 'morning',
    status: 'pending',
    itemName: 'Atenolol 50mg',
    itemType: 'medication',
    priority: 'normal',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as DailyCareInstance;
}

describe('Phase 35 Slice 3-A — LogEntry-notes write→read INTEGRATION round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CORE): createLogEntry({ notes }) → listLogsByDate(date) returns the saved log with notes intact', async () => {
    // The Journal sub-section will iterate listLogsByDate's return
    // value and filter on entry.notes. The round-trip MUST preserve
    // the notes string verbatim through the safeStorage encryption
    // wrapper.
    const NOTE = 'BP elevated, observed during morning walk.';
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:12:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: NOTE,
      source: 'record',
    });

    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logs).toHaveLength(1);
    expect(logs[0].notes).toBe(NOTE);
    expect(logs[0].outcome).toBe('completed');
  });

  it('rt-2 (FILTER PREDICATE): entry.notes?.trim().length > 0 includes meaningful notes, excludes undefined / empty / whitespace-only', async () => {
    // The exact filter the ObservationsFromLogging sub-section
    // applies. Whitespace-only must be excluded — the user typed
    // nothing actionable, and an "Observations" row reading just
    // a few spaces is noise.
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T07:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Meaningful observation here.',
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: undefined,
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T09:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: '',
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T10:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: '   \n  ',
      source: 'record',
    });

    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logs).toHaveLength(4);

    const withNotes = logs.filter((e) => (e.notes?.trim().length ?? 0) > 0);
    expect(withNotes).toHaveLength(1);
    expect(withNotes[0].notes).toBe('Meaningful observation here.');
  });

  it('rt-3 (GETLOGBYID): instance.logId → getLogById returns the same LogEntry — the Now done-row affordance read path', async () => {
    // The Now affordance batches via listLogsByDate per render, but
    // the per-row contract is "given instance.logId, fetch the log
    // and inspect notes." getLogById is the canonical helper. Its
    // round-trip must mirror listLogsByDate.find() exactly.
    const NOTE = 'Patient sleepy after dose.';
    const created = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: NOTE,
      source: 'record',
    });

    const fetched = await getLogById(DEFAULT_PATIENT_ID, DATE, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.notes).toBe(NOTE);
  });

  it('rt-4 (PRODUCTION WRAPPER): logInstanceCompletion(..., { notes }) writes the notes onto the LogEntry AND links instance.logId back', async () => {
    // The production write path for caregiver notes carried with a
    // care-task completion. log-medication-plan-item / log-mood /
    // log-pain / log-symptom / etc. all flow through this wrapper
    // (directly or via useDailyCareInstances.completeInstance). The
    // round-trip pins TWO contracts at once:
    //   (a) notes survive the wrapper unchanged → listLogsByDate sees them
    //   (b) instance.logId is set to the new LogEntry.id → the Now
    //       done-row affordance's cheap precheck (logId != null) is satisfied
    const instance = makeInstance({ id: 'inst-meds-1', itemName: 'Lisinopril 10mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);

    const NOTE = 'Took with breakfast; no nausea this morning.';
    const result = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      DATE,
      instance.id,
      'completed',
      { type: 'medication', medicationName: 'Lisinopril' },
      { notes: NOTE, source: 'record' },
    );
    expect(result).not.toBeNull();

    // (a) listLogsByDate sees the note verbatim.
    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logs).toHaveLength(1);
    expect(logs[0].notes).toBe(NOTE);
    expect(logs[0].dailyInstanceId).toBe(instance.id);

    // (b) instance.logId points back to the created log.
    const updatedInstance = await getDailyInstance(DEFAULT_PATIENT_ID, DATE, instance.id);
    expect(updatedInstance).not.toBeNull();
    expect(updatedInstance!.logId).toBe(logs[0].id);
    expect(updatedInstance!.status).toBe('completed');
  });

  it('rt-5 (PRIVACY — ENCRYPTED AT REST): the logs keys are sensitive-prefixed AND raw AsyncStorage value is NOT the plaintext note', async () => {
    // Standing-rule check (input-validity + privacy/local-only).
    // Per-entry notes are caregiver observations — health-adjacent
    // and personal. If safeSetItem routes the LOGS key through
    // plaintext AsyncStorage, those observations sit at rest
    // unencrypted.
    const SECRET = 'Confidential observation — mood was off all morning.';
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: SECRET,
      source: 'record',
    });

    // Both per-day LOGS and the ALL_LOGS aggregate must be in
    // SENSITIVE_KEY_PREFIXES (Slice 1's V1→V2 migration locked
    // these). isSensitiveKey uses startsWith, so the canonical
    // prefix forms below are the assertions.
    expect(isSensitiveKey('@embermate_logs_v2:default:2026-06-04')).toBe(true);
    expect(isSensitiveKey('@embermate_all_logs_v2:default')).toBe(true);

    // The raw AsyncStorage payload at both keys must NOT contain
    // the plaintext SECRET.
    const rawKeys = await AsyncStorage.getAllKeys();
    const dailyLogsKey = rawKeys.find((k) => k.startsWith('@embermate_logs_v2:'));
    const allLogsKey = rawKeys.find((k) => k.startsWith('@embermate_all_logs_v2:'));
    expect(dailyLogsKey).toBeDefined();
    expect(allLogsKey).toBeDefined();

    const rawDaily = await AsyncStorage.getItem(dailyLogsKey!);
    const rawAll = await AsyncStorage.getItem(allLogsKey!);
    expect(rawDaily).not.toBeNull();
    expect(rawAll).not.toBeNull();
    expect(rawDaily).not.toContain(SECRET);
    expect(rawAll).not.toContain(SECRET);

    // And the round-trip read DOES return the plaintext.
    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logs[0].notes).toBe(SECRET);
  });

  it('rt-6 (PER-DATE ISOLATION): writes to one date do NOT bleed into another date\'s read', async () => {
    // The sub-section reads listLogsByDate(selectedDate); past-day
    // mode is supported (Q-3A.10). If a write to today's bucket
    // bleeds into yesterday's read, past-day Observations would
    // false-positive today's content. The KEYS.LOGS pattern is
    // per-(patient, date) so the storage layer enforces this — but
    // pin the contract so a future refactor (e.g., a unified-log
    // store) can't quietly drop it.
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date('2026-06-04T08:00:00').toISOString(),
      date: '2026-06-04',
      outcome: 'completed',
      notes: 'Note for the 4th.',
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date('2026-06-03T08:00:00').toISOString(),
      date: '2026-06-03',
      outcome: 'completed',
      notes: 'Note for the 3rd.',
      source: 'record',
    });

    const fourth = await listLogsByDate(DEFAULT_PATIENT_ID, '2026-06-04');
    const third = await listLogsByDate(DEFAULT_PATIENT_ID, '2026-06-03');
    expect(fourth).toHaveLength(1);
    expect(third).toHaveLength(1);
    expect(fourth[0].notes).toBe('Note for the 4th.');
    expect(third[0].notes).toBe('Note for the 3rd.');
  });

  it('rt-7 (SORT): logs are sortable ascending by timestamp (Q-3A.3 — earliest → latest narrative)', async () => {
    // The sub-section sorts ascending so the day reads
    // chronologically (8am → 4pm). Pin that an ISO timestamp
    // comparison is sufficient — no parsing required.
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T16:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Late afternoon observation.',
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Morning observation.',
      source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T12:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Midday observation.',
      source: 'record',
    });

    const logs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    const sorted = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    expect(sorted.map((l) => l.notes)).toEqual([
      'Morning observation.',
      'Midday observation.',
      'Late afternoon observation.',
    ]);
  });
});
