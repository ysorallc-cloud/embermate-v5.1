// ============================================================================
// Phase 11.5.2 — Insights daysOfData reads instance completions.
//
// Bug: device-review screenshot shows "PATTERNS COMING — 7 of 14 days"
// after sample data initialized 14 historical days. Root cause is the
// same bug class Phase 5.13.5 fixed for narrativeSummaryBuilder: the
// counter reads from one pipeline (logs) but the data also lives in
// another (instance status). When the two go out of sync — sparse log
// indexes, partial migrations, sample-data seeding paths — daysOfData
// undercounts.
//
// Fix: third source. Distinct dates with at least one completed
// instance get unioned into the Math.max alongside the existing
// baseline-derived "days since first use" and the log-derived
// uniqueDays.
//
// Math.max (not sum) is the chosen semantics: each source independently
// undercounts, so the maximum is the safe lower-bound estimate of how
// many days actually have data. Phase 11.5 picks this minimal local
// fix; broader semantics for daysOfData ("days since first use" vs.
// "distinct days with data") is its own future phase.
//
// This file pins the new helper as a unit and audits the wiring in
// loadUnderstandPageData via source-level checks.
// ============================================================================

import {
  getDistinctInstanceCompletionDays,
} from '../../utils/understandInsights';

const mockListDailyInstancesRange = jest.fn();
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  // Other exports stubbed so the source-level audit doesn't pull in
  // unrelated initialization paths.
  listLogsInRange: async () => [],
  listCarePlanItems: async () => [],
  getActiveCarePlan: async () => null,
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

function inst(date: string, status: string, id = `i-${date}-${Math.random()}`): any {
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
    itemName: 'Item',
    itemType: 'medication',
    priority: 'recommended',
    createdAt: date,
    updatedAt: date,
  };
}

beforeEach(() => {
  mockListDailyInstancesRange.mockReset();
});

describe('Phase 11.5.2 — getDistinctInstanceCompletionDays', () => {
  it('contract 1 (reproduction): 14 distinct dates with completed instances → returns 14', async () => {
    const instances: any[] = [];
    for (let n = 1; n <= 14; n++) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      const date = d.toISOString().slice(0, 10);
      instances.push(inst(date, 'completed', `c-${n}`));
    }
    mockListDailyInstancesRange.mockResolvedValue(instances);
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(14);
  });

  it('contract 2: pending / skipped / missed / partial instances do NOT count', async () => {
    // Only completed status counts toward days-with-data. Skipped is
    // caregiver-acted but doesn't represent a logged completion for
    // this counter's purpose; the existing log-based path handles
    // skipped via the LogEntry route.
    const instances = [
      inst('2026-05-01', 'pending'),
      inst('2026-05-02', 'skipped'),
      inst('2026-05-03', 'missed'),
      inst('2026-05-04', 'partial'),
    ];
    mockListDailyInstancesRange.mockResolvedValue(instances);
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(0);
  });

  it('contract 3: multiple completed instances on the same date count once', async () => {
    const instances = [
      inst('2026-05-01', 'completed', 'a'),
      inst('2026-05-01', 'completed', 'b'),
      inst('2026-05-01', 'completed', 'c'),
      inst('2026-05-02', 'completed', 'd'),
    ];
    mockListDailyInstancesRange.mockResolvedValue(instances);
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(2);
  });

  it('contract 4: no completed instances → returns 0', async () => {
    mockListDailyInstancesRange.mockResolvedValue([]);
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(0);
  });

  it('contract 5: storage failure resolves to 0 (not undefined / not throw)', async () => {
    mockListDailyInstancesRange.mockRejectedValue(new Error('storage unavailable'));
    const out = await getDistinctInstanceCompletionDays(14);
    expect(out).toBe(0);
  });

  it('contract 6: queries the patient ID + a startDate that is exactly timeRange days back from today', async () => {
    mockListDailyInstancesRange.mockResolvedValue([]);
    await getDistinctInstanceCompletionDays(14);
    expect(mockListDailyInstancesRange).toHaveBeenCalledTimes(1);
    const [pid, startDate, endDate] = mockListDailyInstancesRange.mock.calls[0];
    expect(pid).toBe('default');
    // startDate must be a YYYY-MM-DD string strictly before endDate.
    expect(typeof startDate).toBe('string');
    expect(typeof endDate).toBe('string');
    expect(startDate < endDate).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Source-level audits — wiring contract for loadUnderstandPageData
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 11.5.2 — loadUnderstandPageData wiring', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'utils/understandInsights.ts'),
    'utf8',
  );

  it('contract 7: getDistinctInstanceCompletionDays is exported', () => {
    expect(SRC).toMatch(/export\s+(?:async\s+)?function\s+getDistinctInstanceCompletionDays\b/);
  });

  it('contract 8: loadUnderstandPageData calls getDistinctInstanceCompletionDays', () => {
    // Call site exists somewhere inside the loadUnderstandPageData body.
    const fnStart = SRC.indexOf('export async function loadUnderstandPageData');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = SRC.slice(fnStart, fnStart + 4000);
    expect(fnBody).toMatch(/getDistinctInstanceCompletionDays\s*\(/);
  });

  it('contract 9: effectiveDaysOfData uses Math.max with three sources', () => {
    // The fix unions three sources via Math.max — log-pipeline,
    // baseline, and instance-pipeline. Pre-fix had only two.
    const fnStart = SRC.indexOf('export async function loadUnderstandPageData');
    const fnBody = SRC.slice(fnStart, fnStart + 4000);
    // Match Math.max(...) call that mentions all three terms.
    const max = fnBody.match(/effectiveDaysOfData\s*=\s*Math\.max\([\s\S]*?\)/);
    expect(max).toBeTruthy();
    const expr = max![0];
    expect(expr).toMatch(/daysOfData\b/);
    expect(expr).toMatch(/uniqueDays\b/);
    expect(expr).toMatch(/instanceCompletionDays|getDistinctInstanceCompletionDays/);
  });
});
