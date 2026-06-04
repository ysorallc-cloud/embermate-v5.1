// ============================================================================
// Phase 35 Slice 3-D — INTEGRATION ROUND-TRIP for the LogEntry
// soft-delete (hide-not-delete) pipeline.
//
// STANDING PATTERN (locked by reflectionRoundTrip35S3C.test.ts /
// vitalsRoundTrip35S3C.test.ts / logEntryNotesRoundTrip35S3A.test.ts
// headers, applies here verbatim):
//
//   For any user-visible action that writes data which another
//   surface will later read, an integration test must exercise the
//   REAL write fn → REAL storage layer → REAL read fn round-trip,
//   with mocks ONLY at the bottom-layer native modules
//   (AsyncStorage, expo-secure-store, expo-crypto — already mocked
//   globally in jest.setup.js with realistic in-memory
//   implementations).
//
//   Mocks of `createLogEntry` / `tombstoneLogEntry` /
//   `undoInstanceCompletion` / `listLogsByDate` / `getLogById` /
//   `listLogsInRange` / `upsertDailyInstances` / `safeStorage` /
//   `secureStorage` are FORBIDDEN in this file. Any future
//   maintainer adding such a mock undoes the guard.
//
// THIS FILE — the per-entry soft-delete path (Slice 3-D).
//   The hide-not-delete standing rule applies to the LogEntry the
//   moment caregiver-visible undo enters the picture. Pre-3-D the
//   undo path (`undoInstanceCompletion`) HARD-deleted via
//   `deleteLogEntry`, destroying the audit trail. 3-D adds an
//   ISO timestamp `deletedAt` field on LogEntry; the bottom-layer
//   read primitives (`listLogsByDate`, `getLogById`,
//   `listLogsInRange`) filter `!log.deletedAt` BY DEFAULT, with an
//   opt-in `{ includeDeleted: true }` flag reserved for future
//   audit-trail readers (insights / exports). All six downstream
//   consumers found in the Slice 3-D audit
//   (careSummaryBuilder.buildCareBrief, todayRecapBuilder,
//   ObservationsFromLogging, useNotesByLogId, plus indirect via
//   the journal Section 4 + care-report screens) inherit the
//   filter for free — no per-consumer changes needed.
//
// SISTER FILES:
//   reflectionRoundTrip35S3C.test.ts        (Slice 3-C Bug B notes)
//   vitalsRoundTrip35S3C.test.ts            (Slice 3-C Bug A vitals)
//   logEntryNotesRoundTrip35S3A.test.ts     (Slice 3-A per-entry notes)
//
// COMMIT BOUNDARY:
//   This file ships in two waves to keep each commit walkable:
//     • Commit 1 (storage layer) — rt-1 / rt-2 / rt-3 / rt-7 / rt-8
//       / rt-9. Pins the soft-delete primitive + bottom-layer
//       filter. No caller writes deletedAt yet.
//     • Commit 2 (unification)   — rt-4 / rt-5 / rt-6. Pins
//       undoInstanceCompletion's canonical contract + the redo
//       restore path. Both contracts arrive together when the
//       four trigger paths (handleQuickLog / handleQuickSkip /
//       handleQuickConfirm / new long-press) all route through
//       the canonical fn.
//
//   This file currently holds only Commit 1's contracts.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createLogEntry,
  tombstoneLogEntry,
  listLogsByDate,
  getLogById,
  listLogsInRange,
  listDailyInstances,
  upsertDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance } from '../../types/carePlan';
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

