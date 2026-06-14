// ============================================================================
// Phase 34 NOT.B1 — wellness reminder scheduler BEHAVIOR pin at the
// device-facing layer (Expo's scheduleNotificationAsync call surface).
//
// CLOSES GAP B of the three notification-slice gaps:
//   wellnessSettings.{period}.reminderEnabled is written by the
//   wellness drawer (now WellnessWindowsDrawer.handleReminderTap) but
//   NO consumer reads it.
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
//   a. AND-gate POSITIVE — morning in timesOfDay,
//      wellnessSettings.morning.reminderEnabled=true →
//      >=1 wellness scheduleNotificationAsync call (RED today; GREEN
//      after B1 wires the read).
//   b. AND-gate NEG via reminderEnabled — morning in timesOfDay,
//      wellnessSettings.morning.reminderEnabled=false → 0 wellness
//      calls. Gate-closed assertion: pre-B1 this passes vacuously
//      (no scheduling at all); post-B1 it passes because the gate
//      actually blocks the fire.
//   c. AND-gate NEG via timesOfDay — empty timesOfDay → 0 wellness
//      calls. Forward-guard: Layer 1 is sync-ladder-enforced;
//      regression would mean the sync ladder accidentally creates
//      wellness items outside the selection.
//   d. NO DUPLICATES (window-staleness guard) — call reschedule
//      twice with positive setup; second-call delta equals first-call
//      count (not zero, not double). Verifies
//      cancelAllNotifications-then-schedule semantics survive B1.
//   e. Q-34.NOT.B.2 — night-window wellness instance + ANY
//      reminderEnabled state → 0 wellness calls. Night has no
//      wellnessSettings key (no caregiver toggle); no toggle = no
//      fire in v1. Forward-guards against a future change that
//      "fills in" a default-true behavior for unmapped windows.
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
import { saveDeliveryPreferences } from '../../storage/notificationRegistry';
import { seedDeviceState, makeWellnessItem } from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import type { WellnessSettings } from '../../types/wellnessSettings';

// LOCAL date (NOT UTC). The scheduler uses getTodayDateString from
// services/carePlanGenerator which computes local-timezone YYYY-MM-DD;
// instances filed under a UTC-different date get filtered out at
// notificationService.ts:634. Pre-prep this test used
// toISOString().slice(0,10) which is UTC, producing a sleeping bug
// that surfaced once test runs crossed midnight UTC.
function localTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const TODAY = localTodayString();

// Returns an HH:MM string strictly LATER than "now" within today's date,
// clamped to avoid wrapping past midnight (which would land in the past
// when applied to TODAY's date). Caps to within-today minus a 2-minute
// safety margin so the scheduler's 30s past-time guard doesn't drop the
// instance. Late-evening test runs use a small forward offset; daytime
// runs use a comfortable 4-hour gap.
function todayFutureHHmm(preferHoursFromNow: number): string {
  const now = new Date();
  const minutesRemainingToday =
    24 * 60 - (now.getHours() * 60 + now.getMinutes());
  const preferredMinutes = preferHoursFromNow * 60;
  const offsetMin = Math.max(
    2,
    Math.min(preferredMinutes, minutesRemainingToday - 2),
  );
  const d = new Date(now.getTime() + offsetMin * 60 * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Wellness scheduled times far enough in the future that the
// scheduler's past-time guard at notificationService.ts:697 doesn't
// drop them. Two windows so the AND-gate has shape.
const MORNING_FUTURE_HHMM = todayFutureHHmm(4);
const EVENING_FUTURE_HHMM = todayFutureHHmm(6);

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

beforeEach(async () => {
  store.clear();
  scheduleCalls.length = 0;
  // Disable quiet hours globally for the suite. Default delivery prefs
  // set quiet hours 22:00-07:00, which would silently drop late-evening
  // test runs at the past-time-equivalent gate (notificationService.ts:
  // scheduleInstanceNotification's isTimeInQuietHours check). The test
  // contracts are about the AND-gate, not about quiet-hours behavior;
  // disable to keep timing-only flake out of the suite.
  await saveDeliveryPreferences({
    masterEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
  });
});

describe('Phase 34 NOT.B1 — wellness reminder AND-gate (device-facing layer)', () => {
  it('contract a (AND-gate POSITIVE): morning in timesOfDay + morning.reminderEnabled=true → >=1 wellness scheduleNotificationAsync call', async () => {
    // RED today: wellness items have no notification field;
    // scheduler reads DEFAULT_NOTIFICATION_CONFIG.wellness which is
    // { enabled: false }. Skipped. Count = 0.
    // GREEN after B1: wellness items route through the new
    // wellnessSettings-gated logic; morning window passes; count >= 1.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    expect(countWellnessScheduleCalls()).toBeGreaterThanOrEqual(1);
  });

  it('contract b (AND-gate NEG via reminderEnabled): morning in timesOfDay + morning.reminderEnabled=FALSE → 0 wellness calls (gate-closed)', async () => {
    // Pre-B1: passes vacuously (no wellness scheduling happens at all).
    // Post-B1: passes because the gate actually blocks the fire.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: false,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
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

  it('contract d (NO DUPLICATES — window-staleness guard): second reschedule with same setup produces same delta as first call', async () => {
    // rescheduleAllNotifications calls cancelAllNotifications first
    // (line 625). A second call wipes the first's schedules and
    // re-emits the same count. The mock-call history is cumulative;
    // we assert the second-call DELTA equals the first-call count
    // (not zero, not double). Forward-guard against B1 introducing a
    // path that bypasses the cancel.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    const wellnessItem = makeWellnessItemWithFutureTimes(['morning']);
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    const afterFirst = countWellnessScheduleCalls();

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    const afterSecond = countWellnessScheduleCalls();

    const secondCallDelta = afterSecond - afterFirst;
    expect(secondCallDelta).toBe(afterFirst);
  });

  it('contract e (Q-34.NOT.B.2 — night window has NO wellnessSettings key → 0 scheduled regardless of reminderEnabled state)', async () => {
    // Forward-guard for B.2: wellness reminders supported only for
    // windows with a wellnessSettings reminder toggle
    // (morning/afternoon/evening). night and custom have no toggle;
    // no toggle = no fire in v1. Future change that "fills in" a
    // default-true behavior for unmapped windows breaks this contract.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_FUTURE_HHMM,
        checks: ['mood'],
        // morning reminder ON but morning is NOT seeded as a window:
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    // Wellness item with ONLY a night window. Layer 1 (sync ladder)
    // would let this exist if timesOfDay included 'night'. The
    // scheduler must skip it because the night window has no key in
    // wellnessSettings.
    const wellnessItem = makeWellnessItem({ timesOfDay: ['night'] });
    // Set a future time so the past-time guard doesn't drop the
    // instance for a spurious reason.
    wellnessItem.schedule.times = wellnessItem.schedule.times.map((t) => ({
      ...t,
      at: todayFutureHHmm(5),
    }));
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['night']),
      items: [wellnessItem],
      instances: [
        {
          itemId: wellnessItem.id,
          windowId: wellnessItem.schedule.times[0].id,
          status: 'pending',
        },
      ],
    });

    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    expect(countWellnessScheduleCalls()).toBe(0);
  });
});
