// ============================================================================
// Phase 34 NOT.D-summary — Schedule Summary section BEHAVIOR pin.
//
// THE SURFACE:
//   A new read-only "SCHEDULE SUMMARY" section in app/notification-
//   settings.tsx that shows the caregiver WHAT IS CURRENTLY
//   CONFIGURED to fire — which meds, which wellness windows, which
//   times, whether reminders are on. NOT a debug view of the OS
//   notification queue (the existing scheduledCount footer covered
//   that at a single-number level).
//
// LOCKS HONORED (from D audit and prior session):
//   D.1 — COUNTS format for meds ("Medications: 4 reminders").
//         Per-item reminder timing varies (A1's per-med config);
//         v1 shows count only, timing detail lives in the meds
//         editor. Wellness shows windows + times.
//   D.2 — SHOW ALL FOUR CATEGORIES with explicit "disabled" state.
//         Layout stability over visual cleanliness; "is it disabled
//         or did something break and remove the row?" ambiguity is
//         unacceptable. Four rows always; state varies.
//
// DATA SOURCES (intent-side, not registry):
//   - Meds: getMedicationsFromPlan(DEFAULT_PATIENT_ID) filtered to
//     active && notificationsEnabled !== false (mirrors A1's per-med
//     wiring + the scheduler's per-item gate)
//   - Wellness: useWellnessSettings() → settings.morning + .evening
//     read .reminderEnabled + .time (mirrors B1's AND-gate)
//   - Vitals: no v1 consumer → "disabled"
//   - Meals: no v1 consumer → "disabled"
//
// LOCATION:
//   Replaces the existing Footer Status (line 417-424) which
//   showed a bare scheduledCount text. The summary is more
//   informative; the registry count is debug-side and not useful
//   to caregivers.
//
// PROPOSED ROW FORMAT (user-lockable before GREEN):
//   "Medications: N reminders"  (or "disabled" when N=0)
//   "Wellness: morning HH:MM • evening HH:MM"  (or partial / "disabled")
//   "Vitals: disabled"
//   "Meals: disabled"
//
//   Section header text: "SCHEDULE SUMMARY"
//
// CONTRACTS:
//   1. SECTION HEADER — "SCHEDULE SUMMARY" header text renders.
//   2. FOUR ROWS ALWAYS — D.2 lock; four category labels visible
//      regardless of state (Medications, Wellness, Vitals, Meals).
//   3. MEDS COUNT — seed N enabled meds → row text contains "N"
//      and the word "reminders" (or "reminder" for N=1).
//   4. MEDS DISABLED — seed zero meds → row says "disabled".
//   5. WELLNESS WINDOWS — seed morning.reminderEnabled=true at
//      07:00, evening.reminderEnabled=true at 20:00 → row text
//      contains both times.
//   6. WELLNESS DISABLED — seed both periods reminderEnabled=false
//      → row says "disabled".
//   7a/7b. VITALS LIVE-READ — Vitals row reflects the gate field
//      carePlanConfig.vitals.notificationsEnabled. true → "on"; false
//      or absent → "disabled". v1 has no per-window vitals time UI
//      yet, so we show on/off, not a time. Pre-correction the test
//      hard-coded "always disabled" — that was authored before HIGH
//      #7 (commit 4463e1e1) gave vitals a live gate. Always-disabled
//      would lie whenever the caregiver toggled the drawer ON,
//      re-opening the exact write-without-consequence trust bug #7
//      just closed, one layer up in the read-out.
//   8a/8b. MEALS LIVE-READ — same shape on
//      carePlanConfig.meals.notificationsEnabled.
// ============================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const NOTIFICATION_SETTINGS_SOURCE = readFileSync(
  resolve(__dirname, '../../app/notification-settings.tsx'),
  'utf8',
);

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
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(_key: string, fallback: T): Promise<T> => fallback,
  safeSetItem: async (_key: string, _value: any): Promise<boolean> => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../utils/notificationService', () => ({
  getNotificationSettings: jest.fn(async () => ({
    enabled: true,
    reminderMinutesBefore: 0,
    soundEnabled: true,
    vibrationEnabled: true,
    overdueAlertsEnabled: true,
    gracePeriodMinutes: 15,
    overdueAlertMinutes: 30,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  })),
  saveNotificationSettings: jest.fn(async () => {}),
  requestNotificationPermissions: jest.fn(async () => true),
  hasNotificationPermissions: jest.fn(async () => true),
  getScheduledNotifications: jest.fn(async () => []),
  rescheduleAllNotifications: jest.fn(async () => {}),
}));

// D-summary data sources — mocked so each test seeds the case.
let medsPlanFixture: any[] = [];
let wellnessSettingsFixture: any = null;

// D.summary.3 — vitals/meals now live-read carePlanConfig.{vitals,meals}.
// notificationsEnabled (the same gate HIGH #7's scheduler honors).
let carePlanConfigFixture: any = null;

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getMedicationsFromPlan: jest.fn(async () => medsPlanFixture),
  getCarePlanConfig: jest.fn(async () => carePlanConfigFixture),
}));

jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: wellnessSettingsFixture,
    updateSettings: jest.fn(),
  }),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    ScrollView: PT('ScrollView'),
    Switch: PT('Switch'),
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement('View', null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components/aurora/AuroraBackground', () => ({
  AuroraBackground: () => null,
}));

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: () => null,
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import NotificationSettingsScreen from '../../app/notification-settings';

