// ============================================================================
// SEAM 4 — shared Now↔Journal status threshold (utils/careItemStatus).
//
// One missed-vs-pending rule. DECISION (locked): WINDOWED for meals
// (windowEnd+120min, Journal's existing boundary); meds/vitals keep +30min
// (Now's existing boundary, UNCHANGED). Both screens derive row state from
// getCareItemStatus — no parallel threshold.
//
// The RED→GREEN is baked into assertions by comparing to the OLD isOverdue(+30)
// rule: a meal at 1:30pm is 'due' via the helper but WAS 'overdue' under +30
// (the fix); a med at the same offset matches +30 (meds unchanged = regression
// check). The Journal-agrees case runs buildCareBrief under a fixed clock.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyCareInstance } from '../../types/carePlan';
import { getCareItemStatus } from '../../utils/careItemStatus';
import { seedDeviceState } from './_helpers/seedDeviceState';
import { buildCareBrief } from '../../utils/careSummaryBuilder';
import type { CarePlanItem } from '../../types/carePlan';

const DATE = '2026-06-29';
function inst(over: Partial<DailyCareInstance>): DailyCareInstance {
  return {
    id: 'i', carePlanId: 'cp', carePlanItemId: 'it', patientId: 'default',
    date: DATE, scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon',
    windowId: 'w', status: 'pending', itemName: 'Lunch', itemType: 'nutrition',
    priority: 'recommended', createdAt: DATE, updatedAt: DATE, ...over,
  } as DailyCareInstance;
}
const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00`);

describe('getCareItemStatus — meals windowed (windowEnd+120min)', () => {
  // afternoon window ends 14:00 → overdue cutoff 16:00.
  const lunch = inst({ itemType: 'nutrition', scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon' });

  it("scheduled 12p, now 1:30p (within window) → 'due' (NOT overdue) — the fix", () => {
    // Under the OLD +30min rule this flipped overdue at 12:30p. Windowed →
    // 'due' until 16:00 (afternoon windowEnd 14:00 + 120min).
    expect(getCareItemStatus(lunch, at('13:30'))).toBe('due');
  });

  it("now past window (4:30p > 16:00 cutoff) → 'overdue'", () => {
    expect(getCareItemStatus(lunch, at('16:30'))).toBe('overdue');
  });

  it("now before scheduled (11:00) → 'upcoming'", () => {
    expect(getCareItemStatus(lunch, at('11:00'))).toBe('upcoming');
  });

  it('windowEnd resolves from scheduledTime even when instance.date is ABSENT (hardening / profile-X dateless shape)', () => {
    // Reproduces the #2 fallback shape: a lunch with NO `date` field. Pre-harden
    // this fell to scheduledTime+120 (noon → 14:00) → 'overdue' at 14:35 (= the
    // device coral). Post-harden windowEnd derives from scheduledTime's day → 16:00.
    const datelessLunch = {
      id: 'i', carePlanId: 'cp', carePlanItemId: 'it', patientId: 'default',
      scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon', windowId: 'w',
      status: 'pending', itemName: 'Lunch', itemType: 'nutrition',
      priority: 'recommended', createdAt: DATE, updatedAt: DATE,
      // intentionally NO `date` field
    } as any;
    expect(getCareItemStatus(datelessLunch, at('14:35'))).toBe('due');     // was 'overdue' pre-harden
    expect(getCareItemStatus(datelessLunch, at('16:35'))).toBe('overdue'); // past windowEnd+120
  });

  it('completed/skipped/persisted-missed map to done/skipped/overdue', () => {
    expect(getCareItemStatus(inst({ status: 'completed' }), at('13:30'))).toBe('done');
    expect(getCareItemStatus(inst({ status: 'skipped' }), at('13:30'))).toBe('skipped');
    expect(getCareItemStatus(inst({ status: 'missed' }), at('13:30'))).toBe('overdue');
  });
});

describe('getCareItemStatus — meds/vitals keep +30min (UNCHANGED vs old isOverdue)', () => {
  const med = inst({ itemType: 'medication', itemName: 'Warfarin', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });
  const vit = inst({ itemType: 'vitals', itemName: 'BP', scheduledTime: `${DATE}T08:00:00`, windowLabel: 'morning' });

  it.each([['medication', med], ['vitals', vit]] as const)('%s: within +30 → due; past +30 → overdue (NOT windowed)', (_t, item) => {
    // 08:15 = within the 30min grace → due.
    expect(getCareItemStatus(item, at('08:15'))).toBe('due');
    // 08:45 = past the 30min grace → overdue. Decisive: morning windowEnd+120
    // is 12:00, so a WINDOWED item would still be 'due' at 08:45. 'overdue'
    // here proves meds/vitals use +30min, unchanged from Now's old rule.
    expect(getCareItemStatus(item, at('08:45'))).toBe('overdue');
  });
});

describe('overdue COUNT predicate — shared by ProgressRings / FlatTimelineFeed / now.tsx', () => {
  it('at 2:35p: un-logged lunch (due, window→16:00) + un-logged vitals (overdue, 14:00+30) → overdue count = 1 (vitals only)', () => {
    const lunch = inst({ itemType: 'nutrition', itemName: 'Lunch', scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon', status: 'pending' });
    const vitals = inst({ itemType: 'vitals', itemName: 'BP', scheduledTime: `${DATE}T14:00:00`, windowLabel: 'afternoon', status: 'pending' });
    // The exact predicate the count surfaces use: getCareItemStatus(i) === 'overdue'.
    const overdueCount = [lunch, vitals].filter(i => getCareItemStatus(i, at('14:35')) === 'overdue').length;
    expect(overdueCount).toBe(1); // vitals (14:30 cutoff passed); lunch still due until 16:00 — NOT 2
  });
});

describe('Now↔Journal agree — buildCareBrief meal status via the shared helper (fixed clock)', () => {
  const MEAL_ITEM: CarePlanItem = {
    id: 'meal-lunch', carePlanId: 'placeholder', type: 'nutrition', name: 'Lunch',
    priority: 'recommended', active: true,
    schedule: { frequency: 'daily', times: [{ id: 'meal-lunch-aft', kind: 'exact', label: 'afternoon', at: '12:00' }] },
    emoji: '🍽️', createdAt: `${DATE}T00:00:00Z`, updatedAt: `${DATE}T00:00:00Z`,
  } as CarePlanItem;

  beforeEach(async () => {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length) await AsyncStorage.multiRemove(keys as string[]);
    // Fake ONLY Date (so getCareItemStatus's new Date() is controllable) while
    // leaving setTimeout/microtasks/etc REAL — otherwise faking all timers hangs
    // the real async (AsyncStorage, withKeyLock) under full-suite concurrency.
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

  async function seedLunchPending() {
    await seedDeviceState({
      date: DATE, items: [MEAL_ITEM],
      instances: [{ itemId: 'meal-lunch', windowId: 'meal-lunch-aft', status: 'pending' }],
    });
  }

  it('at 1:30p the pending lunch reads still-scheduled (pending), NOT missed — agrees with Now=due', async () => {
    jest.setSystemTime(at('13:30'));
    await seedLunchPending();
    const brief = await buildCareBrief(DATE);
    const lunch = brief.meals.meals.find(m => m.name === 'Lunch');
    expect(lunch).toBeDefined();
    expect(lunch!.status).toBe('pending'); // Journal: still-scheduled
    // Now side, same instance + clock: helper says 'due' (not overdue) → gold, not coral.
    const seeded = inst({ itemType: 'nutrition', scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon' });
    expect(getCareItemStatus(seeded, at('13:30'))).toBe('due');
  });

  it('past the window the pending lunch reads missed — agrees with Now=overdue', async () => {
    jest.setSystemTime(at('16:30'));
    await seedLunchPending();
    const brief = await buildCareBrief(DATE);
    const lunch = brief.meals.meals.find(m => m.name === 'Lunch');
    expect(lunch!.status).toBe('missed'); // Journal: missed
    const seeded = inst({ itemType: 'nutrition', scheduledTime: `${DATE}T12:00:00`, windowLabel: 'afternoon' });
    expect(getCareItemStatus(seeded, at('16:30'))).toBe('overdue');
  });
});
