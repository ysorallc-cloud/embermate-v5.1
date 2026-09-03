// ============================================================================
// PART A of the stale-status-write-class closeout (NOT.B3 was manifestation
// #4). undoInstanceCompletion (storage/carePlanRepo.ts) wrote 'pending'
// unconditionally — wrong for any instance that was MISSED before the
// caregiver logged a late completion, or SKIPPED before a later re-log.
//
// PRODUCT RULING (locked): undo restores the PRIOR TRUTH, not a blanket
// reset. Recomputed AT UNDO TIME (not at the moment the completion
// happened) — matching what the rest of the app would already show if the
// instance had never been acted on. This is deliberate, not incidental:
// case 4 below specifically proves the "at undo time" semantic, since an
// on-time completion undone days later must read missed NOW, not pending
// forever.
//
// ALL FOUR scenarios drive the REAL writers end to end — addMedicationToPlan
// -> ensureDailyInstances (the real missed-check, not a hand-set status) ->
// logInstanceCompletion -> undoInstanceCompletion -> listDailyInstances. No
// synthetic instance arrays.
// ============================================================================

import {
  ensureDailyInstances,
} from '../../services/carePlanGenerator';
import {
  listDailyInstances,
  logInstanceCompletion,
  undoInstanceCompletion,
  listLogsByDate,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { addMedicationToPlan } from '../../storage/carePlanConfigRepo';

const DATE = '2026-06-29';
const at = (hhmm: string, date = DATE) => new Date(`${date}T${hhmm}:00`);

function useControlledClock() {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: [
        'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance',
      ],
    });
  });
  afterEach(() => { jest.useRealTimers(); });
}

async function seedMedAndGenerate() {
  jest.setSystemTime(at('07:00'));
  const med = await addMedicationToPlan(DEFAULT_PATIENT_ID, {
    name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
    customTimes: ['08:00'], scheduledTimeHHmm: '08:00', active: true,
  } as any);
  await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
  const born = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
    .find((i) => i.itemType === 'medication')!;
  expect(born.status).toBe('pending');
  return { med, instanceId: born.id };
}

async function currentInstance(instanceId: string) {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
    .find((i) => i.id === instanceId)!;
}

