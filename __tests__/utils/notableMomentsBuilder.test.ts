// ============================================================================
// Phase 11.8.2 — buildNotableMoments inline call-outs.
//
// Surfaces 1-3 day-level deltas beneath the Today recap:
//   "BP 132/82 — 8 points above this week's average"
//   "Refused breakfast — first time in 14 days"
//   "Slept 9.5 hours — longest in 2 weeks"
//
// Tone: observational, not interpretive. No "concerning" / "alarming"
// / "good sign". Just the fact + the comparison. Same forbidden-
// vocab spirit as narrativeSummaryBuilder factualOnly +
// todayRecapBuilder.
//
// Priority: BP/glucose anomalies > meal patterns > sleep deltas.
// Capped at 3 (configurable via options.max).
//
// Pinned contracts:
//   1. Empty data → hasMoments false / no moments.
//   2. BP today ≥ 8 systolic points off the week's avg → moment fires.
//   3. BP within tolerance → no BP moment.
//   4. Glucose anomaly threshold ≥ 20 mg/dL.
//   5. Meal refused on today + clean prior 14 days → "first time in
//      14 days" framing.
//   6. Sleep duration ≥ 1.5h above OR below the 14-day mean.
//   7. Multiple anomalies — priority order BP > glucose > weight >
//      meals > sleep, capped at 3.
//   8. No interpretive vocabulary anywhere in the output.
//   9. Patient-agnostic — no "Mom" / "Dad" interpolation.
// ============================================================================

import {
  buildNotableMoments,
  NotableMoment,
} from '../../utils/notableMomentsBuilder';

const mockListDailyInstancesRange = jest.fn();
const mockListLogsInRange = jest.fn();
const mockGetVitalsInRange = jest.fn();

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  listLogsInRange: (...args: any[]) => mockListLogsInRange(...args),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: (...args: any[]) => mockGetVitalsInRange(...args),
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

const TODAY = '2026-05-09';

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function priorDay(daysAgo: number): string {
  const d = new Date(`${TODAY}T12:00:00`);
  d.setDate(d.getDate() - daysAgo);
  return ymd(d);
}

function vital(type: string, value: number, date: string, hour = 8): any {
  return {
    id: `v-${type}-${date}-${value}`,
    type,
    value,
    timestamp: `${date}T${pad2(hour)}:00:00`,
    unit: type === 'glucose' ? 'mg/dL'
      : type === 'weight' ? 'lbs'
      : type === 'heartRate' ? 'bpm'
      : type === 'systolic' || type === 'diastolic' ? 'mmHg'
      : '',
  };
}

function inst(overrides: Partial<any> = {}): any {
  return {
    id: `i-${Math.random()}`,
    carePlanId: 'cp',
    carePlanItemId: `item-${Math.random()}`,
    patientId: 'default',
    date: TODAY,
    scheduledTime: `${TODAY}T08:00:00Z`,
    windowLabel: 'morning',
    windowId: 'morning',
    status: 'completed',
    itemName: 'Item',
    itemType: 'medication',
    priority: 'recommended',
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  };
}

function log(overrides: Partial<any> = {}): any {
  return {
    id: `log-${Math.random()}`,
    patientId: 'default',
    timestamp: `${TODAY}T08:30:00Z`,
    date: TODAY,
    outcome: 'completed',
    source: 'now',
    immutable: true,
    createdAt: `${TODAY}T08:30:00Z`,
    ...overrides,
  };
}

function setMocks(opts: { instances?: any[]; logs?: any[]; vitals?: any[] }) {
  mockListDailyInstancesRange.mockResolvedValue(opts.instances ?? []);
  mockListLogsInRange.mockResolvedValue(opts.logs ?? []);
  mockGetVitalsInRange.mockResolvedValue(opts.vitals ?? []);
}

beforeEach(() => {
  mockListDailyInstancesRange.mockReset();
  mockListLogsInRange.mockReset();
  mockGetVitalsInRange.mockReset();
});

// ----------------------------------------------------------------------------
// Contracts
// ----------------------------------------------------------------------------

