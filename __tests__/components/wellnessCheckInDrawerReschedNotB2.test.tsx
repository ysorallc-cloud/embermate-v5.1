// ============================================================================
// Phase 34 NOT.B2 — WellnessCheckInDrawer save → reschedule wiring
// BEHAVIOR pin.
//
// CLOSES GAP B — Layer 2 trigger (B1 wired the SCHEDULER to read
// wellnessSettings[period].reminderEnabled; B2 wires the DRAWER's
// toggle to call rescheduleAllNotifications so the gate state takes
// effect immediately, not on the next ensureDailyInstances cycle).
// Same shape as A2 was for A1's per-med wiring.
//
// AUDIT FINDING — time-edit affordance DOES NOT EXIST in v1:
//   WellnessCheckInDrawer renders TWO write paths from its body:
//     • toggleField (CORE chip taps → wellnessSettings.{period}.checks)
//     • toggleReminder (Switch → wellnessSettings.{period}.reminderEnabled)
//   NO time-picker, NO time TextInput, NO setTime callback anywhere.
//   The drawer's file header explicitly says "NO WHEN SECTION."
//   The asymmetric trigger DESIGN (toggle → reschedule;
//   time → ensure+reschedule) was forward-looking. With no time-edit
//   surface, B2's live wiring is reminderEnabled-only.
//
//   wellnessSettings.{period}.time is set ONLY by
//   DEFAULT_WELLNESS_SETTINGS today. No caregiver-facing write path.
//   When a time-edit affordance lands (likely with the post-F6/F7
//   wellness editor work), the asymmetric router gets implemented
//   then. The SHAPE is documented; the second branch is dead-code-
//   today and intentionally not built.
//
// THE FORWARD-GUARD STAYS:
//   B3 contract 7 already pinned the read-only invariant on
//   rescheduleAllNotifications — it does NOT mutate
//   instance.scheduledTime. So if a future drawer adds time-edit
//   and routes only to reschedule, today's instance fires stale
//   and the walk catches it. B3 contract 7 is the structural
//   forward-guard for that.
//
// LOCKS HONORED:
//   - asymmetric routing (BANKED for the future time-edit slice;
//     today reminderEnabled is the only field with a UI surface)
//   - reminderEnabled toggle → rescheduleAllNotifications ONLY
//     (no sync/ensure needed — B1 gate is a live read)
//   - thrash avoidance — CORE chip taps (toggleField) do NOT
//     trigger reschedule (the field changed isn't notification-
//     relevant; same predicate logic as A2's
//     medicationNotificationChanged)
//
// CONTRACTS:
//   a. REMINDER TOGGLE → RESCHEDULE: tapping the
//      wellness-{period}-reminder-switch triggers
//      rescheduleAllNotifications(DEFAULT_PATIENT_ID). The B1 gate
//      then reads the new reminderEnabled state at schedule time.
//   a'. CHECK TOGGLE → NO RESCHEDULE: tapping a CORE chip
//      (toggleField, writes to wellnessSettings.{period}.checks)
//      does NOT trigger rescheduleAllNotifications. The checks field
//      doesn't change anything the scheduler reads; avoiding the
//      thrash mirrors A2's medicationNotificationChanged predicate.
//   b. TIME-CHANGE PATH (BANKED — no UI surface in v1): when a
//      time-edit affordance eventually lands, it must route
//      through syncOtherBucketsWithConfig → ensureDailyInstances
//      (line-1194 wellness instance refresh) →
//      rescheduleAllNotifications. Bare reschedule alone won't
//      move today's already-baked instance.scheduledTime.
//      Forward-guarded by B3 contract 7 (the read-only invariant).
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentChipFill: 'rgba(95,184,138,0.16)',
      accentMuted: '#3a6850',
      accentDim: 'rgba(95,184,138,0.10)',
      glass: '#363830',
      glassFaint: 'rgba(255,255,255,0.04)',
      glassBorder: 'rgba(255,255,255,0.06)',
      glassStrong: '#363830',
      switchThumbOff: '#666',
      criticalAlert: '#e6776e',
      error: '#e6776e',
    },
  }),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableOpacity: make('TouchableOpacity'),
    Switch: make('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

const wellnessSettingsStore: { current: any } = { current: null };
const updateSettingsMock = jest.fn();
jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: wellnessSettingsStore.current,
    updateSettings: updateSettingsMock,
  }),
}));

