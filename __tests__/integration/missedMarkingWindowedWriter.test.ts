// ============================================================================
// The WRITER half of the missed-vs-pending authority — carePlanGenerator's
// ensureDailyInstances persists status:'missed' when now > getWindowEndTime +
// grace. This test drives the REAL generator (no mock of the write path) and
// reads status back from storage, because a mistake here writes bad data, not
// just a bad pixel.
//
// FIX under test: getWindowEndTime resolves the boundary from the window LABEL
// for every non-medication type, so the writer's missed threshold matches the
// READER's cutoff (getCareItemStatus). Pre-fix an exact-kind 08:00 vitals was
// persisted 'missed' at 10:00 (at+120) while the reader said due until 12:00
// (windowEnd+120) — the persisted 'missed' then short-circuited the reader,
// which is why Stage 1 didn't take on device.
//
// Windows: morning 06–10 (end 10:00), afternoon 12–14 (end 14:00). Grace 120min.
//   morning non-med cutoff = 12:00 ; afternoon non-med cutoff = 16:00
//   medication cutoff = exact `at` + 120 (UNCHANGED)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureDailyInstances,
} from '../../services/carePlanGenerator';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { addMedicationToPlan } from '../../storage/carePlanConfigRepo';
import { getCareItemStatus } from '../../utils/careItemStatus';
import {
  seedDeviceState,
  makeVitalsItem,
} from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
  type VitalsBucketConfig,
} from '../../types/carePlanConfig';
import type { CarePlanItem, DailyCareInstance } from '../../types/carePlan';

