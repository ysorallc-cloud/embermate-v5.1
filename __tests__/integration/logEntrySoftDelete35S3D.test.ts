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
  resurrectLogEntry,
  logInstanceCompletion,
  undoInstanceCompletion,
  listLogsByDate,
  getLogById,
  listLogsInRange,
  listDailyInstances,
  getDailyInstance,
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
  afterEach(() => {
    // No-op for tests that never faked timers; restores real time for
    // rt-4, which pins its own clock (see that test's comment).
    jest.useRealTimers();
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

  it('rt-4 (INSTANCE REVERTS): undoInstanceCompletion soft-deletes the linked LogEntry, clears instance.logId, AND reverts instance.status to "pending" — three changes, one canonical call', async () => {
    // Pinned clock (stale-status-write-class closeout, PART A follow-up):
    // makeInstance() bakes scheduledTime '08:00' anchored to DATE
    // (2026-06-04), and this test previously ran on real wall-clock time
    // with no pin. undoInstanceCompletion used to write 'pending'
    // unconditionally — the only reason this assertion passed regardless
    // of how long ago DATE was relative to whenever the suite ran.
    // Post-fix, undoing this instance's first-ever act (no prior log)
    // recomputes what it would be RIGHT NOW via getCareItemStatus (see
    // undoRestoresPriorStatus.test.ts case 4 — deliberately "at undo
    // time"), and a medication scheduled months in the past genuinely
    // reads 'missed'. Pin the clock to just after the scheduled time so
    // this test stays about the three-changes-one-call unification
    // contract it's actually named for, not entangled with staleness.
    jest.useFakeTimers({
      doNotFake: [
        'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance',
      ],
    });
    jest.setSystemTime(new Date(`${DATE}T08:15:00`));
    // The unification contract. Pre-3-D the codebase had TWO undo
    // paths with divergent semantics:
    //   • handleQuickLog / handleQuickSkip → undoInstanceCompletion
    //     (HARD-deleted via deleteLogEntry; instance.logId
    //     cleared; status reverted to pending)
    //   • handleQuickConfirm → updateDailyInstanceStatus(..., 'pending')
    //     ONLY (log left dangling; instance.logId NOT cleared
    //     in the comment at app/(tabs)/now.tsx L1167-1170 the
    //     dangling log was acknowledged as a "best-effort
    //     revert")
    // The 3-D unification canonicalizes undoInstanceCompletion to
    // do three things atomically: soft-delete (tombstone) the
    // log, clear instance.logId, revert status to pending.
    // All four trigger paths route through this single fn in
    // commits 2 + 3 (handleQuickLog, handleQuickSkip,
    // handleQuickConfirm, plus the new long-press affordance).
    const instance = makeInstance({ id: 'inst-confirm-1', itemName: 'Atenolol 50mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);

    // logInstanceCompletion is the production write path. After
    // the call the instance has logId set and status 'completed'.
    const result = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      DATE,
      instance.id,
      'completed',
      { type: 'medication' },
      { notes: 'Took with breakfast.', source: 'record' },
    );
    expect(result).not.toBeNull();
    const originalLogId = result!.log.id;
    {
      const preUndo = await getDailyInstance(DEFAULT_PATIENT_ID, DATE, instance.id);
      expect(preUndo!.status).toBe('completed');
      expect(preUndo!.logId).toBe(originalLogId);
    }

    // ── Canonical undo ──
    await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instance.id);

    // Log soft-deleted (hide-not-delete preserved — audit trail
    // accessible via includeDeleted opt-in).
    const visible = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(visible).toHaveLength(0);
    const raw = await listLogsByDate(DEFAULT_PATIENT_ID, DATE, { includeDeleted: true });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(originalLogId);
    expect(typeof raw[0].deletedAt).toBe('string');

    // Instance: status reverted, logId cleared.
    const reverted = await getDailyInstance(DEFAULT_PATIENT_ID, DATE, instance.id);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('pending');
    expect(reverted!.logId).toBeUndefined();
  });

  it('rt-5 (RE-CONFIRM after UNDO creates a NEW LogEntry, NOT a resurrection of the old): the soft-deleted entry stays soft-deleted; re-confirming generates a fresh log with a distinct id', async () => {
    // After undo, the caregiver may re-confirm (e.g. they meant
    // to confirm but mis-read the row). That re-confirm is a
    // SEPARATE caregiver action from the original confirm — it
    // gets its own LogEntry with its own timestamp. The
    // soft-deleted original stays tombstoned (audit trail of
    // "caregiver tried, undid, tried again"). The redo path
    // (rt-6) is the ONLY way to resurrect the original; once
    // re-confirm runs, the original is permanently tombstoned.
    const instance = makeInstance({ id: 'inst-reconfirm-1', itemName: 'Lisinopril 10mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);

    const first = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      DATE,
      instance.id,
      'completed',
      { type: 'medication' },
      { notes: 'First take.', source: 'record' },
    );
    const firstLogId = first!.log.id;

    await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instance.id);

    // Re-confirm (new caregiver action; could have different notes).
    const second = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      DATE,
      instance.id,
      'completed',
      { type: 'medication' },
      { notes: 'Second take, this one stays.', source: 'record' },
    );
    const secondLogId = second!.log.id;

    expect(secondLogId).not.toBe(firstLogId);

    // Default read shows ONLY the new log. Audit-trail read shows both.
    const visible = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(secondLogId);
    expect(visible[0].notes).toBe('Second take, this one stays.');

    const audit = await listLogsByDate(DEFAULT_PATIENT_ID, DATE, { includeDeleted: true });
    expect(audit).toHaveLength(2);
    const auditFirst = audit.find((l) => l.id === firstLogId);
    const auditSecond = audit.find((l) => l.id === secondLogId);
    expect(auditFirst!.notes).toBe('First take.');
    expect(auditFirst!.deletedAt).toBeDefined();
    expect(auditSecond!.notes).toBe('Second take, this one stays.');
    expect(auditSecond!.deletedAt).toBeUndefined();

    // Instance points at the new log.
    const inst = await getDailyInstance(DEFAULT_PATIENT_ID, DATE, instance.id);
    expect(inst!.logId).toBe(secondLogId);
    expect(inst!.status).toBe('completed');
  });

  it('rt-6 (REDO within window): resurrectLogEntry clears deletedAt, relinks instance.logId, AND restores instance.status to "completed"', async () => {
    // The 5s post-undo toast offers a Redo affordance (Q-3D.8
    // lock). Tapping Redo resurrects the just-undone log
    // (clears deletedAt) AND relinks instance.logId AND
    // restores instance.status. This is the ONLY way to keep
    // the original LogEntry id + notes + timestamp after an
    // undo — after the 5s window closes (and after a re-confirm
    // creates a new log per rt-5) the original is permanently
    // tombstoned.
    //
    // The status restoration is needed because undo (rt-4) sets
    // status='pending' atomically with tombstone; redo must
    // unwind both. Outcome is read from the log itself so the
    // 'taken' / 'completed' / 'skipped' / 'partial' / 'missed'
    // distinction survives.
    const instance = makeInstance({ id: 'inst-redo-1', itemName: 'Aspirin 81mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);

    const first = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      DATE,
      instance.id,
      'completed',
      { type: 'medication' },
      { notes: 'Original observation.', source: 'record' },
    );
    const originalLogId = first!.log.id;

    await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instance.id);

    // ── Redo ──
    await resurrectLogEntry(DEFAULT_PATIENT_ID, DATE, originalLogId);

    // Log: deletedAt cleared, content preserved verbatim.
    const fetched = await getLogById(DEFAULT_PATIENT_ID, DATE, originalLogId);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(originalLogId);
    expect(fetched!.notes).toBe('Original observation.');
    expect(fetched!.deletedAt).toBeUndefined();

    // Instance: logId relinked, status restored to the outcome's
    // mapped state ('completed').
    const restored = await getDailyInstance(DEFAULT_PATIENT_ID, DATE, instance.id);
    expect(restored).not.toBeNull();
    expect(restored!.logId).toBe(originalLogId);
    expect(restored!.status).toBe('completed');
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
