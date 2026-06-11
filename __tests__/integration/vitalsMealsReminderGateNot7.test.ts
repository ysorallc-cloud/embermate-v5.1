// ============================================================================
// HIGH #7 — Vitals + Meals reminder toggles are WRITE-WITHOUT-CONSEQUENCE.
//
// STATE BEFORE FIX (audited): VitalsDrawer and MealsDrawer BOTH render
// a "Reminders on" Switch writing carePlanConfig.{vitals,meals}.
// notificationsEnabled — but NOTHING reads that field on the schedule
// path. scheduleCarePlanNotifications routes vitals/nutrition items
// through `item.notification || getDefaultNotificationConfig(type)`;
// sync-created items never carry item.notification, and the defaults
// hard-disable both types. Net: the switches lie. Worse, VitalsDrawer
// displays `notificationsEnabled ?? true` — a legacy config missing
// the field shows the switch ON while zero notifications ever fire.
// Same trust class NOT.A1 closed for medications and NOT.B1 closed
// for wellness ("I toggled it but nothing changed").
//
// LOCK APPLIED (mirrors B1's live-read architecture):
//   • scheduleCarePlanNotifications loads carePlanConfig once and
//     LIVE-READS the bucket gate per item type:
//       vitals item    → config.vitals.notificationsEnabled === true
//       nutrition item → config.meals.notificationsEnabled === true
//     Gate closed or config absent → 0 calls for that type.
//   • Live read ⇒ B2 asymmetry parity: drawer toggle triggers a bare
//     rescheduleAllNotifications — no sync/ensure needed.
//   • Drawer display fallback unified to `?? false` so the Switch can
//     never show a state the scheduler won't honor.
//
// Harness mirrors wellnessReminderSchedulerNotB1.test.ts verbatim:
// assertions land on the Expo scheduleNotificationAsync mock — the
// device-facing layer — with seedDeviceState building the real
// storage shape underneath.
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

import { readFileSync } from 'fs';
import { join } from 'path';
import { rescheduleAllNotifications } from '../../utils/notificationService';
import { saveDeliveryPreferences } from '../../storage/notificationRegistry';
import { seedDeviceState, makeVitalsItem } from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import type { CarePlanItem } from '../../types/carePlan';

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

function todayFutureHHmm(preferHoursFromNow: number): string {
  const now = new Date();
  const minutesRemainingToday =
    24 * 60 - (now.getHours() * 60 + now.getMinutes());
  const offsetMin = Math.max(
    2,
    Math.min(preferHoursFromNow * 60, minutesRemainingToday - 2),
  );
  const d = new Date(now.getTime() + offsetMin * 60 * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const VITALS_FUTURE_HHMM = todayFutureHHmm(4);
const MEALS_FUTURE_HHMM = todayFutureHHmm(6);

function configWithBucketReminders(opts: {
  vitalsReminders: boolean;
  mealsReminders: boolean;
}): CarePlanConfig {
  const base = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  return {
    ...base,
    vitals: {
      ...base.vitals,
      enabled: true,
      notificationsEnabled: opts.vitalsReminders,
    },
    meals: {
      ...base.meals,
      enabled: true,
      notificationsEnabled: opts.mealsReminders,
    },
  };
}

function makeFutureVitalsItem(): CarePlanItem {
  const item = makeVitalsItem({ timesOfDay: ['morning'] });
  item.schedule.times = item.schedule.times.map((t) => ({
    ...t,
    at: VITALS_FUTURE_HHMM,
  }));
  return item;
}

function makeFutureMealsItem(): CarePlanItem {
  const now = new Date().toISOString();
  return {
    id: 'sync-meals',
    carePlanId: 'placeholder',
    type: 'nutrition',
    name: 'Meals',
    priority: 'recommended',
    active: true,
    schedule: {
      frequency: 'daily',
      times: [
        {
          id: 'sync-meals-morning-time',
          kind: 'exact' as const,
          label: 'morning' as any,
          at: MEALS_FUTURE_HHMM,
        },
      ],
    },
    emoji: '🍽️',
    createdAt: now,
    updatedAt: now,
  } as CarePlanItem;
}

function countCallsOfType(itemType: string): number {
  return scheduleCalls.filter(
    (req) => req?.content?.data?.itemType === itemType,
  ).length;
}

async function seed(opts: { vitalsReminders: boolean; mealsReminders: boolean }) {
  const vitalsItem = makeFutureVitalsItem();
  const mealsItem = makeFutureMealsItem();
  await seedDeviceState({
    patientId: DEFAULT_PATIENT_ID,
    date: TODAY,
    config: configWithBucketReminders(opts),
    items: [vitalsItem, mealsItem],
    instances: [
      {
        itemId: vitalsItem.id,
        windowId: vitalsItem.schedule.times[0].id,
        status: 'pending',
      },
      {
        itemId: mealsItem.id,
        windowId: mealsItem.schedule.times[0].id,
        status: 'pending',
      },
    ],
  });
}

beforeEach(async () => {
  store.clear();
  scheduleCalls.length = 0;
  await saveDeliveryPreferences({
    masterEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
  });
});

describe('High #7 — vitals/meals bucket reminder gate (device-facing layer)', () => {
  it('contract a (VITALS POSITIVE): vitals.notificationsEnabled=true → >=1 vitals scheduleNotificationAsync call', async () => {
    await seed({ vitalsReminders: true, mealsReminders: false });
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    expect(countCallsOfType('vitals')).toBeGreaterThanOrEqual(1);
  });

  it('contract b (MEALS POSITIVE): meals.notificationsEnabled=true → >=1 nutrition scheduleNotificationAsync call', async () => {
    await seed({ vitalsReminders: false, mealsReminders: true });
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    expect(countCallsOfType('nutrition')).toBeGreaterThanOrEqual(1);
  });

  it('contract c (VITALS NEGATIVE): vitals.notificationsEnabled=false → 0 vitals calls', async () => {
    await seed({ vitalsReminders: false, mealsReminders: true });
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    expect(countCallsOfType('vitals')).toBe(0);
  });

  it('contract d (MEALS NEGATIVE): meals.notificationsEnabled=false → 0 nutrition calls', async () => {
    await seed({ vitalsReminders: true, mealsReminders: false });
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);
    expect(countCallsOfType('nutrition')).toBe(0);
  });
});

describe('High #7 — drawer coherence (source pins)', () => {
  const vitalsSrc = readFileSync(
    join(__dirname, '../../components/careplan/drawers/VitalsDrawer.tsx'),
    'utf8',
  );
  const mealsSrc = readFileSync(
    join(__dirname, '../../components/careplan/drawers/MealsDrawer.tsx'),
    'utf8',
  );

  it('VitalsDrawer display fallback is ?? false — switch can never show ON while the gate is closed', () => {
    expect(vitalsSrc).not.toMatch(/notificationsEnabled \?\? true/);
    expect(vitalsSrc).toMatch(/notificationsEnabled \?\? false/);
  });

  it('VitalsDrawer toggle triggers rescheduleAllNotifications (live-read gate, B2 asymmetry)', () => {
    expect(vitalsSrc).toMatch(/rescheduleAllNotifications/);
  });

  it('MealsDrawer toggle triggers rescheduleAllNotifications (live-read gate, B2 asymmetry)', () => {
    expect(mealsSrc).toMatch(/rescheduleAllNotifications/);
  });
});
