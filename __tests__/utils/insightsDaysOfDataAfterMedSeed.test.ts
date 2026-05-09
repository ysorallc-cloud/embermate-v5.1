// ============================================================================
// Phase 11.6 — getDistinctInstanceCompletionDays counts medication
// completions across all 14 historical days (post-fix shape).
//
// Bug repro: Insights "PATTERNS COMING — 7 of 14 days" persisted even
// after Phase 11.5.2 added getDistinctInstanceCompletionDays as a
// third source for daysOfData. Root cause: the historical-instance
// seed in initializeSampleData skipped medications, so the function
// only counted past-day wellness/sleep/hydration completions. Some
// caregiver care plans don't enable wellness/sleep/hydration, leaving
// only today's morning instances → 1-7 days returned.
//
// Post-fix: medication completions are seeded 14 days back at ~90%
// adherence. Even on a meds-only care plan,
// getDistinctInstanceCompletionDays now returns 14 across the
// historical window.
//
// This file pins the consumer side of the parity fix. The seed side
// is tested in sampleDataGenerator.medicationInstances.test.ts.
// ============================================================================

import { getDistinctInstanceCompletionDays } from '../../utils/understandInsights';

const mockListDailyInstancesRange = jest.fn();
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  // Other exports stubbed so unrelated imports don't error.
  listLogsInRange: async () => [],
  listCarePlanItems: async () => [],
  getActiveCarePlan: async () => null,
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function medInstance(date: string, status: 'completed' | 'skipped', id: string): any {
  return {
    id,
    carePlanId: 'cp',
    carePlanItemId: id,
    patientId: 'default',
    date,
    scheduledTime: `${date}T08:00:00Z`,
    windowLabel: 'morning',
    windowId: 'morning',
    status,
    itemName: 'Warfarin',
    itemType: 'medication',
    priority: 'required',
    createdAt: date,
    updatedAt: date,
  };
}

beforeEach(() => {
  mockListDailyInstancesRange.mockReset();
});

describe('Phase 11.6 — getDistinctInstanceCompletionDays sees medication completions', () => {
  it('contract 8: post-fix shape — 14 days of medication completions → returns 14', async () => {
    // Simulate the post-fix seeded shape: ~90% completed, ~10% skipped.
    // Skipped status is NOT counted by getDistinctInstanceCompletionDays
    // (only 'completed' counts toward "did the caregiver log a
    // completion this day?"), so the test seeds at least one
    // completed instance per day.
    const instances: any[] = [];
    const today = new Date();
    for (let n = 1; n <= 14; n++) {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      const date = ymd(d);
      // Two meds per day: one completed, one skipped — mirrors the
      // ~90% rate at the per-day level.
      instances.push(medInstance(date, 'completed', `m1-${date}`));
      instances.push(medInstance(date, 'skipped', `m2-${date}`));
    }
    mockListDailyInstancesRange.mockResolvedValue(instances);

    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(14);
  });

  it('contract 9: pre-fix shape (no past-day medication completions) — only today counts', async () => {
    // Regression-pin: with the loop's old filter, past dates have
    // no completed medication instances. Only today's morning
    // pre-completions exist (also for medications). The function
    // therefore returned 1 — way below the 14 threshold.
    const today = ymd(new Date());
    mockListDailyInstancesRange.mockResolvedValue([
      medInstance(today, 'completed', 'today-m1'),
    ]);
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(1);
  });
});
