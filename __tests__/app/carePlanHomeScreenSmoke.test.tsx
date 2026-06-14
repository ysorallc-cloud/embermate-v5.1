/**
 * Care Plan home — render smoke test.
 *
 * Phase 34 F5.3.1 — added in the F5.3 walk-failure hotfix. The F5.3
 * restructure (wellness split into two pseudo-key rows + getBucketDetail
 * rename to getRowDetail) broke the Care Plan home screen at three
 * call sites that source-pin tests didn't catch. The screen crashes
 * immediately on mount with `ReferenceError: Property 'getBucketDetail'
 * doesn't exist`. Existing carePlan* tests (~25 files) all readFileSync
 * + regex; none mount the React component.
 *
 * THIS TEST IS THE STRUCTURAL GAP CLOSURE. Mirrors the pattern in
 * __tests__/app/nowScreenSmoke.test.tsx + journalScreenSmoke +
 * understandScreenSmoke — mount the actual screen against the live
 * React render tree with mocked context, assert it doesn't throw and
 * the basic landmarks render.
 *
 * STANDING RULE SHARPENED (F5.3.1, fourth sharpening of the test-shape
 * lesson family):
 *   Every screen-level restructure must include a smoke-mount test
 *   that exercises the screen's first paint against the live React
 *   render tree. Source-pin tests verify the SHAPE of code, not the
 *   BEHAVIOR of rendering it. Suite-green is not ship-ready if no
 *   test mounted the screen the restructure touched.
 *
 * The four sharpenings (running tally):
 *   1. Source-pin → behavior-pin (Slice 3-C)
 *   2. Behavior-pin → device-facing layer (F5.1.1)
 *   3. Device-facing layer → device-realistic STATE (F5.1.2)
 *   4. Device-readable → device-MOUNTED (F5.3.1, this file)
 *
 * COMPANION MEMORY:
 *   /Users/ambercook/.claude/projects/.../memory/feedback_screen_restructure_needs_mount_test.md
 */

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

// Wellness-merge F3 (post-8f27238d) — the live Care Plan home screen
// now mounts WellnessWindowsDrawer when the wellness row is enabled +
// expanded, which imports `@react-native-community/datetimepicker`.
// The native module uses ES module syntax that babel-jest can't
// transform; stub it so the smoke test parses + mounts.
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

// Notification scheduler — fire-and-forget from the drawer's reminder +
// time-edit handlers. Stub to a no-op.
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn().mockResolvedValue(undefined),
}));

// services/carePlanGenerator's ensureDailyInstances is invoked inside
// the wellness drawer's time-edit handler; smoke test never triggers
// the edit so a plain stub suffices.
jest.mock('../../services/carePlanGenerator', () => ({
  ensureDailyInstances: jest.fn().mockResolvedValue(undefined),
  getTodayDateString: () => '2026-06-13',
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

// ── Hooks: minimal defaults that exercise the F5.3 restructured paths
jest.mock('../../hooks/useCarePlanConfig', () => {
  // Default-config-ish stub. The wellness bucket is enabled with
  // ['morning', 'evening'] so both pseudo-key rows show as enabled,
  // exercising the new BUCKET_ICON_MAP / getRowDetail paths. The
  // ALWAYS_ON_BUCKETS map (Meds row) ALSO calls getRowDetail —
  // that's the path that crashes pre-fix.
  const config = {
    id: 'cp-test',
    patientId: 'default',
    schemaVersion: 1,
    version: 1,
    meds: { enabled: true, medications: [] },
    vitals: { enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] },
    wellness: { enabled: true, timesOfDay: ['morning', 'evening'] },
    meals: { enabled: true, timesOfDay: ['morning', 'midday', 'evening'] },
    water: { enabled: false },
    sleep: { enabled: false },
    activity: { enabled: false },
    appointments: { enabled: false },
    errands: { enabled: false },
    shifts: { enabled: false },
    self_care: { enabled: false },
  };
  return {
    useCarePlanConfig: () => ({
      config,
      enabledBuckets: ['meds', 'vitals', 'wellness', 'meals'],
      loading: false,
      toggleBucket: jest.fn(),
      updateBucket: jest.fn(),
      getBucketStatus: jest.fn(() => null),
      initializeConfig: jest.fn(),
    }),
  };
});

jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: {
      morning: { enabled: true, time: '07:00', checks: ['sleep', 'mood', 'energy'], reminderEnabled: true, optionalChecks: {} },
      evening: { enabled: true, time: '20:00', checks: ['mood'], reminderEnabled: true, optionalChecks: {} },
      afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: false, optionalChecks: {} },
      vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
    },
    updateSettings: jest.fn(),
  }),
}));

