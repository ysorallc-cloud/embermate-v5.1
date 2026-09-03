// ============================================================================
// PART B of the stale-status-write-class closeout. The two primitives that
// can overwrite status on an EXISTING instance ID — updateDailyInstanceStatus
// and upsertDailyInstances — had no knowledge of instance-status semantics at
// all: either would happily write 'pending' over an acted status from ANY
// caller, present or future. NOT.B3 (carePlanGenerator.ts) was one caller
// that did this by accident; nothing stopped a different caller from doing
// the same thing tomorrow.
//
// INVARIANT (exact wording): No write may transition an instance from a
// caregiver-acted status (completed | skipped | partial | missed) back to
// 'pending', except via an explicitly authorized undo path
// ({ reason: 'undo' } — not a boolean, not a global flag).
//
// FAILURE SEMANTICS — both, not either:
//   - Auto-correct: preserve the acted status (+ its logId/skipReason), but
//     still apply every OTHER field the write intended (mirrors what the
//     NOT.B3 fix already does deliberately for scheduledTime).
//   - Loud: throw in dev/test (__DEV__ is true in Jest — jest.setup.js:7)
//     so the offending caller surfaces immediately instead of a silent
//     no-op reaching production undetected as instance #5 of this class.
// ============================================================================

import {
  listDailyInstances,
  updateDailyInstanceStatus,
  upsertDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance } from '../../types/carePlan';

const DATE = '2026-06-29';

async function seedPendingInstance(overrides: Partial<DailyCareInstance> = {}): Promise<DailyCareInstance> {
  const instance: DailyCareInstance = {
    id: 'inst-1',
    carePlanId: 'plan-1',
    carePlanItemId: 'item-1',
    patientId: DEFAULT_PATIENT_ID,
    date: DATE,
    scheduledTime: `${DATE}T08:00:00`,
    windowLabel: 'morning',
    windowId: 'morning',
    status: 'pending',
    itemName: 'Acetaminophen',
    itemType: 'medication',
    priority: 'required',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  // Seeding the STARTING row directly is the setup, not the act under
  // test — the act under test is the primitive call below. Reaching the
  // "acted" starting states via the real writer (logInstanceCompletion)
  // for the completed/skipped cases, so those two are driven end to end;
  // 'missed' and 'partial' aren't independently reachable that way without
  // pulling in the whole generator/grace-window setup for what is a
  // primitive-level test, so those two seed directly — still real
  // AsyncStorage, just not routed through the generator.
  await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);
  return instance;
}

async function currentInstance(id = 'inst-1'): Promise<DailyCareInstance> {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.id === id)!;
}

const ACTED_CASES: Array<{ status: DailyCareInstance['status']; via: 'log' | 'seed' }> = [
  { status: 'completed', via: 'log' },
  { status: 'skipped', via: 'log' },
  { status: 'missed', via: 'seed' },
  { status: 'partial', via: 'seed' },
];

describe('write-boundary guard — updateDailyInstanceStatus', () => {
  it.each(ACTED_CASES)('$status -> pending is BLOCKED (auto-corrected + throws in dev/test)', async ({ status, via }) => {
    if (via === 'log') {
      await seedPendingInstance();
      await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, 'inst-1', status === 'completed' ? 'taken' : 'skipped');
    } else {
      await seedPendingInstance({ status, logId: 'log-x' });
    }
    expect((await currentInstance()).status).toBe(status);

    await expect(
      updateDailyInstanceStatus(DEFAULT_PATIENT_ID, DATE, 'inst-1', 'pending'),
    ).rejects.toThrow();

    // Auto-corrected: the acted status survives the blocked write.
    expect((await currentInstance()).status).toBe(status);
  });

  it('pending -> completed is ALLOWED (guard only blocks the reverse)', async () => {
    await seedPendingInstance();
    await updateDailyInstanceStatus(DEFAULT_PATIENT_ID, DATE, 'inst-1', 'completed', 'log-1');
    expect((await currentInstance()).status).toBe('completed');
  });

  it('an authorized undo write ({ reason: \'undo\' }) IS allowed to transition an acted status to pending', async () => {
    await seedPendingInstance();
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, 'inst-1', 'taken');
    expect((await currentInstance()).status).toBe('completed');

    const reverted = await updateDailyInstanceStatus(
      DEFAULT_PATIENT_ID, DATE, 'inst-1', 'pending', undefined, undefined, { reason: 'undo' },
    );
    expect(reverted).not.toBeNull();
    expect(reverted!.status).toBe('pending');
  });
});