const DATE = '2026-06-29';
const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00`);

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}
async function readInstance(id: string): Promise<DailyCareInstance | undefined> {
  return (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.id === id);
}

// Enable ONLY the named bucket so sync leaves a single seeded item in play.
function configForOnly(bucket: 'vitals' | 'wellness' | 'meals'): CarePlanConfig {
  const c = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(c) as (keyof typeof c)[]) {
    const b = (c as any)[k];
    if (b && typeof b === 'object' && 'enabled' in b) (b as any).enabled = false;
  }
  if (bucket === 'vitals') {
    c.vitals = { ...(c.vitals as VitalsBucketConfig), enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] };
  } else if (bucket === 'wellness') {
    c.wellness = { ...c.wellness, enabled: true, timesOfDay: ['morning'] } as any;
  } else {
    c.meals = { ...c.meals, enabled: true, timesOfDay: ['midday'] } as any;
  }
  return c;
}

// Morning `at` is pinned to DEFAULT_WELLNESS_SETTINGS.morning.time ('07:00') on
// purpose: the generator's NOT.B3 pass refreshes a pending wellness instance
// whose scheduledTime has DRIFTED from resolveWellnessTime — and that refresh
// writes the (stale) `existing` object, which would clobber a just-marked
// 'missed' back to 'pending'. Seeding the non-drifting time keeps THIS test
// about getWindowEndTime, not that unrelated missed-vs-refresh ordering
// interaction. (windowLabel 'morning' → windowEnd 10:00 → cutoff 12:00 regardless.)
const wellnessItem: CarePlanItem = {
  id: 'sync-wellness',
  carePlanId: 'placeholder',
  type: 'wellness',
  name: 'Wellness check',
  priority: 'recommended',
  active: true,
  schedule: {
    frequency: 'daily',
    times: [{ id: 'sync-wellness-morning-time', kind: 'exact', label: 'morning', at: '07:00' }],
  },
  emoji: '🌅',
  createdAt: `${DATE}T00:00:00`,
  updatedAt: `${DATE}T00:00:00`,
};

const mealItem: CarePlanItem = {
  id: 'sync-meal-midday',
  carePlanId: 'placeholder',
  type: 'nutrition',
  name: 'Lunch',
  priority: 'recommended',
  active: true,
  schedule: {
    frequency: 'daily',
    times: [{ id: 'sync-meal-midday-time', kind: 'exact', label: 'afternoon', at: '12:00' }],
  },
  emoji: '🍽️',
  createdAt: `${DATE}T00:00:00`,
  updatedAt: `${DATE}T00:00:00`,
};

interface Case {
  type: 'vitals' | 'wellness' | 'meals';
  bucket: 'vitals' | 'wellness' | 'meals';
  item: CarePlanItem;
  itemId: string;
  windowId: string;
  instId: string;
  inside: string;   // past scheduled+120, BEFORE windowEnd+120 (the pre-fix false-missed window)
  past: string;     // past windowEnd+120 (genuine miss)
}

const CASES: Case[] = [
  {
    type: 'vitals', bucket: 'vitals',
    item: makeVitalsItem({ timesOfDay: ['morning'] }),
    itemId: 'sync-vitals', windowId: 'sync-vitals-morning-time',
    instId: `inst-${DATE}-sync-vitals-sync-vitals-morning-time`,
    inside: '11:00', past: '12:30', // windowEnd 10:00 → cutoff 12:00
  },
  {
    type: 'wellness', bucket: 'wellness',
    item: wellnessItem,
    itemId: 'sync-wellness', windowId: 'sync-wellness-morning-time',
    instId: `inst-${DATE}-sync-wellness-sync-wellness-morning-time`,
    inside: '11:00', past: '12:30', // windowEnd 10:00 → cutoff 12:00
  },
  {
    type: 'meals', bucket: 'meals',
    item: mealItem,
    itemId: 'sync-meal-midday', windowId: 'sync-meal-midday-time',
    instId: `inst-${DATE}-sync-meal-midday-sync-meal-midday-time`,
    inside: '15:00', past: '16:30', // windowEnd 14:00 → cutoff 16:00
  },
];

function useControlledClock() {
  beforeEach(async () => {
    await clearAll();
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

describe('writer marks missed at windowEnd + grace (agrees with the reader) — non-medication', () => {
  useControlledClock();

  it.each(CASES)('$type: INSIDE window (past scheduled+120) → writer keeps PENDING, reader says DUE (both agree)', async (c) => {
    jest.setSystemTime(at(c.inside));
    await seedDeviceState({
      config: configForOnly(c.bucket), date: DATE,
      items: [c.item],
      instances: [{ itemId: c.itemId, windowId: c.windowId, status: 'pending' }],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(c.instId);
    expect(inst).toBeDefined();
    // WRITER: not marked missed early (the fix — pre-fix this was 'missed').
    expect(inst!.status).toBe('pending');
    // READER: same instant, same item → due. The two authorities agree.
    expect(getCareItemStatus(inst!, at(c.inside))).toBe('due');
  });

  it.each(CASES)('$type: PAST windowEnd+grace → writer marks MISSED, reader says OVERDUE (both agree) — missed-honesty', async (c) => {
    jest.setSystemTime(at(c.past));
    await seedDeviceState({
      config: configForOnly(c.bucket), date: DATE,
      items: [c.item],
      instances: [{ itemId: c.itemId, windowId: c.windowId, status: 'pending' }],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(c.instId);
    expect(inst).toBeDefined();
    // WRITER: genuinely past its window → persisted missed (honesty preserved,
    // no "reads pending forever" regression).
    expect(inst!.status).toBe('missed');
    // READER agrees two ways: the persisted 'missed' maps to overdue, AND the
    // live cutoff on a pending snapshot at the same instant is also overdue.
    expect(getCareItemStatus(inst!, at(c.past))).toBe('overdue');
    expect(getCareItemStatus({ ...inst!, status: 'pending' }, at(c.past))).toBe('overdue');
  });
});

describe('writer/reader agree at the exact boundary (vitals, windowEnd+grace = 12:00)', () => {
  useControlledClock();
  const c = CASES[0];

  it('11:59 (one minute before cutoff) → pending / due', async () => {
    jest.setSystemTime(at('11:59'));
    await seedDeviceState({
      config: configForOnly('vitals'), date: DATE,
      items: [c.item], instances: [{ itemId: c.itemId, windowId: c.windowId, status: 'pending' }],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const inst = await readInstance(c.instId);
    expect(inst!.status).toBe('pending');
    expect(getCareItemStatus(inst!, at('11:59'))).toBe('due');
  });

  it('12:01 (one minute past cutoff) → missed / overdue', async () => {
    jest.setSystemTime(at('12:01'));
    await seedDeviceState({
      config: configForOnly('vitals'), date: DATE,
      items: [c.item], instances: [{ itemId: c.itemId, windowId: c.windowId, status: 'pending' }],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const inst = await readInstance(c.instId);
    expect(inst!.status).toBe('missed');
    expect(getCareItemStatus({ ...inst!, status: 'pending' }, at('12:01'))).toBe('overdue');
  });
});

describe('medications UNCHANGED at the writer — still exact `at` + grace, NOT windowed', () => {
  useControlledClock();

  it('an 08:00 morning med is persisted missed at 11:00 (exact+120 = 10:00), NOT held pending to the 12:00 window cutoff', async () => {
    // Two-phase so the med survives med-sync and its instance is born un-skipped:
    // add + generate BEFORE the dose time, then advance the clock and re-generate.
    jest.setSystemTime(at('07:00'));
    await addMedicationToPlan(DEFAULT_PATIENT_ID, {
      name: 'Warfarin', dosage: '5mg', timesOfDay: ['morning'],
      customTimes: ['08:00'], scheduledTimeHHmm: '08:00', active: true,
    } as any);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const born = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.itemType === 'medication');
    expect(born).toBeDefined();
    expect(born!.status).toBe('pending');

    // Advance past the exact-med cutoff (10:00) but BEFORE the morning-window
    // cutoff (12:00). If the fix had wrongly windowed meds, this would stay
    // pending; 'missed' proves meds keep exact `at` + grace.
    jest.setSystemTime(at('11:00'));
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const after = (await listDailyInstances(DEFAULT_PATIENT_ID, DATE)).find((i) => i.id === born!.id);
    expect(after!.status).toBe('missed');
    // Reader unchanged for meds too: overdue well before, at scheduled+30.
    expect(getCareItemStatus({ ...after!, status: 'pending' }, at('08:45'))).toBe('overdue');
  });
});

describe('already-persisted missed is NOT retroactively rewritten', () => {
  useControlledClock();

  it('a vitals seeded as missed stays missed after a re-generate INSIDE the new window (11:00 < 12:00)', async () => {
    // Under the old rule this was marked missed at 10:00. The fix marks missed
    // LATER (12:00) — it must not UN-mark an already-missed instance back to
    // pending. The writer only acts on pending, so missed is preserved.
    jest.setSystemTime(at('11:00'));
    await seedDeviceState({
      config: configForOnly('vitals'), date: DATE,
      items: [CASES[0].item],
      instances: [{ itemId: CASES[0].itemId, windowId: CASES[0].windowId, status: 'missed' }],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await readInstance(CASES[0].instId);
    expect(inst!.status).toBe('missed'); // not reverted to pending
  });
});