function seedWellness(
  morningEnabled: boolean,
  morningTime: string,
  eveningEnabled: boolean,
  eveningTime: string,
) {
  wellnessSettingsFixture = {
    morning: {
      enabled: true,
      time: morningTime,
      checks: ['mood'],
      reminderEnabled: morningEnabled,
      optionalChecks: {},
    },
    afternoon: {
      enabled: true,
      time: '13:00',
      checks: ['mood'],
      reminderEnabled: false,
      optionalChecks: {},
    },
    evening: {
      enabled: true,
      time: eveningTime,
      checks: ['mood'],
      reminderEnabled: eveningEnabled,
      optionalChecks: {},
    },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
  };
}

function seedMeds(count: number) {
  medsPlanFixture = [];
  for (let i = 0; i < count; i++) {
    medsPlanFixture.push({
      id: `med-${i}`,
      name: `Med${i}`,
      dosage: '10mg',
      timesOfDay: ['morning'],
      active: true,
      notificationsEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  }
}

async function renderLoaded() {
  let root: any;
  await act(async () => {
    root = TestRenderer.create(<NotificationSettingsScreen />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return root;
}

function treeText(root: any): string {
  return JSON.stringify(root.toJSON());
}

function seedCarePlanConfig(opts: {
  vitalsReminders?: boolean;
  mealsReminders?: boolean;
}) {
  carePlanConfigFixture = {
    vitals: { notificationsEnabled: opts.vitalsReminders ?? false },
    meals: { notificationsEnabled: opts.mealsReminders ?? false },
  };
}

beforeEach(() => {
  store.clear();
  medsPlanFixture = [];
  wellnessSettingsFixture = null;
  carePlanConfigFixture = null;
  seedWellness(true, '07:00', true, '20:00');
  seedMeds(0);
  seedCarePlanConfig({ vitalsReminders: false, mealsReminders: false });
});

describe('Phase 34 NOT.D-summary — SCHEDULE SUMMARY section', () => {
  it('contract 1 (SECTION HEADER): "SCHEDULE SUMMARY" header renders in the loaded tree', async () => {
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree.toUpperCase()).toContain('SCHEDULE SUMMARY');
  });

  it('contract 2 (FOUR ROWS ALWAYS — D.2 lock): all four category labels render regardless of state', async () => {
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Medications/i);
    expect(tree).toMatch(/Wellness/i);
    expect(tree).toMatch(/Vitals/i);
    expect(tree).toMatch(/Meals/i);
  });

  it('contract 3 (MEDS COUNT): seed 4 enabled meds → Medications row contains "4" and "reminders"', async () => {
    seedMeds(4);
    const root = await renderLoaded();
    const tree = treeText(root);
    // The summary row for Medications carries the count.
    expect(tree).toMatch(/Medications[\s\S]{0,200}4[\s\S]{0,200}reminders/i);
  });

  it('contract 4 (MEDS DISABLED): seed zero enabled meds → Medications row says "disabled"', async () => {
    seedMeds(0);
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Medications[\s\S]{0,200}disabled/i);
  });

  it('contract 5 (WELLNESS WINDOWS): seed morning+evening reminderEnabled=true with 07:00 and 20:00 → row contains both times', async () => {
    seedWellness(true, '07:00', true, '20:00');
    const root = await renderLoaded();
    const tree = treeText(root);
    // Both times appear in the Wellness row's content.
    expect(tree).toMatch(/Wellness[\s\S]{0,200}07:00[\s\S]{0,200}20:00/i);
  });

  it('contract 6 (WELLNESS DISABLED): seed both periods reminderEnabled=false → Wellness row says "disabled"', async () => {
    seedWellness(false, '07:00', false, '20:00');
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Wellness[\s\S]{0,200}disabled/i);
  });

  it('contract 7a (VITALS LIVE-READ ON): carePlanConfig.vitals.notificationsEnabled=true → Vitals row says "on"', async () => {
    // Live-read the same gate field HIGH #7 wired into the scheduler.
    // The summary must NOT lie when the drawer toggle is ON.
    seedCarePlanConfig({ vitalsReminders: true });
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Vitals[\s\S]{0,200}\bon\b/i);
  });

  it('contract 7b (VITALS LIVE-READ OFF): carePlanConfig.vitals.notificationsEnabled=false → Vitals row says "disabled"', async () => {
    seedCarePlanConfig({ vitalsReminders: false });
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Vitals[\s\S]{0,200}disabled/i);
  });

  it('contract 8a (MEALS LIVE-READ ON): carePlanConfig.meals.notificationsEnabled=true → Meals row says "on"', async () => {
    seedCarePlanConfig({ mealsReminders: true });
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Meals[\s\S]{0,200}\bon\b/i);
  });

  it('contract 8b (MEALS LIVE-READ OFF): carePlanConfig.meals.notificationsEnabled=false → Meals row says "disabled"', async () => {
    seedCarePlanConfig({ mealsReminders: false });
    const root = await renderLoaded();
    const tree = treeText(root);
    expect(tree).toMatch(/Meals[\s\S]{0,200}disabled/i);
  });

  it('contract 9 (SOURCE-LEVEL — replaces footer count): the bare "scheduled" count footer is GONE (the structured summary is the replacement)', () => {
    // The pre-D-summary footer rendered a flat
    // `scheduledCount reminders currently scheduled` line. The
    // structured summary subsumes it. Forward-guard against the
    // footer creeping back as a redundant duplicate.
    expect(NOTIFICATION_SETTINGS_SOURCE).not.toMatch(/currently scheduled/);
    expect(NOTIFICATION_SETTINGS_SOURCE).not.toMatch(/No reminders scheduled/);
  });
});