// ── Heavy children: stub with visible identifiers ──────────────────────────
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
// Wellness-merge F5 — the merged row's drawer is WellnessWindowsDrawer
// (the F3 compact per-window drawer); the old WellnessCheckInDrawer is
// no longer imported by this screen, so its mock is retired here.
jest.mock('../../components/careplan/drawers/WellnessWindowsDrawer', () => {
  const React = require('react');
  return {
    WellnessWindowsDrawer: () =>
      React.createElement('Text', { testID: 'drawer-wellness-body' }, '[WellnessWindowsDrawer]'),
  };
});
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
import { render } from '@testing-library/react-native';
import CarePlanHomeScreen from '../../app/care-plan/index';

describe('CarePlanHomeScreen — render smoke test (F5.3.1 — closes the F5.3 walk-failure structural gap)', () => {
  it('contract 1 (DOES NOT THROW): mounts without throwing — proves the three call sites the F5.3 walk surfaced (ALWAYS_ON_BUCKETS map at line 614/615 + ADD_WHEN_READY map at line 749) all resolve their identifiers', () => {
    // THIS IS THE CONTRACT THE F5.3 WALK FAILURE WOULD HAVE CAUGHT.
    // Pre-fix: ReferenceError: Property 'getBucketDetail' doesn't
    // exist (fires at first render of the Meds row inside the
    // ALWAYS_ON_BUCKETS.map). Post-fix: every call site routes to
    // getRowDetail; mount succeeds.
    expect(() => render(<CarePlanHomeScreen />)).not.toThrow();
  });

  it('contract 2 (DAILY TRACKING ROWS RENDER): the daily-tracking section zone is present in the rendered tree', () => {
    const { getByTestId } = render(<CarePlanHomeScreen />);
    expect(getByTestId('section-zone-daily-tracking')).toBeTruthy();
  });

  it('contract 3 (WELLNESS MERGE — ONE WELLNESS CHECK-IN ROW): the merged wellness row renders in the daily-tracking zone, with no pseudo-key siblings', () => {
    // Wellness-merge supersession of Q-34.F5.A Option C — the F5.3
    // pseudo-key split (wellness-morning / wellness-evening) was
    // collapsed back to a single bucket-level 'wellness' row at
    // 8f27238d. Storage shape is unchanged; the per-window enable +
    // time + reminder editing moves into the row's drawer. Forward-
    // guard against a future refactor reintroducing the pseudo-keys.
    const { getByTestId, queryByTestId } = render(<CarePlanHomeScreen />);
    expect(getByTestId('category-row-wellness')).toBeTruthy();
    expect(queryByTestId('category-row-wellness-morning')).toBeNull();
    expect(queryByTestId('category-row-wellness-evening')).toBeNull();
  });

  it('contract 4 (REAL BUCKET ROWS PRESERVED): vitals + meals rows still render alongside the merged wellness row', () => {
    const { getByTestId } = render(<CarePlanHomeScreen />);
    expect(getByTestId('category-row-vitals')).toBeTruthy();
    expect(getByTestId('category-row-meals')).toBeTruthy();
  });
});
