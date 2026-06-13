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

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

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
import { render, fireEvent } from '@testing-library/react-native';
import { WellnessWindowsDrawer } from '../../components/careplan/drawers/WellnessWindowsDrawer';

function setSettings(next: any) {
  mockSettings = { ...mockSettings, ...next };
}

beforeEach(() => {
  mockUpdateSettings.mockClear();
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
});
