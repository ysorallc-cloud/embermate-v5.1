// ============================================================================
// WELLNESS WINDOWS DRAWER — F3 mount-test (RED before the component lands).
//
// This is the per-window compact drawer behind the merged "Wellness
// Check-in" row on Care Plan home. Layout: ONE drawer, ONE compact row
// per active window (not two full editors stacked). Each row carries:
//   • window name
//   • time (tap to edit)
//   • reminder bell (tap to toggle)
//   • enable Switch
//
// CONTRACTS THIS FILE PINS
//
//   A. Row rendering
//      1. With timesOfDay=['morning','evening'] both standard rows render
//         (independent state per window). No row exists for midday/night.
//      2. STANDARD ROWS ALWAYS RENDER. When timesOfDay=['morning'] only,
//         the evening row STILL renders (so it can be toggled ON later);
//         its enable Switch shows OFF.
//      3. Legacy 'midday' renders its own row when present in timesOfDay
//         — never silently dropped.
//      4. Legacy 'night' renders its own row when present in timesOfDay.
//
//   B. Per-window enable WRITES — drive timesOfDay membership
//      5. Turning morning OFF (with both standard active) →
//         onUpdate({ timesOfDay: ['evening'], enabled: true }).
//      6. Turning evening OFF (with both standard active) →
//         onUpdate({ timesOfDay: ['morning'], enabled: true }).
//      7. Turning the last active window OFF → onUpdate({ timesOfDay: [],
//         enabled: false }).
//      8. Turning a currently-off window ON appends to timesOfDay +
//         enabled=true.
//
//   C. Per-window time WRITE — drives wellnessSettings.{period}.time
//      9. Editing the morning time to "08:30" calls
//         updateSettings({ ...settings, morning: { ...morning, time:
//         '08:30' }}) and DOES NOT touch the wellness-bucket onUpdate.
//
//   D. Per-window reminder WRITE — drives wellnessSettings.{period}.reminderEnabled
//      10. Tapping the morning reminder bell flips
//          wellnessSettings.morning.reminderEnabled (true → false) and
//          DOES NOT touch the wellness-bucket onUpdate.
// ============================================================================

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
    Pressable: make('Pressable'),
    Switch: make('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    Modal: ({ children, visible }: any) =>
      visible ? React.createElement('Modal', null, children) : null,
  };
});

// Theme mock returns the token KEY as its value (e.g. colors.accent →
// 'accent') so the polish contracts can distinguish the muted-sage
// toggle (accentMuted) from the saturated one (accent), the active
// sage bell (accent) from the dim off bell (textMuted), and the gold
// time chip (gold). Existing contracts don't assert colors, so this
// is backward-compatible.
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: (_t, key) => key }),
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, color, testID }: any) =>
      React.createElement('Ionicons', { name, color, testID }, null),
  };
});

jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 14, cardInternalPadding: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular' },
}));

// DateTimePicker mock — emits `onChange(event, newDate)` when fireEvent
// triggers its `time-picker-change` event.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange, value, testID }: any) =>
      React.createElement(
        'DateTimePicker',
        {
          testID: testID ?? 'time-picker',
          value,
          onChange: (e: any, d: any) => onChange?.(e, d),
        },
        null,
      ),
  };
});

// Notification scheduler — no-op in tests (the drawer must not crash
// when it triggers reschedules).
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/carePlanGenerator', () => ({
  ensureDailyInstances: jest.fn().mockResolvedValue(undefined),
  getTodayDateString: () => '2026-06-13',
}));

jest.mock('../../storage/carePlanRepo', () => ({
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

// Mutable settings store so each test can seed its own shape.
let mockSettings: any = {
  morning: { enabled: true, time: '07:00', checks: ['sleep'], reminderEnabled: true, optionalChecks: {} },
  afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: true, optionalChecks: {} },
  evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
  vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
};
const mockUpdateSettings = jest.fn();

jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  }),
}));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WellnessWindowsDrawer } from '../../components/careplan/drawers/WellnessWindowsDrawer';
import { DEFAULT_WELLNESS_SETTINGS } from '../../types/wellnessSettings';
import { rescheduleAllNotifications } from '../../utils/notificationService';
import { ensureDailyInstances } from '../../services/carePlanGenerator';

const ROOT = join(__dirname, '..', '..');
const rescheduleMock = rescheduleAllNotifications as jest.Mock;
const ensureMock = ensureDailyInstances as jest.Mock;
const flush = () => new Promise((r) => setImmediate(r));

function setSettings(next: any) {
  mockSettings = { ...mockSettings, ...next };
}

beforeEach(() => {
  mockUpdateSettings.mockClear();
  rescheduleMock.mockClear();
  ensureMock.mockClear();
  // Reset settings to defaults
  mockSettings = {
    morning: { enabled: true, time: '07:00', checks: ['sleep'], reminderEnabled: true, optionalChecks: {} },
    afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: true, optionalChecks: {} },
    evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
  };
});