describe('undoInstanceCompletion restores prior status (not a blanket pending reset)', () => {
  useControlledClock();

  it('case 1 — PENDING -> completed -> undone => pending', async () => {
    const { instanceId } = await seedMedAndGenerate();

    // Within the medication exact+grace window (08:00 + 30min = 08:30) —
    // still genuinely pending when logged.
    jest.setSystemTime(at('08:15'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('pending');
  });

  it('case 2 — MISSED -> completed -> undone => missed (a late completion does not erase the miss)', async () => {
    const { instanceId } = await seedMedAndGenerate();

    // Past the WRITER's exact+grace cutoff (08:00 + MISSED_GRACE_PERIOD_MINUTES
    // 120min = 10:00) — a real ensureDailyInstances pass genuinely persists
    // missed. NOT hand-set. (The READER's live-derived "overdue" boundary is
    // a separate, earlier +30min threshold — doesn't apply here; this is the
    // writer's own persisted-missed cutoff.)
    jest.setSystemTime(at('10:30'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    expect((await currentInstance(instanceId)).status).toBe('missed');

    // Caregiver logs a late completion — overwrites missed with completed.
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('missed');
  });

  it('case 3 — SKIPPED -> completed -> undone => skipped, with the original skipReason restored', async () => {
    const { instanceId } = await seedMedAndGenerate();

    jest.setSystemTime(at('08:10'));
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, DATE, instanceId, 'skipped', undefined,
      { skipReason: 'refused' },
    );
    expect((await currentInstance(instanceId)).status).toBe('skipped');

    // Caregiver changes their mind and logs it as taken after all — the
    // Now-tab inline checkbox blocks re-logging over a non-pending row,
    // but the detail log screens (log-vitals.tsx etc.) don't gate on
    // current status, so this IS reachable via the "Add" flow off the
    // skip's toast.
    jest.setSystemTime(at('08:20'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('skipped');
    expect(reverted!.skipReason).toBe('refused');
  });

  it('case 3b — PRECEDENCE: a prior LogEntry wins even when it disagrees with what the getCareItemStatus recompute would say', async () => {
    // Same shape as case 3 (skip, then a later completion over it), but
    // undo happens DAYS LATER — long past grace. If undo used the
    // time-derived recompute (case 4's mechanism) here, it would say
    // 'missed' (the window closed days ago). The prior-log branch is
    // checked FIRST and short-circuits before the recompute ever runs —
    // this proves that precedence, not just that skip survives when the
    // two paths happen to agree (case 3 undoes within the same session,
    // where recompute would ALSO still say something other than missed).
    const { instanceId } = await seedMedAndGenerate();

    jest.setSystemTime(at('08:10'));
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, DATE, instanceId, 'skipped', undefined,
      { skipReason: 'refused' },
    );
    jest.setSystemTime(at('08:20'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    // Sanity: if recompute ran here instead of the prior-log branch, it
    // would say 'missed' — same clock jump as case 4.
    jest.setSystemTime(at('08:15', '2026-07-04'));
    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    // THE PRECEDENCE ASSERTION: prior log ('skipped') wins over what
    // recompute would have said ('missed') at this same instant.
    expect(reverted!.status).toBe('skipped');
    expect(reverted!.skipReason).toBe('refused');
  });

  it('case 4 — undo performed DAYS LATER, long past grace => missed (recomputed AT UNDO TIME, not at completion time)', async () => {
    const { instanceId } = await seedMedAndGenerate();

    // On-time completion — genuinely pending when logged.
    jest.setSystemTime(at('08:15'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    // Undo happens 5 days later. If undo restored "what it was AT
    // COMPLETION TIME" this would be 'pending' — but that's stale/wrong
    // by the time undo actually runs: the window closed days ago, and the
    // very next ensureDailyInstances pass would immediately re-mark it
    // missed anyway. The ruling is "prior truth AT UNDO TIME".
    jest.setSystemTime(at('08:15', '2026-07-04'));
    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('missed');
  });

  it('regression guard: the completion LogEntry is tombstoned on undo in every case (unchanged behavior)', async () => {
    const { instanceId } = await seedMedAndGenerate();
    jest.setSystemTime(at('08:15'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');

    const logsBefore = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logsBefore.some((l) => l.dailyInstanceId === instanceId)).toBe(true);

    await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);

    const logsAfter = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    // Default read hides tombstoned entries — the completion log should no
    // longer surface as a live log.
    expect(logsAfter.some((l) => l.dailyInstanceId === instanceId && l.outcome === 'taken')).toBe(false);
  });

  // --------------------------------------------------------------------
  // Reviewer-requested (pre-commit gate, undated): priorLog is a LIST —
  // audit the selection rule for skip -> unskip -> complete -> undo, and
  // separately pin what happens when the only "prior" candidate is itself
  // tombstoned.
  // --------------------------------------------------------------------

  it('case 5 — skip -> unskip -> complete -> undo: the tombstoned skip is NOT resurrected; falls through to time-derive', async () => {
    const { instanceId } = await seedMedAndGenerate();

    // 1. skip
    jest.setSystemTime(at('08:10'));
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, DATE, instanceId, 'skipped', undefined,
      { skipReason: 'refused' },
    );
    expect((await currentInstance(instanceId)).status).toBe('skipped');

    // 2. unskip == undo the skip. No earlier log exists, so this already
    // exercises the derive branch itself; well within the +30min live
    // "overdue" boundary (08:00 -> 08:30) so it derives back to pending.
    jest.setSystemTime(at('08:12'));
    const afterUnskip = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(afterUnskip!.status).toBe('pending');

    // Pin the mechanism: the skip LogEntry is now tombstoned (hidden from
    // the default listLogsByDate read) — this IS the "priorLog exists but
    // is tombstoned" case from the same underlying lookup the final undo
    // below performs.
    const logsAfterUnskip = await listLogsByDate(DEFAULT_PATIENT_ID, DATE);
    expect(logsAfterUnskip.some((l) => l.dailyInstanceId === instanceId)).toBe(false);
    const logsAfterUnskipIncludingDeleted = await listLogsByDate(
      DEFAULT_PATIENT_ID, DATE, { includeDeleted: true },
    );
    const skipLog = logsAfterUnskipIncludingDeleted.find(
      (l) => l.dailyInstanceId === instanceId && l.outcome === 'skipped',
    );
    expect(skipLog?.deletedAt).toBeTruthy();

    // 3. complete — creates a brand-new log (log2); the tombstoned skip
    // log (log1) is untouched.
    jest.setSystemTime(at('08:15'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');
    expect((await currentInstance(instanceId)).status).toBe('completed');

    // 4. undo the completion. PRODUCT RULING: undo restores the prior
    // truth — the truth immediately before step 3 was 'pending' (that's
    // what step 2 had just landed it on). The tombstoned skip from step 1
    // is NOT that prior truth anymore; unskip already consumed it.
    //
    // Selection rule as implemented: listLogsByDate's default read (used
    // by the priorLog lookup) excludes deletedAt entries, so the
    // tombstoned skip log is invisible to the `.filter().sort()[0]`
    // lookup regardless of timestamp ordering — priorLog resolves to
    // undefined and the fn falls through to the getCareItemStatus
    // time-derive branch, evaluated at THIS undo's current time (08:16),
    // still inside the 08:00->08:30 pending window.
    jest.setSystemTime(at('08:16'));
    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('pending');
    expect(reverted!.skipReason).toBeUndefined();
  });

  it('case 6 — priorLog pool has a tombstoned MOST-RECENT entry and an older LIVE one: the older live entry wins, not "no prior"', async () => {
    // Distinct from case 5: case 5's pool was empty (zero live candidates).
    // Here the pool has two candidates and the more-recent one is dead —
    // proving the lookup is "most recent AMONG LIVE ones", not "most
    // recent overall, bail out if it's dead".
    const { instanceId } = await seedMedAndGenerate();

    // log1 (skip) — stays live the whole test.
    jest.setSystemTime(at('08:05'));
    await logInstanceCompletion(
      DEFAULT_PATIENT_ID, DATE, instanceId, 'skipped', undefined,
      { skipReason: 'refused' },
    );

    // log2 (complete) — directly over the still-live skip, same as case 3.
    jest.setSystemTime(at('08:10'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');

    // undo log2 -> tombstones log2; priorLog pool = {log1} (live) -> picks
    // log1 -> restores 'skipped'. (Same mechanism as case 3, just setting
    // up log2 as the now-tombstoned, more-recent-timestamp entry below.)
    jest.setSystemTime(at('08:11'));
    const afterFirstUndo = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(afterFirstUndo!.status).toBe('skipped');

    // log3 (complete again) — instance.logId now points at log3; log1
    // live, log2 tombstoned.
    jest.setSystemTime(at('08:12'));
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId, 'taken');

    // Final undo: undoes log3. priorLog candidate pool excludes log3 (by
    // id, being undone) and log2 (tombstoned) — even though log2's
    // timestamp (08:10) is MORE RECENT than log1's (08:05). Only log1
    // survives the live-filter, so it must be selected despite not being
    // the most-recent-by-timestamp of the full (unfiltered) set.
    jest.setSystemTime(at('08:13'));
    const reverted = await undoInstanceCompletion(DEFAULT_PATIENT_ID, DATE, instanceId);
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('skipped');
    expect(reverted!.skipReason).toBe('refused');
  });
});