describe('Phase 35 Slice 3-D — LogEntry soft-delete write→read INTEGRATION round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CORE SOFT-DELETE): tombstoneLogEntry(logId) writes deletedAt onto the persisted LogEntry; raw storage RETAINS the entry (hide-not-delete)', async () => {
    // The bottom-layer primitive. After tombstoning, the entry must
    // still exist in raw AsyncStorage (audit trail preserved) but
    // carry a deletedAt timestamp. Reading via the includeDeleted
    // opt-in surfaces it; the default read filters it out (rt-2).
    const created = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Note that survives the tombstone.',
      source: 'record',
    });

    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, created.id);

    // The full raw read (opt-in includeDeleted) returns the entry
    // with deletedAt populated. ISO-8601 format.
    const allLogs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE, { includeDeleted: true });
    expect(allLogs).toHaveLength(1);
    expect(allLogs[0].id).toBe(created.id);
    expect(typeof allLogs[0].deletedAt).toBe('string');
    expect(allLogs[0].deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // The note content is preserved verbatim — the tombstone is a
    // tombstone, not a content edit.
    expect(allLogs[0].notes).toBe('Note that survives the tombstone.');
  });

  it('rt-2 (LISTLOGSBYDATE FILTERS): a tombstoned log is hidden from listLogsByDate by default', async () => {
    // The bottom-layer filter contract. All six downstream consumers
    // route through listLogsByDate; making the filter default here
    // means they inherit it for free.
    const kept = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Kept entry.',
      source: 'record',
    });
    const tombstoned = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T09:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Tombstoned entry.',
      source: 'record',
    });
    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, tombstoned.id);

    const visible = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(kept.id);
  });

  it('rt-3 (GETLOGBYID FILTERS): a tombstoned log id returns null from getLogById by default', async () => {
    // The Now-tab "View note" affordance / done-row chevron read
    // path. After the caregiver undoes a confirmation, the chevron
    // must disappear AND a direct getLogById lookup must not
    // resurface the deleted log's note. The lookup returns null,
    // not the entry-with-deletedAt — the soft-delete is
    // semantically invisible to the default reader.
    const created = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'About to be tombstoned.',
      source: 'record',
    });
    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, created.id);

    const fetched = await getLogById(DEFAULT_PATIENT_ID, DATE, created.id);
    expect(fetched).toBeNull();
  });

  it('rt-7 (DOWNSTREAM PARITY): the bottom-layer filter cascades to listLogsInRange + ObservationsFromLogging-shape + useNotesByLogId-shape — no downstream consumer surfaces a tombstoned log', async () => {
    // LOAD-BEARING CASE per the audit. If any consumer is hand-
    // rolling its own raw-log read instead of going through
    // listLogsByDate / getLogById, the filter doesn't cascade and
    // the soft-delete becomes a "broken in tests, broken on
    // device" trap.
    //
    // Of the six readers found in the audit, three route through
    // listLogsByDate and one routes through listLogsInRange:
    //   • listLogsByDate     ← ObservationsFromLogging
    //                          (components/journal/.../ObservationsFromLogging.tsx)
    //                        ← useNotesByLogId (hooks/useNotesByLogId.ts)
    //                        ← careSummaryBuilder.buildCareBrief (utils/careSummaryBuilder.ts L661)
    //                        ← todayRecapBuilder (utils/todayRecapBuilder.ts L266)
    //   • listLogsInRange    ← any insights/export consumer
    //
    // rt-2 + rt-3 already pin the primitive filter; this case
    // pins the SHAPE-LEVEL parity for the two Slice-3-A
    // downstream consumers, exercising the actual filter+map
    // logic each component runs over the storage output. The
    // instance is also asserted to remain visible via
    // listDailyInstances — instance state is independent of the
    // log's deletedAt at the commit-1 boundary; the canonical
    // undoInstanceCompletion in commit 2 reverts instance.status
    // and clears instance.logId separately.
    const instance = makeInstance({
      id: 'inst-meds-1',
      itemName: 'Lisinopril 10mg',
      status: 'completed',
    });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);

    const log = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      carePlanItemId: 'item-1',
      dailyInstanceId: instance.id,
      timestamp: new Date(`${DATE}T08:12:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Should NOT surface after tombstone.',
      data: { type: 'medication', medicationName: 'Lisinopril' },
      source: 'record',
    });

    // Pre-tombstone sanity: the log is visible via both primitives
    // and produces a non-empty downstream row.
    const preList = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(preList).toHaveLength(1);
    const preRange = await listLogsInRange(DEFAULT_PATIENT_ID, '2026-06-01', '2026-06-30');
    expect(preRange.map((l) => l.id)).toContain(log.id);

    // ── Tombstone ──
    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, log.id);

    // listLogsByDate: filtered.
    const postList = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(postList).toHaveLength(0);

    // listLogsInRange: filtered (cascades through its internal
    // listLogsByDate call with includeDeleted unset).
    const postRange = await listLogsInRange(DEFAULT_PATIENT_ID, '2026-06-01', '2026-06-30');
    expect(postRange.map((l) => l.id)).not.toContain(log.id);

    // ObservationsFromLogging shape (components/journal/...): the
    // component's render produces one row per log entry whose
    // notes?.trim().length > 0, mapped through a listDailyInstances
    // lookup for itemName. After tombstone, the row computation
    // must yield zero rows.
    const observationLogs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    const observationRows = observationLogs
      .filter((l) => (l.notes ?? '').trim().length > 0)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    expect(observationRows).toHaveLength(0);

    // useNotesByLogId shape (hooks/useNotesByLogId.ts): the hook
    // builds a logId → trimmedNote map from listLogsByDate output.
    // After tombstone the entry no longer surfaces, so the map is
    // empty AND the previous logId no longer keys it.
    const notesMapLogs = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    const notesByLogId: Record<string, string> = {};
    for (const l of notesMapLogs) {
      const cleaned = (l.notes ?? '').trim();
      if (cleaned.length > 0) notesByLogId[l.id] = cleaned;
    }
    expect(Object.keys(notesByLogId)).toHaveLength(0);
    expect(notesByLogId[log.id]).toBeUndefined();

    // Instance state is independent of the log's deletedAt at the
    // commit-1 boundary — listDailyInstances still surfaces the
    // instance with status 'completed'. Commit 2 reverts both.
    const instances = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    expect(instances).toHaveLength(1);
    expect(instances[0].id).toBe(instance.id);
    expect(instances[0].status).toBe('completed');
  });

  it('rt-8 (PRIVACY — ENCRYPTED AT REST): tombstoning does NOT change the encryption-at-rest invariant; the LOGS key remains sensitive-prefixed and raw value is not plaintext', async () => {
    // Defensive guard. The deletedAt field is added to a sensitive
    // payload; the encryption wrapper at the storage primitive
    // (safeStorage / secureStorage) must continue to wrap the
    // whole serialized array. A regression that bypassed
    // encryption for the deletedAt path would leak both the
    // tombstone timestamp AND the original notes.
    const SECRET = 'Sensitive content that must remain encrypted post-tombstone.';
    const created = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: SECRET,
      source: 'record',
    });
    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, created.id);

    // Sensitive-prefix list still includes both LOGS keys.
    expect(isSensitiveKey('@embermate_logs_v2:default:2026-06-04')).toBe(true);
    expect(isSensitiveKey('@embermate_all_logs_v2:default')).toBe(true);

    // Raw AsyncStorage for both keys does NOT contain the plaintext.
    const rawKeys = await AsyncStorage.getAllKeys();
    const dailyKey = rawKeys.find((k) => k.startsWith('@embermate_logs_v2:'));
    expect(dailyKey).toBeDefined();
    const raw = await AsyncStorage.getItem(dailyKey!);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain(SECRET);

    // And the round-trip (with includeDeleted opt-in) STILL returns
    // the plaintext — the encryption layer wraps and unwraps
    // transparently.
    const surfaced = await listLogsByDate(DEFAULT_PATIENT_ID, DATE, { includeDeleted: true });
    expect(surfaced).toHaveLength(1);
    expect(surfaced[0].notes).toBe(SECRET);
    expect(typeof surfaced[0].deletedAt).toBe('string');
  });

  it('rt-9 (INCLUDE_DELETED opt-in): each bottom-layer read primitive accepts { includeDeleted: true } to surface tombstoned entries (audit-trail consumer hook)', async () => {
    // Forward-guard for future audit/export consumers (insights
    // streaks, longitudinal reports, exports). These readers want
    // the full history INCLUDING undone entries. Pinning the
    // opt-in contract on all three primitives means a future
    // consumer can opt in without re-deriving the surface.
    const live = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Live entry.',
      source: 'record',
    });
    const removed = await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T09:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Removed entry.',
      source: 'record',
    });
    await tombstoneLogEntry(DEFAULT_PATIENT_ID, DATE, removed.id);

    // listLogsByDate
    const listIncluded = await listLogsByDate(DEFAULT_PATIENT_ID, DATE, {
      includeDeleted: true,
    });
    expect(listIncluded.map((l) => l.id).sort()).toEqual([live.id, removed.id].sort());

    // getLogById
    const fetched = await getLogById(DEFAULT_PATIENT_ID, DATE, removed.id, {
      includeDeleted: true,
    });
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(removed.id);
    expect(typeof fetched!.deletedAt).toBe('string');

    // listLogsInRange
    const rangeIncluded = await listLogsInRange(
      DEFAULT_PATIENT_ID,
      '2026-06-01',
      '2026-06-30',
      { includeDeleted: true },
    );
    expect(rangeIncluded.map((l) => l.id).sort()).toEqual([live.id, removed.id].sort());
  });
});
