// ============================================================================
// WELLNESS MERGE — F1 mount-test scaffold (RED-first).
//
// Pins the MERGED "Wellness Check-in" row behavior on the Care Plan
// home screen BEFORE the collapse is built. This test is RED on
// purpose: the screen currently renders TWO pseudo-key rows
// ('wellness-morning' / 'wellness-evening'), so every contract that
// asks for the single 'wellness' row fails until F2 collapses the
// DAILY_TRACKING_ROWS pseudo-keys back to one real row.
//
// AUDIT CONFIRMED (re-run against current code, not the brief):
//   • Storage is UNCHANGED. One `wellness` bucket with a `timesOfDay`
//     array already drives both windows (carePlanConfig.wellness +
//     the P5 wellnessSettings store). DAILY_TRACKING_BUCKETS keeps
//     'wellness' as the real BucketType (index.tsx:103); only the UI
//     row list (DAILY_TRACKING_ROWS, 109-114) splits it. So this is a
//     UI-only merge — no migration. The storage round-trip contracts
//     in __tests__/integration/wellnessSplitRoundTripF5_3.test.ts
//     (rt-1..rt-5) stay GREEN through this change and are the proof
//     that the membership write is unaffected.
//
// SCOPE NOTES (final state — the F1-time assumptions below were
// resolved by later slices):
//   • SUBTITLE FORMAT: the merged row's subtitle is formatted from
//     wellness.timesOfDay with an ampersand join (F2 decision —
//     superseded the original comma proposal): "Morning & Evening" /
//     "Morning" / "Evening" / legacy "Morning, Afternoon & Evening";
//     off → no subtitle. See the contract 3/4/5/5b assertions below.
//   • DRAWER COMPOSITION: the merged row's drawer is the compact
//     per-window WellnessWindowsDrawer (F3). The F1-time guess (stack
//     two WellnessCheckInDrawers) was NOT taken; that component was
//     retired in F5. Contract 7 (per-window write wiring) is owned by
//     wellnessWindowsDrawerF3.test.tsx and skipped here.
//
// Mirrors the mock scaffold in
// __tests__/app/carePlanHomeScreenSmoke.test.tsx (the F5.3.1
// smoke-mount pattern) but makes the wellness config mutable so the
// four canonical shapes can be seeded per-test.
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
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    Switch: make('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    ActivityIndicator: make('ActivityIndicator'),
    Animated: {
      View: make('Animated.View'),
      Value: class { setValue() {} },
      timing: () => ({ start: jest.fn() }),
    },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Alert: { alert: jest.fn() },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }: any) =>
      React.createElement('LinearGradient', null, children),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name }: any) =>
      React.createElement('Ionicons', { name }, null),
  };
});

// DateTimePicker is mounted by the live WellnessWindowsDrawer (F3) when
// the user taps the time chip. Stub it so the home screen mount doesn't
// fail to load the native module.
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

// notificationService.rescheduleAllNotifications is fire-and-forget
// in the drawer's reminder + time-edit handlers. Stub to a no-op so
// the mount doesn't pull in the full scheduler module.
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn().mockResolvedValue(undefined),
}));

// services/carePlanGenerator's ensureDailyInstances is called inside
// the time-edit handler; in this test it's never reached (no time
// edit fired), so a plain stub suffices.
jest.mock('../../services/carePlanGenerator', () => ({
  ensureDailyInstances: jest.fn().mockResolvedValue(undefined),
  getTodayDateString: () => '2026-06-13',
}));

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
  BorderRadius: { sm: 4, md: 8, lg: 12 },
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({
    activePatient: { id: 'default', name: 'Mom' },
    patients: [{ id: 'default', name: 'Mom' }],
  }),
}));

// ── Mutable wellness config — set per-test to seed the four shapes.
// The `mock` name prefix lets the jest.mock factory close over it
// despite hoisting (babel-jest allowlists mock-prefixed identifiers).
let mockWellness: { enabled: boolean; timesOfDay: string[] } = {
  enabled: true,
  timesOfDay: ['morning', 'evening'],
};
const mockUpdateBucket = jest.fn();

jest.mock('../../hooks/useCarePlanConfig', () => {
  return {
    useCarePlanConfig: () => {
      const wellnessEnabled = mockWellness.enabled;
      const config = {
        id: 'cp-test',
        patientId: 'default',
        schemaVersion: 1,
        version: 1,
        meds: { enabled: true, medications: [] },
        vitals: { enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] },
        wellness: { enabled: wellnessEnabled, timesOfDay: mockWellness.timesOfDay },
        meals: { enabled: true, timesOfDay: ['morning', 'midday', 'evening'] },
        water: { enabled: false },
        sleep: { enabled: false },
        activity: { enabled: false },
        appointments: { enabled: false },
        errands: { enabled: false },
        shifts: { enabled: false },
        self_care: { enabled: false },
      };
      const enabledBuckets = ['meds', 'vitals', 'meals'];
      if (wellnessEnabled) enabledBuckets.push('wellness');
      return {
        config,
        enabledBuckets,
        loading: false,
        toggleBucket: jest.fn(),
        updateBucket: mockUpdateBucket,
        getBucketStatus: jest.fn(() => null),
        initializeConfig: jest.fn(),
      };
    },
  };
});

