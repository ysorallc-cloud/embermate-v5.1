// ============================================================================
// notification-settings — render smoke test + D-wiring canonical-path guard.
//
// Phase 34 NOT.D-wiring — added per F5.3.1 standing rule (every screen-
// level restructure includes a smoke-mount test against the live React
// render tree). D-wiring restructures the file's scheduler call sites
// from the LEGACY scheduleMedicationNotifications to the UNIFIED
// rescheduleAllNotifications(DEFAULT_PATIENT_ID).
//
// CRITICAL CONTEXT:
//   Pre-D-wiring, app/notification-settings.tsx:32 imported
//   scheduleMedicationNotifications (LEGACY scheduler, branch from
//   utils/notificationService.ts:197). Lines 93 + 111 called it on:
//     - handleRequestPermissions (after permission grant)
//     - updateSettings (after every sound/vibration/quiet-hours/follow-up
//       toggle change)
//
//   The unified scheduler (rescheduleAllNotifications at
//   utils/notificationService.ts:764 → scheduleCarePlanNotifications at
//   line 602) is what NOT.A1+NOT.A2 just wired. A1 wires per-med
//   notification config into CarePlanItem.notification; A2 wires the
//   medication-form save path to trigger rescheduleAllNotifications.
//
//   Pre-D-wiring, every settings-screen interaction (sound, vibration,
//   quiet hours, follow-up reminders) ran the LEGACY scheduler,
//   silently bypassing A1+A2's wiring. Fresh write-without-consequence
//   trust bug, unmasked by the slice's downstream audit. D-wiring is
//   the surgical fix.
//
// SIXTH TRUST-BUG TRAP CLASS (banked in
// [[feedback_canonical_path_when_implementations_coexist]]):
//   Legacy-vs-unified caller drift. When two implementations of the
//   same operation coexist, every caller must route through ONE
//   canonical path or half the call sites silently bypass new wiring.
//   D-wiring closes the bypass; the forward-guard contracts below
//   prevent future PRs from re-introducing it.
//
// CONTRACTS:
//   1. SMOKE MOUNT — renders without throwing.
//   2. LANDMARK PERMISSION STATE — permission UI present.
//   3. LANDMARK SOUND/VIBRATION SWITCHES — at least two Switch
//      primitives render (the master toggle plus two delivery
//      settings).
//   4. CANONICAL-PATH FORWARD-GUARD (REMOVED) — the file source
//      contains NO reference to scheduleMedicationNotifications. If
//      a future PR re-imports the legacy scheduler, this contract
//      breaks.
//   5. CANONICAL-PATH FORWARD-GUARD (PRESENT) — the file source
//      contains a reference to rescheduleAllNotifications. Pins the
//      unified path as the canonical surface for D's reschedule
//      triggers.
//   6. DEFAULT_PATIENT_ID IMPORT — the file imports DEFAULT_PATIENT_ID
//      from storage/carePlanRepo. rescheduleAllNotifications requires
//      a patientId argument; the forward-guard pins the import as the
//      source of truth (vs. hard-coding 'default').
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

// Mock the notification service surface — return controllable defaults
// so loadSettings resolves immediately and the screen renders past the
// loading gate.
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
  // Unified scheduler — the path D-wiring routes through.
  rescheduleAllNotifications: jest.fn(async () => {}),
  // Legacy scheduler — kept exported (other callers may exist). The
  // canonical-path forward-guard at contract 4 pins that
  // notification-settings.tsx no longer references the symbol.
  scheduleMedicationNotifications: jest.fn(async () => {}),
}));

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn(async () => []),
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
    SafeAreaView: ({ children }: any) => React.createElement('View', null, children),
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

describe('notification-settings — render smoke test + D-wiring canonical-path forward-guard', () => {
  it('contract 1 (SMOKE MOUNT): renders without throwing', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<NotificationSettingsScreen />);
    });
    // Resolve the loadSettings useEffect so the screen renders past
    // its loading gate.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(root).toBeTruthy();
    expect(() => root.toJSON()).not.toThrow();
  });

  it('contract 2 (LANDMARK PERMISSION STATE): permission text renders in the loaded tree', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<NotificationSettingsScreen />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const tree = JSON.stringify(root.toJSON());
    // Either the granted-state or the request-permission CTA must
    // render. Both are pinned in the source at lines 206-234.
    expect(
      tree.toLowerCase().includes('permission') ||
      tree.toLowerCase().includes('enabled'),
    ).toBe(true);
  });

  it('contract 3 (LANDMARK SWITCHES): at least two Switch primitives render (sound + vibration + quiet hours + follow-up are all Switch-controlled)', async () => {
    let root: any;
    await act(async () => {
      root = TestRenderer.create(<NotificationSettingsScreen />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const switches = root.root.findAll((n: any) => n.type === 'Switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });

  it('contract 4 (CANONICAL-PATH FORWARD-GUARD — REMOVED): no IMPORT or CALL of scheduleMedicationNotifications (legacy scheduler bypassed A1+A2 wiring; D-wiring closes the gap)', () => {
    // The sixth trust-bug trap class — legacy-vs-unified caller drift.
    // If a future PR re-imports or calls the legacy scheduler from
    // this file, every settings-screen interaction would silently
    // bypass A1+A2's per-med config wiring + B1+B2's wellness wiring.
    // Comments referencing the legacy symbol name are permitted —
    // they document what was removed and why.
    const importLine = NOTIFICATION_SETTINGS_SOURCE.match(
      /^import\s+\{[^}]*scheduleMedicationNotifications[^}]*\}/m,
    );
    expect(importLine).toBeNull();
    const callSite = NOTIFICATION_SETTINGS_SOURCE.match(
      /scheduleMedicationNotifications\s*\(/,
    );
    expect(callSite).toBeNull();
  });

  it('contract 5 (CANONICAL-PATH FORWARD-GUARD — PRESENT): notification-settings.tsx source contains a reference to rescheduleAllNotifications (the unified path NOT.A1+A2 wired)', () => {
    expect(NOTIFICATION_SETTINGS_SOURCE).toMatch(/rescheduleAllNotifications/);
  });

  it('contract 6 (DEFAULT_PATIENT_ID IMPORT): notification-settings.tsx imports DEFAULT_PATIENT_ID from storage/carePlanRepo (the canonical source — no hard-coded "default" string in the reschedule call)', () => {
    // rescheduleAllNotifications requires a patientId argument. The
    // canonical source is storage/carePlanRepo's DEFAULT_PATIENT_ID
    // export (already imported by medication-form.tsx for the same
    // purpose). Forward-guard against hard-coding 'default' here.
    expect(NOTIFICATION_SETTINGS_SOURCE).toMatch(/DEFAULT_PATIENT_ID/);
    expect(NOTIFICATION_SETTINGS_SOURCE).toMatch(/from\s+['"]\.\.\/storage\/carePlanRepo['"]/);
  });
});