describe('write-boundary guard — upsertDailyInstances', () => {
  it.each(ACTED_CASES)('$status -> pending is BLOCKED, but a non-status field (scheduledTime) in the SAME write still applies', async ({ status, via }) => {
    if (via === 'log') {
      await seedPendingInstance();
      await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, 'inst-1', status === 'completed' ? 'taken' : 'skipped');
    } else {
      await seedPendingInstance({ status, logId: 'log-x' });
    }
    const before = await currentInstance();
    expect(before.status).toBe(status);

    await expect(
      upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [
        { ...before, status: 'pending', scheduledTime: `${DATE}T09:30:00` },
      ]),
    ).rejects.toThrow();

    const after = await currentInstance();
    // Status protected...
    expect(after.status).toBe(status);
    expect(after.logId).toBe(before.logId);
    // ...but the legitimate field change in the SAME write still landed —
    // mirrors what the NOT.B3 fix does deliberately in carePlanGenerator.ts.
    expect(after.scheduledTime).toBe(`${DATE}T09:30:00`);
  });

  it('pending -> completed via bulk upsert is ALLOWED (guard only blocks the reverse)', async () => {
    const seeded = await seedPendingInstance();
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [
      { ...seeded, status: 'completed', logId: 'log-1' },
    ]);
    expect((await currentInstance()).status).toBe('completed');
  });

  it('a brand-new instance id (no existing record) writing pending is ALLOWED — nothing to protect', async () => {
    const fresh: DailyCareInstance = {
      id: 'inst-new',
      carePlanId: 'plan-1',
      carePlanItemId: 'item-2',
      patientId: DEFAULT_PATIENT_ID,
      date: DATE,
      scheduledTime: `${DATE}T08:00:00`,
      windowLabel: 'morning',
      windowId: 'morning',
      status: 'pending',
      itemName: 'New item',
      itemType: 'medication',
      priority: 'required',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await expect(upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [fresh])).resolves.not.toThrow();
    expect((await currentInstance('inst-new')).status).toBe('pending');
  });

  it('BATCH SAFETY: one blocked instance in a 5-item batch does NOT drop the other 4 legitimate writes — the throw fires after the WHOLE batch persists', async () => {
    // 5 pending instances, all in ONE upsertDailyInstances call.
    const items = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        seedPendingInstance({ id: `inst-${i + 1}`, carePlanItemId: `item-${i + 1}` }),
      ),
    );
    // Item 3 gets acted on for real (completed) via the production write
    // path, matching the "instance 3 violates the guard" framing exactly.
    await logInstanceCompletion(DEFAULT_PATIENT_ID, DATE, 'inst-3', 'taken');
    expect((await currentInstance('inst-3')).status).toBe('completed');

    // ONE batch: items 1,2,4,5 legitimately move to 'completed' with a
    // fresh scheduledTime; item 3 illegally tries completed -> pending.
    const batch = items.map((it) =>
      it.id === 'inst-3'
        ? { ...it, status: 'pending' as const, scheduledTime: `${DATE}T09:00:00` } // BLOCKED
        : { ...it, status: 'completed' as const, logId: `log-${it.id}` }, // legitimate
    );

    await expect(upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, batch)).rejects.toThrow();

    // THE ASSERTION: items 1,2,4,5's legitimate writes are NOT dropped —
    // they persisted in the SAME write that included the blocked item 3,
    // which happened BEFORE the throw fired.
    for (const id of ['inst-1', 'inst-2', 'inst-4', 'inst-5']) {
      const after = await currentInstance(id);
      expect(after.status).toBe('completed');
      expect(after.logId).toBe(`log-${id}`);
    }
    // Item 3 itself: protected (still completed, not clobbered to pending).
    const item3After = await currentInstance('inst-3');
    expect(item3After.status).toBe('completed');
  });
});