// Mock the unified scheduler — the canonical path established at
// D-wiring (1b31cf0e). B2's wiring must route through this exact
// surface.
const rescheduleAllNotificationsMock = jest.fn(async () => {});
jest.mock('../../utils/notificationService', () => ({
  __esModule: true,
  rescheduleAllNotifications: rescheduleAllNotificationsMock,
}));

// Mock DEFAULT_PATIENT_ID — the drawer needs to thread it to the
// reschedule call (mirrors A2's medication-form pattern).
jest.mock('../../storage/carePlanRepo', () => ({
  DEFAULT_PATIENT_ID: 'default',
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WellnessCheckInDrawer } from '../../components/careplan/drawers/WellnessCheckInDrawer';

function seedSettings(overrides: any = {}) {
  return {
    morning: {
      enabled: true,
      time: '07:00',
      checks: ['sleep', 'mood', 'energy'],
      reminderEnabled: true,
      optionalChecks: {},
      ...(overrides.morning ?? {}),
    },
    evening: {
      enabled: true,
      time: '20:00',
      checks: ['mood', 'meals', 'dayRating', 'notes'],
      reminderEnabled: true,
      optionalChecks: {},
      ...(overrides.evening ?? {}),
    },
    afternoon: {
      enabled: true,
      time: '13:00',
      checks: [],
      reminderEnabled: false,
      optionalChecks: {},
    },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
  };
}

// Flush microtasks so the async toggleReminder wiring (which awaits
// rescheduleAllNotifications under the hood) completes before the
// assertion runs.
async function flushAsync() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

beforeEach(() => {
  wellnessSettingsStore.current = seedSettings();
  updateSettingsMock.mockReset();
  rescheduleAllNotificationsMock.mockReset();
});

const PERIODS = ['morning', 'evening'] as const;

describe.each(PERIODS)(
  'Phase 34 NOT.B2 — WellnessCheckInDrawer save → reschedule (period=%s)',
  (period) => {
    const coreLabels =
      period === 'morning'
        ? ['Sleep quality', 'Mood', 'Energy']
        : ['Mood', 'Meals tracked', 'Day rating', 'Highlights & concerns'];

    it('contract a (REMINDER TOGGLE → RESCHEDULE): tapping the wellness-${period}-reminder-switch triggers rescheduleAllNotifications(DEFAULT_PATIENT_ID)', async () => {
      const { getByTestId } = render(
        <WellnessCheckInDrawer
          period={period}
          enabled={true}
          onToggleEnabled={() => {}}
        />,
      );
      const reminderSwitch = getByTestId(`wellness-${period}-reminder-switch`);
      await reminderSwitch.props.onValueChange(false);
      await flushAsync();

      // updateSettings still writes (B2 does not remove the
      // wellnessSettings persistence — it ADDS the reschedule call
      // alongside).
      expect(updateSettingsMock).toHaveBeenCalledTimes(1);
      expect(updateSettingsMock.mock.calls[0][0][period].reminderEnabled).toBe(
        false,
      );

      // The B2 trust closure — rescheduleAllNotifications is called
      // with the canonical DEFAULT_PATIENT_ID. B1's gate then reads
      // the new reminderEnabled state at schedule time.
      expect(rescheduleAllNotificationsMock).toHaveBeenCalledTimes(1);
      expect(rescheduleAllNotificationsMock).toHaveBeenCalledWith('default');
    });

    it("contract a' (CHECK TOGGLE → NO RESCHEDULE): tapping a CORE chip writes to wellnessSettings.{period}.checks but does NOT trigger rescheduleAllNotifications (no thrash on non-notification edits)", async () => {
      const { getByText } = render(
        <WellnessCheckInDrawer
          period={period}
          enabled={true}
          onToggleEnabled={() => {}}
        />,
      );
      fireEvent.press(getByText(coreLabels[0]));
      await flushAsync();

      // The checks write happens.
      expect(updateSettingsMock).toHaveBeenCalledTimes(1);
      const arg = updateSettingsMock.mock.calls[0][0];
      expect(Array.isArray(arg[period].checks)).toBe(true);

      // But no reschedule fires. The checks field isn't notification-
      // relevant; reschedule would wipe the entire OS queue (banked
      // trap 3) for no behavior change.
      expect(rescheduleAllNotificationsMock).not.toHaveBeenCalled();
    });
  },
);