describe('WellnessWindowsDrawer — F3 compact per-window rows', () => {
  describe('A. Row rendering', () => {
    it('contract 1: timesOfDay=[morning,evening] renders only the two standard rows', () => {
      const onUpdate = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      expect(getByTestId('wellness-window-morning')).toBeTruthy();
      expect(getByTestId('wellness-window-evening')).toBeTruthy();
      expect(queryByTestId('wellness-window-midday')).toBeNull();
      expect(queryByTestId('wellness-window-night')).toBeNull();
    });

    it('contract 2: standard rows ALWAYS render — evening shows even when not in timesOfDay', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning']}
          onUpdate={onUpdate}
        />,
      );
      // Both standard rows present; the off one is still toggleable.
      expect(getByTestId('wellness-window-morning')).toBeTruthy();
      expect(getByTestId('wellness-window-evening')).toBeTruthy();
      // Evening's enable Switch is OFF (not in timesOfDay).
      const eveningSwitch = getByTestId('wellness-window-evening-enable');
      expect(eveningSwitch.props.value).toBe(false);
      // Morning's enable Switch is ON.
      const morningSwitch = getByTestId('wellness-window-morning-enable');
      expect(morningSwitch.props.value).toBe(true);
    });

    it('contract 3: legacy `midday` renders its own row when present in timesOfDay', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'midday', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      expect(getByTestId('wellness-window-midday')).toBeTruthy();
      expect(getByTestId('wellness-window-midday-enable').props.value).toBe(true);
    });

    it('contract 3b (CANON LABEL): the legacy `midday` row renders the label "Afternoon", NOT "Midday" — matching the merged row subtitle + the codebase ban on "Midday" (wellness-merge F5)', () => {
      const onUpdate = jest.fn();
      const { getByTestId, queryByText } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'midday', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      const middayRow = getByTestId('wellness-window-midday');
      expect(within(middayRow).getByText('Afternoon')).toBeTruthy();
      expect(queryByText('Midday')).toBeNull();
    });

    it('contract 4: legacy `night` renders its own row when present in timesOfDay', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening', 'night']}
          onUpdate={onUpdate}
        />,
      );
      expect(getByTestId('wellness-window-night')).toBeTruthy();
      expect(getByTestId('wellness-window-night-enable').props.value).toBe(true);
    });
  });

  describe('B. Per-window enable WRITES drive timesOfDay membership', () => {
    it('contract 5: morning OFF (both standard active) → onUpdate({ timesOfDay: [evening], enabled: true })', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      fireEvent(getByTestId('wellness-window-morning-enable'), 'valueChange', false);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith({ timesOfDay: ['evening'], enabled: true });
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('contract 6: evening OFF (both standard active) → onUpdate({ timesOfDay: [morning], enabled: true })', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      fireEvent(getByTestId('wellness-window-evening-enable'), 'valueChange', false);
      expect(onUpdate).toHaveBeenCalledWith({ timesOfDay: ['morning'], enabled: true });
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('contract 7: last active window OFF → onUpdate({ timesOfDay: [], enabled: false })', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning']}
          onUpdate={onUpdate}
        />,
      );
      fireEvent(getByTestId('wellness-window-morning-enable'), 'valueChange', false);
      expect(onUpdate).toHaveBeenCalledWith({ timesOfDay: [], enabled: false });
    });

    it('contract 8: turning a currently-off window ON appends + enabled=true', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['evening']}
          onUpdate={onUpdate}
        />,
      );
      fireEvent(getByTestId('wellness-window-morning-enable'), 'valueChange', true);
      expect(onUpdate).toHaveBeenCalledWith({ timesOfDay: ['evening', 'morning'], enabled: true });
    });
  });

  describe('C. Per-window time WRITE drives wellnessSettings.{period}.time', () => {
    it('contract 9: editing morning time → updateSettings with morning.time patched (no bucket write)', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      // Open the time-picker for morning.
      fireEvent.press(getByTestId('wellness-window-morning-time'));
      // Emit the picker change event with 08:30.
      const newDate = new Date();
      newDate.setHours(8, 30, 0, 0);
      fireEvent(getByTestId('wellness-window-morning-time-picker'), 'change', { type: 'set' }, newDate);

      expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
      const patch = mockUpdateSettings.mock.calls[0][0];
      expect(patch.morning.time).toBe('08:30');
      // Other periods preserved.
      expect(patch.evening.time).toBe('20:00');
      expect(patch.afternoon.time).toBe('13:00');
      // No bucket write.
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('D. Per-window reminder WRITE drives wellnessSettings.{period}.reminderEnabled', () => {
    it('contract 10: tapping morning reminder flips reminderEnabled (no bucket write)', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer
          timesOfDay={['morning', 'evening']}
          onUpdate={onUpdate}
        />,
      );
      fireEvent.press(getByTestId('wellness-window-morning-reminder'));
      expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
      const patch = mockUpdateSettings.mock.calls[0][0];
      // Pre-state in settings: morning.reminderEnabled=true → expect false after flip.
      expect(patch.morning.reminderEnabled).toBe(false);
      expect(patch.evening.reminderEnabled).toBe(true);
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  // ── E. F3 POLISH — on-dictionary toggle + bell ──────────────────────────────
  // The raw <Switch> rendered iOS-green/white (off-dictionary, clashing
  // with the sage-track / cream-knob category-row toggle) and the
  // reminder used a 🔔 emoji. Polish: the enable control is the shared
  // themed toggle (accentMuted track / textPrimary knob, NOT the
  // saturated accent), and the reminder is an Ionicons line-glyph bell
  // — ACTIVE = sage (accent), OFF = dim (textMuted). Gold is reserved
  // for the time chip (schedule), never the bell.
  describe('E. F3 polish — on-dictionary toggle + bell glyph', () => {
    it('contract 11 (THEMED TOGGLE, not bare Switch): the enable Switch carries the muted-sage track + cream knob — not iOS-green, not saturated accent', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      const enable = getByTestId('wellness-window-morning-enable');
      // Themed: ON track = accentMuted (muted sage), OFF track =
      // glassStrong. A bare Switch has trackColor === undefined.
      expect(enable.props.trackColor).toEqual({ false: 'glassStrong', true: 'accentMuted' });
      // Must NOT be the saturated category-drawer "Reminders on" sage.
      expect(enable.props.trackColor.true).not.toBe('accent');
      // ON knob = cream (textPrimary); iOS bg = glassStrong.
      expect(enable.props.thumbColor).toBe('textPrimary');
      expect(enable.props.ios_backgroundColor).toBe('glassStrong');
    });

    it('contract 12 (BELL GLYPH — ACTIVE = SAGE): an ON reminder renders the notifications-outline line-glyph in the active sage color (accent), NOT gold, NOT an emoji', () => {
      const onUpdate = jest.fn();
      // morning.reminderEnabled defaults to true.
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      const bell = getByTestId('wellness-window-morning-bell');
      expect(bell.props.name).toBe('notifications-outline');
      expect(bell.props.color).toBe('accent'); // active/sage — a reminder ON = active
      expect(bell.props.color).not.toBe('gold'); // gold is schedule, reserved for the time chip
    });

    it('contract 13 (BELL GLYPH — OFF = DIM): an OFF reminder renders notifications-off-outline in the dim color (textMuted)', () => {
      setSettings({
        evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: false, optionalChecks: {} },
      });
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      const bell = getByTestId('wellness-window-evening-bell');
      expect(bell.props.name).toBe('notifications-off-outline');
      expect(bell.props.color).toBe('textMuted');
    });

    it('contract 14 (TIME CHIP STAYS QUIET GRAY): the time text uses textSecondary, NOT gold — gold is schedule-urgency (Now\'s Up Next), and a static settings time isn\'t that', () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      const timeBtn = getByTestId('wellness-window-morning-time');
      const timeText = within(timeBtn).getByText('7:00 AM');
      expect(timeText.props.style.color).toBe('textSecondary');
      expect(timeText.props.style.color).not.toBe('gold');
    });

    it('contract 15 (SHARED TOGGLE — anti-drift): WellnessWindowsDrawer + CategoryRow both consume the shared ThemedSwitch; the drawer has no bare <Switch>', () => {
      const drawerSrc = readFileSync(
        join(ROOT, 'components/careplan/drawers/WellnessWindowsDrawer.tsx'),
        'utf8',
      );
      const indexSrc = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
      expect(drawerSrc).toMatch(/import\s+\{\s*ThemedSwitch\s*\}\s+from\s+['"].*common\/ThemedSwitch['"]/);
      expect(indexSrc).toMatch(/import\s+\{\s*ThemedSwitch\s*\}\s+from\s+['"].*common\/ThemedSwitch['"]/);
      // No re-inlined raw <Switch> in the drawer (would re-introduce drift).
      expect(drawerSrc).not.toMatch(/<Switch\b/);
    });
  });

  // ── F. ONBOARDING → DRAWER CONSISTENCY (wellness-merge F4) ──────────────────
  // The wizard writes only timesOfDay (no wellnessSettings — Option A
  // keeps onboarding a fast enable-only flow). So when a new user lands
  // in the drawer, the windows they enabled in onboarding must already
  // be populated from the REAL store defaults (07:00 / 20:00 / reminders
  // on) — not blank, not missing. Pinned against the actual
  // DEFAULT_WELLNESS_SETTINGS constant so a defaults change can't
  // silently leave onboarding users with an empty drawer.
  // ── G. RESCHEDULE WIRING (migrated from WellnessCheckInDrawer) ──────────────
  // Migrates the notification-reschedule coverage that previously lived
  // ONLY on the retired WellnessCheckInDrawer (wellnessCheckInDrawer
  // ReschedNotB2 + wellnessTimeEditDrawerB2). Both surfaces share the
  // asymmetric-trigger discipline (CLAUDE.md notification slice):
  //   • reminder toggle → rescheduleAllNotifications ONLY (the gate is a
  //     live read at schedule time; no ensure needed).
  //   • time change → ensureDailyInstances → rescheduleAllNotifications
  //     (fire-time is baked into the instance; bare reschedule fires
  //     stale). Unlike the old drawer (which had NO time-edit UI, so
  //     this path was banked), WellnessWindowsDrawer's time chip makes
  //     it LIVE — hence it must be pinned here.
  describe('G. reschedule wiring (migrated from WellnessCheckInDrawer)', () => {
    it('contract 17 (REMINDER TOGGLE → RESCHEDULE ONLY): tapping a window reminder bell calls rescheduleAllNotifications and does NOT call ensureDailyInstances (asymmetric — live-read gate)', async () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      fireEvent.press(getByTestId('wellness-window-morning-reminder'));
      await flush();
      expect(rescheduleMock).toHaveBeenCalledWith('default');
      expect(ensureMock).not.toHaveBeenCalled();
      // The reminder write itself is the settings store, not the bucket.
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('contract 18 (TIME CHANGE → ENSURE THEN RESCHEDULE): editing a window time calls ensureDailyInstances BEFORE rescheduleAllNotifications (fire-time baked into the instance)', async () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      fireEvent.press(getByTestId('wellness-window-morning-time'));
      const newDate = new Date();
      newDate.setHours(8, 30, 0, 0);
      fireEvent(getByTestId('wellness-window-morning-time-picker'), 'change', { type: 'set' }, newDate);
      await flush();

      expect(ensureMock).toHaveBeenCalledTimes(1);
      expect(rescheduleMock).toHaveBeenCalledWith('default');
      // Order: ensure must precede reschedule (else the OS queue reads a
      // stale scheduledTime).
      expect(ensureMock.mock.invocationCallOrder[0]).toBeLessThan(
        rescheduleMock.mock.invocationCallOrder[0],
      );
    });

    it('contract 19 (NO-OP TIME EDIT → NO RESCHEDULE THRASH): re-picking the SAME time does not fire ensure/reschedule', async () => {
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );
      fireEvent.press(getByTestId('wellness-window-morning-time'));
      // morning default is 07:00 — pick the same time.
      const sameDate = new Date();
      sameDate.setHours(7, 0, 0, 0);
      fireEvent(getByTestId('wellness-window-morning-time-picker'), 'change', { type: 'set' }, sameDate);
      await flush();

      expect(mockUpdateSettings).not.toHaveBeenCalled();
      expect(ensureMock).not.toHaveBeenCalled();
      expect(rescheduleMock).not.toHaveBeenCalled();
    });
  });

  describe('F. onboarding → drawer defaults consistency', () => {
    it('contract 16: after the wizard enables morning+evening, the drawer shows both windows populated with the real defaults (7:00 AM / 8:00 PM, reminders ON)', () => {
      // The store returns DEFAULT_WELLNESS_SETTINGS for a fresh user;
      // the wizard only set timesOfDay=['morning','evening'].
      mockSettings = { ...DEFAULT_WELLNESS_SETTINGS };
      const onUpdate = jest.fn();
      const { getByTestId } = render(
        <WellnessWindowsDrawer timesOfDay={['morning', 'evening']} onUpdate={onUpdate} />,
      );

      // Morning — default 07:00 → "7:00 AM", reminder ON (sage bell).
      const morningTime = within(getByTestId('wellness-window-morning-time')).getByText('7:00 AM');
      expect(morningTime).toBeTruthy();
      expect(getByTestId('wellness-window-morning-bell').props.name).toBe('notifications-outline');

      // Evening — default 20:00 → "8:00 PM", reminder ON.
      const eveningTime = within(getByTestId('wellness-window-evening-time')).getByText('8:00 PM');
      expect(eveningTime).toBeTruthy();
      expect(getByTestId('wellness-window-evening-bell').props.name).toBe('notifications-outline');

      // Both enable toggles read ON (windows are in timesOfDay).
      expect(getByTestId('wellness-window-morning-enable').props.value).toBe(true);
      expect(getByTestId('wellness-window-evening-enable').props.value).toBe(true);
    });
  });
});