const mockUpdateSettings = jest.fn();
jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: {
      morning: { enabled: true, time: '07:00', checks: ['sleep', 'mood', 'energy'], reminderEnabled: true, optionalChecks: {} },
      evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
      afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: false, optionalChecks: {} },
      vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
    },
    updateSettings: mockUpdateSettings,
  }),
}));

// ── Heavy children ─────────────────────────────────────────────────────────
jest.mock('../../components/careplan/drawers/ActivityDrawer', () => ({
  ActivityDrawer: () => null,
}));
jest.mock('../../components/careplan/drawers/WaterDrawer', () => ({
  WaterDrawer: () => null,
}));
jest.mock('../../components/careplan/drawers/SleepDrawer', () => ({
  SleepDrawer: () => null,
}));
jest.mock('../../components/careplan/drawers/MealsDrawer', () => {
  const React = require('react');
  return {
    MealsDrawer: () => React.createElement('Text', { testID: 'drawer-meals-body' }, '[MealsDrawer]'),
  };
});
jest.mock('../../components/careplan/drawers/AppointmentsDrawer', () => ({
  AppointmentsDrawer: () => null,
}));
jest.mock('../../components/careplan/drawers/VitalsDrawer', () => {
  const React = require('react');
  return {
    VitalsDrawer: () => React.createElement('Text', { testID: 'drawer-vitals-body' }, '[VitalsDrawer]'),
  };
});
// NOTE: the merged row's drawer (compact per-window rows) is F3,
// built to a forthcoming mock — F2's drawer body is intentionally
// empty, so no wellness-drawer component is mounted here.
jest.mock('../../components/careplan/drawers/MedicationsDrawer', () => {
  const React = require('react');
  return {
    MedicationsDrawer: () => React.createElement('Text', { testID: 'drawer-meds-body' }, '[MedicationsDrawer]'),
  };
});

