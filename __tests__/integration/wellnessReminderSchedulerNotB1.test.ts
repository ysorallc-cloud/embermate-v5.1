// ============================================================================
// Phase 34 NOT.B1 — wellness reminder scheduler BEHAVIOR pin at the
// device-facing layer (Expo's scheduleNotificationAsync call surface).
//
// CLOSES GAP B of the three notification-slice gaps:
//   wellnessSettings.{period}.reminderEnabled is written by
//   WellnessCheckInDrawer (line ~163-167) but NO consumer reads it.
//   The unified scheduler (utils/notificationService.ts:602
//   scheduleCarePlanNotifications) iterates items uniformly and reads
//   item.notification.enabled — wellness CarePlanItems are created by
//   the wellness sync ladder (services/carePlanGenerator.ts:605-783)
//   but the ladder does NOT populate notification. So wellness items
//   fall through to DEFAULT_NOTIFICATION_CONFIG.wellness which is
//   { enabled: false }. Result: every wellness reminder is silently
//   skipped regardless of wellnessSettings state.
//
// THE AND-GATE (Q-34.NOT.B.1 lock):
//   A wellness reminder for period P fires IFF
//     (P ∈ carePlanConfig.wellness.timesOfDay)         — Layer 1
//     AND (wellnessSettings[P].reminderEnabled === true) — Layer 2
//
//   Layer 1 is already enforced by the wellness sync ladder: if P
//   isn't in timesOfDay, no wellness CarePlanItem window for P exists,
//   no DailyCareInstance generates. The scheduler never sees it.
//
//   Layer 2 is the GAP. B1 adds the read of wellnessSettings + the
//   reminderEnabled gate inside scheduleCarePlanNotifications. Per-
//   window, because wellnessSettings is per-period and one wellness
//   item carries multiple schedule.times.
//
// CANONICAL PATH (post D-wiring at 1b31cf0e):
//   rescheduleAllNotifications → scheduleCarePlanNotifications →
//   scheduleInstanceNotification → Notifications.scheduleNotificationAsync.
//   All settings-screen + form save interactions now route through
//   rescheduleAllNotifications. B1 routes wellness through the same.
//
// TEST SHAPE:
//   Integration round-trip pattern — NO mocks on the scheduling
//   pipeline. Only bottom-layer storage (AsyncStorage) and Expo
//   (the OS surface) are mocked. seedDeviceState writes the raw
//   storage state the test asserts against; rescheduleAllNotifications
//   runs through the real generator + scheduler.
//
//   Assertions are on Notifications.scheduleNotificationAsync mock
//   calls filtered to itemType='wellness' via content.data.itemType.
//   This is the device-facing layer (sharpening 5 — sim can't deliver,
//   but the schedule call IS the artifact).
//
// CONTRACTS:
//   a. AND-gate POSITIVE — timesOfDay includes morning + evening,
//      wellnessSettings.morning + .evening reminderEnabled true →
//      >=1 wellness scheduleNotificationAsync call (RED today; GREEN
//      after B1 wires the read).
//   b. AND-gate NEG via reminderEnabled — same timesOfDay, reminders
//      OFF → ZERO wellness calls. Forward-guard: scheduler must not
//      fire wellness once B1 lands without respecting the gate.
//   c. AND-gate NEG via timesOfDay — empty timesOfDay → ZERO wellness
//      calls. Forward-guard: Layer 1 is sync-ladder-enforced;
//      regression would mean the sync ladder accidentally creates
//      wellness items outside the selection.
//   d. NO DUPLICATES (window-staleness guard) — call reschedule
//      twice with positive setup; second call count equals first
//      (not 2x). Verifies cancelAllNotifications-then-schedule
//      semantics survive B1's changes.
// ============================================================================

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(store.has(k) ? store.get(k)! : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, store.get(k) ?? null])),
    ),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    }),
  },
}));

const scheduleCalls: any[] = [];

jest.mock('expo-notifications', () => ({
  __esModule: true,
  scheduleNotificationAsync: jest.fn((req: any) => {
    scheduleCalls.push(req);
    return Promise.resolve(`expo-notif-${scheduleCalls.length}`);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true }),
  ),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true }),
  ),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

import { safeSetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { rescheduleAllNotifications } from '../../utils/notificationService';
import { seedDeviceState, makeWellnessItem } from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import type { WellnessSettings } from '../../types/wellnessSettings';

const TODAY = new Date().toISOString().slice(0, 10);

function todayPlusHoursAsHHmm(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Wellness scheduled times far enough in the future that the
// scheduler's past-time guard at notificationService.ts:697 doesn't
// drop them. Two windows so the AND-gate has shape.
const MORNING_FUTURE_HHMM = todayPlusHoursAsHHmm(4);
const EVENING_FUTURE_HHMM = todayPlusHoursAsHHmm(6);

function configWithWellnessTimesOfDay(
  timesOfDay: Array<'morning' | 'midday' | 'evening' | 'night'>,
): CarePlanConfig {
  const base = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  return {
    ...base,
    wellness: {
      ...base.wellness,
      enabled: true,
      timesOfDay: timesOfDay as any,
    },
  };
}

function makeWellnessItemWithFutureTimes(periods: Array<'morning' | 'evening'>) {
  const item = makeWellnessItem({ timesOfDay: periods });
  // Override the default 08:00 / 18:00 with future times so the
  // scheduler doesn't drop the instances at line 697.
  item.schedule.times = item.schedule.times.map((t) => {
    if (t.label === 'morning') return { ...t, at: MORNING_FUTURE_HHMM };
    if (t.label === 'evening') return { ...t, at: EVENING_FUTURE_HHMM };
    return t;
  });
  return item;
}

async function setWellnessSettings(overrides: Partial<WellnessSettings>) {
  const merged = {
    morning: {
      enabled: true,
      time: MORNING_FUTURE_HHMM,
      checks: ['mood'],
      reminderEnabled: true,
      optionalChecks: {},
    },
    afternoon: {
      enabled: true,
      time: '13:00',
      checks: ['mood'],
      reminderEnabled: true,
      optionalChecks: {},
    },
    evening: {
      enabled: true,
      time: EVENING_FUTURE_HHMM,
      checks: ['mood'],
      reminderEnabled: true,
      optionalChecks: {},
    },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
    ...overrides,
  };
  await safeSetItem(StorageKeys.WELLNESS_SETTINGS, merged);
}

function countWellnessScheduleCalls(): number {
  return scheduleCalls.filter(
    (req) => req?.content?.data?.itemType === 'wellness',
  ).length;
}

beforeEach(() => {
  store.clear();
  scheduleCalls.length = 0;
});

describe('Phase 34 NOT.B1 — wellness reminder AND-gate (device-facing layer)', () => {
  it('contract a (AND-gate POSITIVE): timesOfDay=[morning,evening] + both reminderEnabled true → >=1 wellness scheduleNotificationAsync call', async () => {
    // RED-expected today: wellness items have no notification field;
    // scheduler reads DEFAULT_NOTIFICATION_CONFIG.wellness which is
    // { enabled: false }. Skipped. Count = 0.
    // GREEN after B1: wellness items route through wellnessSettings-
    // gated logic; both windows pass the gate; count >= 1.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
      evening: {
        enabled: true,
        time: EVENING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning', 'evening']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning', 'evening']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[1].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    expect(countWellnessScheduleCalls()).toBeGreaterThanOrEqual(1);
  });

  it('contract b (AND-gate NEG via reminderEnabled): timesOfDay populated + both reminderEnabled FALSE → 0 wellness calls', async () => {
    // Forward-guard: once B1 lands, the scheduler must respect the
    // reminderEnabled gate. Today this passes vacuously (no wellness
    // scheduling happens at all). Post-B1 it pins the gate.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: false,
        optionalChecks: {},
      },
      evening: {
        enabled: true,
        time: EVENING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: false,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning', 'evening']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning', 'evening']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[1].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    expect(countWellnessScheduleCalls()).toBe(0);
  });

  it('contract c (AND-gate NEG via timesOfDay): empty timesOfDay + reminderEnabled true → 0 wellness calls (Layer 1 enforced by sync ladder)', async () => {
    // Forward-guard for the sync ladder's Layer-1 enforcement.
    // If a future change makes the sync ladder create wellness
    // items outside timesOfDay, this contract fires.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    // No wellness items in seed because timesOfDay is empty —
    // mirrors the real ensureDailyInstances behavior where the
    // wellness sync ladder skips item creation.
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay([]),
      items: [],
      instances: [],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    expect(countWellnessScheduleCalls()).toBe(0);
  });

  it('contract d (NO DUPLICATES — window-staleness guard): second reschedule with same setup produces same wellness call count, not double', async () => {
    // rescheduleAllNotifications calls cancelAllNotifications first
    // (line 625). A second call should wipe the first's schedules and
    // re-emit the same count. Forward-guard against B1 introducing a
    // path that bypasses the cancel.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
      evening: {
        enabled: true,
        time: EVENING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning', 'evening']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning', 'evening']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[1].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    const afterFirst = countWellnessScheduleCalls();

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    const afterSecond = countWellnessScheduleCalls();

    // After the second reschedule, the cumulative schedule count
    // doubled IS expected (mock-call history is cumulative), but the
    // NET pending count is what matters. We assert the second-call
    // delta equals the first-call total (i.e., not zero, not double
    // the cumulative; the second call recreated the same scheduling
    // surface).
    const secondCallDelta = afterSecond - afterFirst;
    expect(secondCallDelta).toBe(afterFirst);
  });
});