describe('Phase 11.8.2 — buildNotableMoments', () => {
  it('contract 1: empty data → no moments', async () => {
    setMocks({});
    const out = await buildNotableMoments(TODAY);
    expect(out.hasMoments).toBe(false);
    expect(out.moments).toEqual([]);
  });

  it('contract 2: BP today ≥ 8 systolic points above week avg → moment fires', async () => {
    // Today: 140/85. Last 7 days: 130/82 each → systolic delta = 10.
    const vitals: any[] = [
      vital('systolic', 140, TODAY),
      vital('diastolic', 85, TODAY),
    ];
    for (let n = 1; n <= 7; n++) {
      vitals.push(vital('systolic', 130, priorDay(n)));
      vitals.push(vital('diastolic', 82, priorDay(n)));
    }
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    expect(out.hasMoments).toBe(true);
    const bp = out.moments.find((m) => m.category === 'bp');
    expect(bp).toBeDefined();
    expect(bp!.text).toMatch(/140\/85|140 ?\/ ?85/);
    expect(bp!.text).toMatch(/10|above/i);
  });

  it('contract 3: BP within tolerance → no BP moment', async () => {
    // Today: 132/82. Avg: 130/82 → systolic delta = 2 (< 8 threshold).
    const vitals: any[] = [
      vital('systolic', 132, TODAY),
      vital('diastolic', 82, TODAY),
    ];
    for (let n = 1; n <= 7; n++) {
      vitals.push(vital('systolic', 130, priorDay(n)));
      vitals.push(vital('diastolic', 82, priorDay(n)));
    }
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    const bp = out.moments.find((m) => m.category === 'bp');
    expect(bp).toBeUndefined();
  });

  it('contract 4: glucose anomaly threshold ≥ 20 mg/dL', async () => {
    // Today: 165. Avg: 135 → delta 30 → fires.
    const vitals: any[] = [vital('glucose', 165, TODAY)];
    for (let n = 1; n <= 7; n++) vitals.push(vital('glucose', 135, priorDay(n)));
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    const glucose = out.moments.find((m) => m.category === 'glucose');
    expect(glucose).toBeDefined();
    expect(glucose!.text).toMatch(/165/);
    expect(glucose!.text).toMatch(/30|above/i);
  });

  it('contract 4 boundary: glucose delta below threshold → no glucose moment', async () => {
    const vitals: any[] = [vital('glucose', 145, TODAY)];
    for (let n = 1; n <= 7; n++) vitals.push(vital('glucose', 135, priorDay(n)));
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    const glucose = out.moments.find((m) => m.category === 'glucose');
    expect(glucose).toBeUndefined();
  });

  it('contract 5: refused meal today + clean 14-day history → "first time" framing', async () => {
    // Today: skipped breakfast w/ skipReason 'refused'. Prior 14 days
    // have nutrition completions, no refusals.
    const todayInst = inst({
      itemType: 'nutrition',
      windowLabel: 'morning',
      itemName: 'Breakfast',
      status: 'skipped',
      skipReason: 'refused',
      date: TODAY,
    });
    const priorMeals: any[] = [];
    for (let n = 1; n <= 14; n++) {
      priorMeals.push(inst({
        itemType: 'nutrition',
        windowLabel: 'morning',
        itemName: 'Breakfast',
        status: 'completed',
        date: priorDay(n),
      }));
    }
    setMocks({ instances: [todayInst, ...priorMeals] });
    const out = await buildNotableMoments(TODAY);
    const meal = out.moments.find((m) => m.category === 'meals');
    expect(meal).toBeDefined();
    expect(meal!.text.toLowerCase()).toMatch(/refus/);
    expect(meal!.text.toLowerCase()).toMatch(/breakfast/);
    expect(meal!.text.toLowerCase()).toMatch(/first time|in 14 days|14-day/);
  });

  it('contract 6: sleep duration ≥ 1.5h above mean → moment fires (longest framing)', async () => {
    // Today: 9.5h. Past 14 days: 7h each → delta +2.5h.
    const todayInst = inst({
      itemType: 'sleep',
      status: 'completed',
      date: TODAY,
      itemName: 'Sleep',
    });
    const todayLog = log({
      dailyInstanceId: todayInst.id,
      data: { type: 'sleep', hours: 9.5 },
      date: TODAY,
    });
    const priorInst: any[] = [];
    const priorLogs: any[] = [];
    for (let n = 1; n <= 14; n++) {
      const i = inst({
        itemType: 'sleep',
        status: 'completed',
        date: priorDay(n),
      });
      priorInst.push(i);
      priorLogs.push(log({
        dailyInstanceId: i.id,
        data: { type: 'sleep', hours: 7 },
        date: priorDay(n),
        timestamp: `${priorDay(n)}T08:00:00Z`,
      }));
    }
    setMocks({ instances: [todayInst, ...priorInst], logs: [todayLog, ...priorLogs] });
    const out = await buildNotableMoments(TODAY);
    const sleep = out.moments.find((m) => m.category === 'sleep');
    expect(sleep).toBeDefined();
    expect(sleep!.text).toMatch(/9\.5/);
    expect(sleep!.text.toLowerCase()).toMatch(/longest|above|hours? more/);
  });

  it('contract 7: priority order BP > glucose > meals > sleep, capped at 3', async () => {
    // All four anomalies fire. Result is exactly 3 in priority order.
    const vitals: any[] = [
      vital('systolic', 145, TODAY),
      vital('diastolic', 90, TODAY),
      vital('glucose', 175, TODAY),
    ];
    for (let n = 1; n <= 7; n++) {
      vitals.push(vital('systolic', 130, priorDay(n)));
      vitals.push(vital('diastolic', 82, priorDay(n)));
      vitals.push(vital('glucose', 135, priorDay(n)));
    }
    const todaySleep = inst({ itemType: 'sleep', status: 'completed', date: TODAY });
    const todaySleepLog = log({
      dailyInstanceId: todaySleep.id,
      data: { type: 'sleep', hours: 9.5 },
      date: TODAY,
    });
    const todayMeal = inst({
      itemType: 'nutrition',
      windowLabel: 'morning',
      itemName: 'Breakfast',
      status: 'skipped',
      skipReason: 'refused',
      date: TODAY,
    });
    const priorInst: any[] = [];
    const priorLogs: any[] = [];
    for (let n = 1; n <= 14; n++) {
      const sleep = inst({ itemType: 'sleep', status: 'completed', date: priorDay(n) });
      priorInst.push(sleep);
      priorLogs.push(log({
        dailyInstanceId: sleep.id,
        data: { type: 'sleep', hours: 7 },
        date: priorDay(n),
        timestamp: `${priorDay(n)}T08:00:00Z`,
      }));
      priorInst.push(inst({
        itemType: 'nutrition',
        windowLabel: 'morning',
        itemName: 'Breakfast',
        status: 'completed',
        date: priorDay(n),
      }));
    }
    setMocks({
      instances: [todaySleep, todayMeal, ...priorInst],
      logs: [todaySleepLog, ...priorLogs],
      vitals,
    });
    const out = await buildNotableMoments(TODAY);
    expect(out.moments.length).toBeLessThanOrEqual(3);
    expect(out.moments.length).toBeGreaterThan(0);
    // First should be BP (highest priority).
    expect(out.moments[0].category).toBe('bp');
    // Glucose second.
    if (out.moments.length >= 2) {
      expect(out.moments[1].category).toBe('glucose');
    }
    // Sleep should NOT be in the top 3 if BP, glucose, meals all fired.
    const categories = out.moments.map((m) => m.category);
    if (categories.includes('bp') && categories.includes('glucose') && categories.includes('meals')) {
      expect(categories.includes('sleep')).toBe(false);
    }
  });

  it('contract 8: no interpretive vocabulary in any moment', async () => {
    const FORBIDDEN = /\b(concerning|alarming|stable|abnormal|normal|healthy|unwell|good sign|worrying)\b/i;
    const vitals: any[] = [
      vital('systolic', 165, TODAY),
      vital('diastolic', 105, TODAY),
    ];
    for (let n = 1; n <= 7; n++) {
      vitals.push(vital('systolic', 130, priorDay(n)));
      vitals.push(vital('diastolic', 82, priorDay(n)));
    }
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    for (const m of out.moments) {
      expect(m.text).not.toMatch(FORBIDDEN);
    }
  });

  it('contract 9: patient name never interpolated', async () => {
    const vitals: any[] = [
      vital('systolic', 145, TODAY),
      vital('diastolic', 90, TODAY),
    ];
    for (let n = 1; n <= 7; n++) {
      vitals.push(vital('systolic', 130, priorDay(n)));
      vitals.push(vital('diastolic', 82, priorDay(n)));
    }
    setMocks({ vitals });
    const out = await buildNotableMoments(TODAY);
    for (const m of out.moments) {
      expect(m.text).not.toMatch(/\b(Mom|Dad)\b/);
    }
  });
});