jest.mock('../../components/common/InfoModal', () => {
  const React = require('react');
  return {
    InfoModal: () => null,
    InfoIconButton: ({ onPress }: any) =>
      React.createElement('TouchableOpacity', { testID: 'info-icon', onPress }, null),
  };
});
jest.mock('../../components/SubScreenHeader', () => {
  const React = require('react');
  return {
    SubScreenHeader: ({ title }: any) =>
      React.createElement('Text', { testID: 'sub-screen-header' }, title),
  };
});
jest.mock('../../components/SectionEyebrow', () => {
  const React = require('react');
  return {
    SectionEyebrow: ({ text }: any) =>
      React.createElement('Text', null, text),
  };
});
jest.mock('../../components/careplan/AddItemSheet', () => ({
  AddItemSheet: () => null,
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import CarePlanHomeScreen from '../../app/care-plan/index';

function setWellness(shape: { enabled: boolean; timesOfDay: string[] }) {
  mockWellness = shape;
}

describe('Wellness merge — F1 merged-row mount test (RED before F2/F3 collapse)', () => {
  beforeEach(() => {
    mockUpdateBucket.mockClear();
    setWellness({ enabled: true, timesOfDay: ['morning', 'evening'] });
  });

  it('contract 1 (ONE MERGED ROW): a single category-row-wellness renders, and NEITHER pseudo-key row survives', () => {
    const { getByTestId, queryByTestId } = render(<CarePlanHomeScreen />);
    expect(getByTestId('category-row-wellness')).toBeTruthy();
    expect(queryByTestId('category-row-wellness-morning')).toBeNull();
    expect(queryByTestId('category-row-wellness-evening')).toBeNull();
  });

  it('contract 2 (LABEL): the merged row is labeled "Wellness Check-in" (no "Morning"/"Evening" prefix)', () => {
    const { getByTestId } = render(<CarePlanHomeScreen />);
    const row = getByTestId('category-row-wellness');
    expect(within(row).getByText('Wellness Check-in')).toBeTruthy();
  });

  it('contract 3 (SUBTITLE — BOTH WINDOWS): timesOfDay ["morning","evening"] formats to "Morning & Evening" (ampersand, capitalized)', () => {
    setWellness({ enabled: true, timesOfDay: ['morning', 'evening'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);
    const row = getByTestId('category-row-wellness');
    expect(within(row).getByText('Morning & Evening')).toBeTruthy();
  });

  it('contract 4 (SUBTITLE — MORNING ONLY): timesOfDay ["morning"] formats to "Morning"', () => {
    setWellness({ enabled: true, timesOfDay: ['morning'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);
    const row = getByTestId('category-row-wellness');
    expect(within(row).getByText('Morning')).toBeTruthy();
  });

  it('contract 5 (SUBTITLE — EVENING ONLY): timesOfDay ["evening"] formats to "Evening"', () => {
    setWellness({ enabled: true, timesOfDay: ['evening'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);
    const row = getByTestId('category-row-wellness');
    expect(within(row).getByText('Evening')).toBeTruthy();
  });

  it('contract 5b (SUBTITLE — LEGACY 3 PERIODS, Decision 1): timesOfDay ["morning","midday","evening"] formats to "Morning, Afternoon & Evening" — legacy periods stay visible', () => {
    // Decision 1: a pre-F5.3 user may carry 'midday' (or 'night') in
    // timesOfDay. The merged subtitle must surface every period
    // present (comma list + "&" before the last) so nothing active is
    // invisible. 'midday' renders as "Afternoon" per the canon
    // (carePlanUnifiedTimeModel34F1 contract 11 bans "Midday").
    setWellness({ enabled: true, timesOfDay: ['morning', 'midday', 'evening'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);
    const row = getByTestId('category-row-wellness');
    expect(within(row).getByText('Morning, Afternoon & Evening')).toBeTruthy();
  });

  it('contract 6 (OFF SHAPE): disabled wellness still renders one merged row, with no subtitle and no expanded drawer', () => {
    setWellness({ enabled: false, timesOfDay: [] });
    const { getByTestId, queryByText, queryByTestId } = render(<CarePlanHomeScreen />);
    expect(getByTestId('category-row-wellness')).toBeTruthy();
    expect(queryByText('Morning, Evening')).toBeNull();
    expect(queryByText('Morning')).toBeNull();
    expect(queryByText('Evening')).toBeNull();
    expect(queryByTestId('drawer-wellness')).toBeNull();
  });

  // ── Contract 7 — PER-WINDOW WRITE WIRING (F3, now LIVE) ───────────────────
  // The merged row's drawer is a single drawer with one compact row per
  // active window — window name, time (tap to edit), reminder bell (tap
  // to toggle), enable toggle. The three write wirings the drawer must
  // satisfy, asserted at the data layer (NOT against which component
  // mounts):
  //    • enable toggle  → wellness.timesOfDay membership (updateBucket)
  //    • time edit      → wellnessSettings.{period}.time (updateSettings)
  //    • reminder bell  → wellnessSettings.{period}.reminderEnabled (updateSettings)
  // Decision 1: a row renders for EVERY period in timesOfDay (legacy
  // included), not just morning/evening.
  //
  // The drawer's own mount-test
  // (__tests__/components/wellnessWindowsDrawerF3.test.tsx) pins each
  // write at the component-isolation layer. These F1 cases re-prove the
  // wiring through the Care Plan home screen mount so the parent's
  // updateBucket route stays connected end-to-end.

  it('contract 7a (PER-WINDOW ENABLE WRITE): toggling morning OFF in the drawer writes wellness {timesOfDay:["evening"], enabled:true} with NO field churn', () => {
    setWellness({ enabled: true, timesOfDay: ['morning', 'evening'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);

    // Expand the merged row, then flip morning's enable Switch off via
    // the compact-row Switch's valueChange event.
    fireEvent.press(getByTestId('category-row-wellness'));
    fireEvent(getByTestId('wellness-window-morning-enable'), 'valueChange', false);

    expect(mockUpdateBucket).toHaveBeenCalledWith('wellness', {
      timesOfDay: ['evening'],
      enabled: true,
    });
    // No-field-churn guard: the write touches ONLY timesOfDay + enabled.
    const [, updates] = mockUpdateBucket.mock.calls[0];
    expect(Object.keys(updates).sort()).toEqual(['enabled', 'timesOfDay']);
    // Enable wiring must not bleed into the per-period settings store.
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('contract 7b (PER-WINDOW REMINDER WRITE): tapping morning reminder routes to wellnessSettings.morning.reminderEnabled, NOT the bucket', () => {
    setWellness({ enabled: true, timesOfDay: ['morning', 'evening'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);

    fireEvent.press(getByTestId('category-row-wellness'));
    fireEvent.press(getByTestId('wellness-window-morning-reminder'));

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    const patch = mockUpdateSettings.mock.calls[0][0];
    // Pre-state: morning.reminderEnabled = true → expect false after tap.
    expect(patch.morning.reminderEnabled).toBe(false);
    expect(patch.evening.reminderEnabled).toBe(true);
    // The reminder write must NOT touch the bucket.
    expect(mockUpdateBucket).not.toHaveBeenCalled();
  });

  it('contract 7c (PER-WINDOW INDEPENDENCE): with timesOfDay=["morning"], the evening Switch is OFF — and toggling it ON writes ["morning","evening"]', () => {
    setWellness({ enabled: true, timesOfDay: ['morning'] });
    const { getByTestId } = render(<CarePlanHomeScreen />);

    fireEvent.press(getByTestId('category-row-wellness'));
    // Evening row still renders (standard always-shown); enable Switch
    // reads off.
    const eveningSwitch = getByTestId('wellness-window-evening-enable');
    expect(eveningSwitch.props.value).toBe(false);

    // Flipping it on extends the membership.
    fireEvent(eveningSwitch, 'valueChange', true);
    expect(mockUpdateBucket).toHaveBeenCalledWith('wellness', {
      timesOfDay: ['morning', 'evening'],
      enabled: true,
    });
  });
});
