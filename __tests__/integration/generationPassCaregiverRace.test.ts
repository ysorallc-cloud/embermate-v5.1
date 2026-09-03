// ============================================================================
// PART C of the stale-status-write-class closeout.
//
// ensureDailyInstances reads existingInstances ONCE at the top of
// _ensureDailyInstancesCore, then its per-window loop decides a status
// (missed-check / staleness-refresh) and writes per instance. withKeyLock
// serializes the PHYSICAL writes to the same date-key, but the DECISION was
// made from a snapshot read before any lock was ever taken. If a caregiver's
// own write (logInstanceCompletion) lands against the SAME instance after
// that snapshot but before the pass's write executes, the pass's write is
// still built from the stale snapshot and can stomp the caregiver's action —
// e.g. a late-completion overwritten back to 'missed' by a decision that
// never saw the completion.
//
// DETERMINISTIC INTERLEAVE: the loop's per-instance decision is entirely
// synchronous (no await between reading existingMap and calling the write),
// so there's no natural async yield point to inject a competing write at.
// Intercepting safeSetItem inside the pass's OWN write deadlocks (withKeyLock
// isn't reentrant — the injected call would wait on a lock the pass is still
// holding). Instead we intercept listDailyInstances itself: call through to
// the real implementation to capture today's TRUE state, THEN run the
// caregiver's real logInstanceCompletion (mutating real storage), THEN
// return the pre-caregiver snapshot to the caller — reproducing exactly
// "the pass already read a snapshot before the caregiver acted" without
// touching the lock at all. Every read/write in the interleave hits real
// AsyncStorage; nothing about the STORE is mocked, only the timing of when
// this one read's result reaches its caller.
//
// existing-instance date (DATE) and the fake clock's calendar date (a day
// later) are deliberately DIFFERENT: this disambiguates the interception —
// syncOtherBucketsWithConfig's own unconditional meal-migration read
// (carePlanGenerator.ts:540) uses getTodayDateString(), a different key,
// so it can never be mistaken for the "step 3" existingInstances read at
// carePlanGenerator.ts:1274, which uses DATE. It also sidesteps the
// born-overdue guard entirely (guard only applies when date === today).
// ============================================================================

import * as carePlanRepo from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import {
  listDailyInstances,
  logInstanceCompletion,
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
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
}

async function currentInstance(instanceId: string) {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.id === instanceId);
}

describe('a caregiver write landing mid-generation-pass must survive, not be stomped by the pass\'s stale decision', () => {
  useControlledClock();

  it('caregiver logs a late completion WHILE a generation pass is deciding this instance is missed — the completion survives', async () => {
    // Born pending. date !== today here (today is a day earlier), so the
    // born-overdue guard doesn't apply — irrelevant to what's under test.
    jest.setSystemTime(at('07:00', '2026-06-28'));
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
      customTimes: ['08:00'], scheduledTimeHHmm: '08:00', active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const born = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE))
      .find((i) => i.itemType === 'medication')!;
    expect(born.status).toBe('pending');

    // A day later — trivially past the writer's exact+grace cutoff
    // (08:00 + 120min on DATE). getTodayDateString() now returns
    // '2026-06-30', distinct from DATE.
    jest.setSystemTime(at('09:00', '2026-06-30'));

    const originalListDailyInstances = carePlanRepo.listDailyInstances;
    let injected = false;
    jest.spyOn(carePlanRepo, 'listDailyInstances').mockImplementation(
      async (patientId: string, date: string, opts?: any) => {
        const snapshot = await originalListDailyInstances(patientId, date, opts);
        if (!injected && date === DATE) {
          injected = true;
          // The caregiver's own real write, landing between this snapshot
          // read and whatever the pass eventually decides + writes from it.
          await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, born.id, 'taken');
        }
        return snapshot; // the PRE-caregiver-write snapshot, deliberately stale
      },
    );

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    expect(injected).toBe(true);
    const after = await currentInstance(born.id);
    expect(after).toBeDefined();
    // THE ASSERTION THAT CATCHES TRIAGE-A: the caregiver's own logged
    // completion must survive a pass whose decision was made before that
    // completion existed. 'missed' here would mean the pass's stale
    // decision won and discarded the caregiver's action.
    expect(after!.status).toBe('completed');
  });
});
