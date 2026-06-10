// ============================================================================
// Phase 34 NOT.B3 — wellness FIRE-TIME wiring BEHAVIOR pin.
//
// CONTRACT IS WHEN, NOT WHETHER. Different surface from B1.
//   B1 closes the AND-gate's WHETHER (reminderEnabled).
//   B3 closes the fire-time's WHEN (wellnessSettings[period].time).
//
// THE GAP:
//   The wellness sync ladder in services/carePlanGenerator.ts writes
//   `at: TIME_OF_DAY_DEFAULTS[tod] || '08:00'` at THREE call sites
//   (Pass B sync-wellness reconcile, Pass B legacy reconcile, Pass C
//   fresh-state creation). The caregiver-editable
//   wellnessSettings.{period}.time is NEVER read by the generator.
//   Result: caregiver edits morning time to 08:30 via the drawer →
//   wellnessSettings persists → wellness CarePlanItem still has
//   at:'08:00' from defaults → instances + notifications still fire
//   at 08:00. Same write-without-consequence trust class as A1+B1
//   closed for their respective fields.
//
// LOCK APPLIED:
//   Q-34.NOT.B.3 — a wellness CarePlanItem's schedule time =
//   wellnessSettings.{period}.time for windows that HAVE a
//   wellnessSettings entry (morning/afternoon/evening, via
//   tod→period mapping; midday→afternoon). night/custom have no
//   entry → fall back to TIME_OF_DAY_DEFAULTS. (They don't FIRE
//   per B.2, but the item still needs a display time — don't
//   crash, don't invent one.)
//
//   SINGLE resolver, not three writes. GREEN introduces ONE
//   resolveWellnessTime(tod, wellnessSettings) used by all three
//   sync sites, mirroring the file's existing F1 "single source of
//   truth" de-dup comment.
//
// SHARED MAP PROPOSAL (reported in audit):
//   The tod→period step REUSES B1's
//   WINDOW_LABEL_TO_WELLNESS_PERIOD via TIME_OF_DAY_TO_WINDOW. The
//   shared map moves to types/wellnessSettings.ts (natural home;
//   imports TimeWindowLabel from types/carePlan, no circular).
//   Both B1 (utils/notificationService.ts) and B3
//   (services/carePlanGenerator.ts) import it from there. The
//   B3 GREEN commit will land that move.
//
// INSTANCE-STALENESS FINDING (load-bearing — surfaces in audit):
//   ensureDailyInstances keys today's existing instances by
//   `${itemId}:${windowId}`. If timeWindow.id stays the same
//   (e.g., 'sync-wellness-morning-time') but timeWindow.at changes
//   from '08:00' to '08:30', the existing-instance branch
//   (carePlanGenerator.ts:1190-1212) sees the key match and SKIPS
//   regeneration. Today's instance keeps its stale scheduledTime.
//   rescheduleAllNotifications then reads listDailyInstances (NOT
//   ensureDailyInstances) so it sees the stale time. The new
//   wellnessSettings time only takes effect tomorrow when a fresh
//   instance is created.
//
//   B3 must refresh today's wellness instance scheduledTime when
//   the corresponding item timeWindow.at changes. Contract 6
//   forward-guards this. Out of scope: refreshing instances for
//   non-wellness time edits — meds/vitals/meals all carry their
//   own per-item time fields outside this slice.
//
// CONTRACTS:
//   1. PRIMARY (device-facing, B1+B3 composition): morning.time =
//      future 08:30-ish, reminderEnabled true → wellness
//      Notifications.scheduleNotificationAsync called with
//      trigger.date matching the morning.time (NOT the default).
//   2. PASS C LOCALIZATION (fresh-state creation): no existing
//      wellness items + morning in timesOfDay + wellnessSettings
//      morning.time set → new sync-wellness item's
//      schedule.times[morning].at === wellnessSettings.morning.time.
//   3. PASS B SYNC-WELLNESS LOCALIZATION (reconcile consolidated):
//      existing sync-wellness item with old at:'08:00' +
//      wellnessSettings morning.time changed → reconcile updates
//      item to wellnessSettings.morning.time.
//   4. PASS B LEGACY LOCALIZATION (reconcile per-period): existing
//      sync-wellness-morning legacy id-suffix item with old
//      at:'08:00' + wellnessSettings.morning.time changed →
//      reconcile updates item to wellnessSettings.morning.time.
//   5. NIGHT FALLBACK (B.2 non-mapped window): night window in
//      wellness item → at === TIME_OF_DAY_DEFAULTS.night, no crash.
//      Pre- AND post-B3 contract (forward-guard).
//   6. INSTANCE STALENESS REFRESH: existing today's wellness
//      instance with old scheduledTime + wellnessSettings time
//      change + ensureDailyInstances → today's instance
//      scheduledTime updates to the new time.
//   7. RESCHEDULE READ-ONLY INVARIANT (refinement 2): bare
//      rescheduleAllNotifications (NOT via ensureDailyInstances)
//      against a stale instance MUST NOT mutate
//      instance.scheduledTime. Pins the seam — reschedule schedules,
//      ensure re-bakes. Documents why B2 needs the asymmetric
//      trigger (reminderEnabled toggle → reschedule alone; TIME
//      change → ensure + reschedule). Don't assert the stale fire
//      is "correct" — assert reschedule doesn't mutate.
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
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { rescheduleAllNotifications } from '../../utils/notificationService';
import {
  listCarePlanItems,
  listDailyInstances,
  upsertDailyInstances,
  getActiveCarePlan,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { saveDeliveryPreferences } from '../../storage/notificationRegistry';
import { seedDeviceState, makeWellnessItem } from './_helpers/seedDeviceState';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../types/carePlanConfig';
import type { WellnessSettings } from '../../types/wellnessSettings';

// LOCAL date (NOT UTC). Mirrors B1 prep — scheduler uses
// getTodayDateString which is local-timezone YYYY-MM-DD.
function localTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const TODAY = localTodayString();

// HH:MM strictly later than "now" today, clamped to avoid wrap-past-
// midnight (B1 prep). Late-evening runs get a smaller forward offset.
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

const MORNING_CUSTOM_TIME = todayFutureHHmm(4);

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

async function setWellnessSettings(overrides: Partial<WellnessSettings>) {
  const merged = {
    morning: {
      enabled: true,
      time: '07:00',
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
      time: '20:00',
      checks: ['mood'],
      reminderEnabled: true,
      optionalChecks: {},
    },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
    ...overrides,
  };
  await safeSetItem(StorageKeys.WELLNESS_SETTINGS, merged);
}

function getWellnessSchedule(call: any): { hours: number; minutes: number } | null {
  if (call?.content?.data?.itemType !== 'wellness') return null;
  const d: Date = call?.trigger?.date;
  if (!(d instanceof Date)) return null;
  return { hours: d.getHours(), minutes: d.getMinutes() };
}

function getWellnessItemMorningAt(items: any[]): string | null {
  const wellnessItem = items.find((i) => i.type === 'wellness');
  if (!wellnessItem) return null;
  const morningTime = wellnessItem.schedule?.times?.find(
    (t: any) => t.label === 'morning',
  );
  return morningTime?.at ?? null;
}

beforeEach(async () => {
  store.clear();
  scheduleCalls.length = 0;
  // Disable quiet hours globally (B1 prep — default 22:00-07:00 would
  // silently drop late-evening test runs).
  await saveDeliveryPreferences({
    masterEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
  });
});

describe('Phase 34 NOT.B3 — wellness fire-time wiring (sync ladder reads wellnessSettings.time)', () => {
  it('contract 1 (PRIMARY device-facing): morning.time set → wellness Notifications.scheduleNotificationAsync trigger.date matches morning.time (B1 + B3 composed)', async () => {
    // RED today: Pass C creates item with at:TIME_OF_DAY_DEFAULTS.morning
    //   ('08:00'). Instance gets scheduledTime=08:00. If 08:00 is past
    //   (it is for tests running mid-day), notif is dropped at the
    //   past-time guard. Even if not past, the trigger fires at 08:00
    //   not the user's chosen time.
    // GREEN after B3: Pass C reads wellnessSettings.morning.time →
    //   item.at = MORNING_CUSTOM_TIME → instance.scheduledTime → trigger.
    const [hh, mm] = MORNING_CUSTOM_TIME.split(':').map(Number);
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [],
      instances: [],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const wellnessCalls = scheduleCalls
      .map(getWellnessSchedule)
      .filter((c) => c !== null) as Array<{ hours: number; minutes: number }>;
    expect(wellnessCalls.length).toBeGreaterThanOrEqual(1);
    expect(wellnessCalls[0]).toEqual({ hours: hh, minutes: mm });
  });

  it('contract 2 (PASS C LOCALIZATION): fresh-state — no existing wellness items + morning timesOfDay + wellnessSettings.morning.time → new item schedule.times[morning].at === wellnessSettings.morning.time', async () => {
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [], // Pass C path: no existing wellness items
      instances: [],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    const items = await listCarePlanItems(carePlan!.id, { activeOnly: true });
    expect(getWellnessItemMorningAt(items)).toBe(MORNING_CUSTOM_TIME);
  });

  it('contract 3 (PASS B SYNC-WELLNESS LOCALIZATION): existing sync-wellness item with stale at:08:00 + wellnessSettings change → reconcile updates item to wellnessSettings.morning.time', async () => {
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    // Pre-existing consolidated sync-wellness item with the OLD time
    const staleWellnessItem = makeWellnessItem({ timesOfDay: ['morning'] });
    // makeWellnessItem produces at:'08:00' from its internal map — that
    // IS the stale state we want.
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [staleWellnessItem],
      instances: [],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    const items = await listCarePlanItems(carePlan!.id, { activeOnly: true });
    expect(getWellnessItemMorningAt(items)).toBe(MORNING_CUSTOM_TIME);
  });

  it('contract 4 (PASS B LEGACY LOCALIZATION): existing sync-wellness-morning per-period legacy item with stale at:08:00 → reconcile updates to wellnessSettings.morning.time', async () => {
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    const now = new Date().toISOString();
    // Pre-existing LEGACY per-period item (id starts with
    // 'sync-wellness-' but is NOT 'sync-wellness'). Pass B legacy
    // branch matches this shape (carePlanGenerator.ts:712).
    const legacyItem: any = {
      id: 'sync-wellness-morning',
      carePlanId: 'placeholder',
      type: 'wellness',
      name: 'Morning wellness check',
      priority: 'recommended',
      active: true,
      schedule: {
        frequency: 'daily',
        times: [
          {
            id: 'sync-wellness-morning-time',
            kind: 'exact',
            label: 'morning',
            at: '08:00', // stale
          },
        ],
      },
      emoji: '🌅',
      createdAt: now,
      updatedAt: now,
    };
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [legacyItem],
      instances: [],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    const items = await listCarePlanItems(carePlan!.id, { activeOnly: true });
    expect(getWellnessItemMorningAt(items)).toBe(MORNING_CUSTOM_TIME);
  });

  it('contract 5 (NIGHT FALLBACK — Q-34.NOT.B.2): night window has no wellnessSettings entry → item.schedule.times[night].at === TIME_OF_DAY_DEFAULTS.night, no crash', async () => {
    // night is in timesOfDay but has no wellnessSettings.night key.
    // GREEN both pre- and post-B3: pre uses TIME_OF_DAY_DEFAULTS.night
    // (via the unconditional default lookup); post uses TIME_OF_DAY_DEFAULTS.night
    // (via the explicit fallback in the new resolver). Either way the
    // item must have a non-crashing at value. TIME_OF_DAY_DEFAULTS.night
    // is '21:00' per types/carePlanConfig.ts.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: '07:00',
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['night']),
      items: [],
      instances: [],
    });

    await expect(
      ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY),
    ).resolves.not.toThrow();

    const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    const items = await listCarePlanItems(carePlan!.id, { activeOnly: true });
    const wellnessItem = items.find((i: any) => i.type === 'wellness');
    expect(wellnessItem).toBeDefined();
    const nightTime = wellnessItem!.schedule?.times?.find(
      (t: any) => t.label === 'night',
    );
    expect(nightTime?.at).toBe('21:00');
  });

  it('contract 6 (INSTANCE STALENESS REFRESH): pre-existing today instance at 08:00 + wellnessSettings time change → ensureDailyInstances refreshes today instance scheduledTime to new time', async () => {
    // The load-bearing finding. Pre-B3: existing instance keyed by
    // windowId is skipped on regeneration (carePlanGenerator.ts:1194).
    // Today's instance keeps its stale scheduledTime. Post-B3:
    // instance is refreshed when the item's time changes.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME,
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });

    // Pre-existing consolidated wellness item with OLD time + a
    // matching pre-existing today instance at OLD time.
    const staleItem = makeWellnessItem({ timesOfDay: ['morning'] });
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [staleItem],
      instances: [
        {
          itemId: staleItem.id,
          windowId: staleItem.schedule.times[0].id,
          status: 'pending',
        },
      ],
    });

    await ensureDailyInstances(DEFAULT_PATIENT_ID, TODAY);

    const instances = await listDailyInstances(DEFAULT_PATIENT_ID, TODAY);
    const wellnessInstance = instances.find(
      (i: any) => i.carePlanItemId === staleItem.id,
    );
    expect(wellnessInstance).toBeDefined();
    // scheduledTime format from seedDeviceState is
    // 'YYYY-MM-DDTHH:MM:00'. Match the HH:MM segment.
    expect(wellnessInstance!.scheduledTime).toContain(`T${MORNING_CUSTOM_TIME}`);
  });

  it('contract 7 (RESCHEDULE READ-ONLY INVARIANT): bare rescheduleAllNotifications against a stale instance does NOT mutate instance.scheduledTime — pins the ensure-vs-reschedule seam', async () => {
    // Refinement 2: documents the asymmetric trigger B2 must wire.
    //   reminderEnabled toggle → reschedule ONLY (B1 gate is a live
    //     read at schedule time).
    //   TIME change → ensureDailyInstances (line-1194 refresh) →
    //     reschedule. Fire-time is BAKED into instance.scheduledTime,
    //     not read live.
    // Without this contract, B2 could ship "drawer save → reschedule"
    // uniformly and time changes would fire stale. This pin proves
    // the seam is intentional, not accidental.
    await setWellnessSettings({
      morning: {
        enabled: true,
        time: MORNING_CUSTOM_TIME, // wellnessSettings updated
        checks: ['mood'],
        reminderEnabled: true,
        optionalChecks: {},
      },
    });
    const staleItem = makeWellnessItem({ timesOfDay: ['morning'] });
    // Item still has at:'08:00' (stale relative to wellnessSettings).
    await seedDeviceState({
      patientId: DEFAULT_PATIENT_ID,
      date: TODAY,
      config: configWithWellnessTimesOfDay(['morning']),
      items: [staleItem],
      instances: [
        {
          itemId: staleItem.id,
          windowId: staleItem.schedule.times[0].id,
          status: 'pending',
        },
      ],
    });

    const beforeInstances = await listDailyInstances(
      DEFAULT_PATIENT_ID,
      TODAY,
    );
    const beforeWellness = beforeInstances.find(
      (i: any) => i.carePlanItemId === staleItem.id,
    );
    const beforeScheduledTime = beforeWellness!.scheduledTime;

    // Bare reschedule — NOT ensureDailyInstances. This is the seam.
    await rescheduleAllNotifications(DEFAULT_PATIENT_ID);

    const afterInstances = await listDailyInstances(
      DEFAULT_PATIENT_ID,
      TODAY,
    );
    const afterWellness = afterInstances.find(
      (i: any) => i.carePlanItemId === staleItem.id,
    );

    // INVARIANT: reschedule does not mutate instance.scheduledTime.
    expect(afterWellness!.scheduledTime).toBe(beforeScheduledTime);
  });
});
