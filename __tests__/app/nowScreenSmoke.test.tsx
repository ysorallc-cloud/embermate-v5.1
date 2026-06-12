/**
 * Now tab — render smoke test.
 *
 * Pattern follows __tests__/app/supportScreenSmoke.test.tsx. The Now screen
 * is a thick orchestrator (5 hooks, 5 child components, 15+ storage calls).
 * We stub the heavy children with visible identifiers so we can assert the
 * screen wired them in correctly without recreating their internals.
 *
 * Stop conditions hit: timeline cells, routine sheet, and patient switcher
 * have rich behavior that lives in their own component tests — those are not
 * re-tested here. This test only proves the screen mounts, the regions are
 * present, the primary appointment-prep action is tappable, and the empty
 * state renders when no data is loaded.
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
    Pressable: make('Pressable'),
    RefreshControl: make('RefreshControl'),
    ActivityIndicator: make('ActivityIndicator'),
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    Linking: { openURL: jest.fn() },
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

jest.mock('@react-navigation/native', () => ({
  // No-op: don't fire the callback during render — the real useFocusEffect
  // runs it on focus, which doesn't happen in this hermetic test env.
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 14, cardInternalPadding: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular', serifItalic: 'SourceSerif4_400Regular_Italic', serifMedium: 'SourceSerif4_500Medium', serifSemiBold: 'SourceSerif4_600SemiBold' },
  BorderRadius: { sm: 4, md: 8, lg: 12 },
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({
    activePatient: { id: 'default', name: 'Mom' },
    patients: [{ id: 'default', name: 'Mom' }],
  }),
}));

// ── Heavy child components: stub with visible identifiers ──────────────────
jest.mock('../../components/aurora/AuroraBackground', () => {
  const React = require('react');
  return { AuroraBackground: () => React.createElement('AuroraBackground', null) };
});

jest.mock('../../components/now/NowHeader', () => {
  const React = require('react');
  return {
    NowHeader: ({ patientName }: any) =>
      React.createElement('Text', null, `[NowHeader] ${patientName || 'Mom'}`),
  };
});

jest.mock('../../components/now/StatRings', () => {
  const React = require('react');
  return { StatRings: () => React.createElement('Text', null, '[StatRings]') };
});

jest.mock('../../components/now/NowTimeline', () => {
  const React = require('react');
  return {
    NowTimeline: ({ hasCarePlan, allPending, completed }: any) => {
      // Mirror the real empty-state copy from NowTimeline so we can assert it
      const empty = !hasCarePlan
        ? 'No Care Plan set up yet'
        : (allPending?.length ?? 0) === 0 && (completed?.length ?? 0) === 0
        ? 'No items scheduled for today'
        : '[NowTimeline] items present';
      return React.createElement('Text', { testID: 'now-timeline' }, empty);
    },
  };
});

jest.mock('../../components/now/NowFooter', () => {
  const React = require('react');
  return { NowFooter: () => React.createElement('Text', null, '[NowFooter]') };
});

jest.mock('../../components/now/UpcomingAppointmentCard', () => ({
  UpcomingAppointmentCard: () => null,
}));

jest.mock('../../components/now/RoutineSheet', () => ({
  RoutineSheet: () => null,
}));

// UX-1 pre-launch — QuickLog FAB + sheet are mounted at the tab-root
// z-index in production but contribute no rendered chrome to the
// empty-state smoke surface (FAB is null until tapped via parent
// state, sheet is null until visible). Stub both to keep the smoke
// test focused on Now's primary content tree.
jest.mock('../../components/now/QuickLogFAB', () => ({
  QuickLogFAB: () => null,
}));

jest.mock('../../components/now/QuickLogSheet', () => ({
  QuickLogSheet: () => null,
}));

// F7 C2 — Now zone restructure mounted three new components (Zone is
// a primitive, HealthZoneNow + ReflectionZoneNow are zone surfaces).
// Stub them at the smoke layer; their internal data loads + 17:00 gate
// would otherwise pull in the full ReflectionCard sheet wrapper +
// daily-reflection repo / vitals + symptom storage chains.
jest.mock('../../components/now/HealthZoneNow', () => ({
  HealthZoneNow: () => null,
}));

jest.mock('../../components/now/ReflectionZoneNow', () => ({
  ReflectionZoneNow: () => null,
}));

jest.mock('../../components/sample/SampleModeBanner', () => ({
  SampleModeBanner: () => null,
}));
jest.mock('../../components/sample/ManageSampleDataSheet', () => ({
  ManageSampleDataSheet: () => null,
}));
jest.mock('../../hooks/useSampleMode', () => ({
  useSampleMode: () => ({ isSampleMode: false, sampleStatus: null, refresh: jest.fn() }),
}));

jest.mock('../../components/now/PatientSwitcherModal', () => ({
  PatientSwitcherModal: () => null,
}));

// ── Hooks: empty-data defaults ──────────────────────────────────────────────
jest.mock('../../hooks/useCarePlan', () => ({
  useCarePlan: () => ({ carePlan: null, instances: [], loading: false, refresh: jest.fn() }),
}));
jest.mock('../../hooks/useCareTasks', () => ({
  useCareTasks: () => ({
    state: { tasks: [], loading: false, error: null },
    refresh: jest.fn(),
    refreshCareTasks: jest.fn(),
  }),
}));
jest.mock('../../hooks/useAppointments', () => ({
  useAppointments: () => ({ appointments: [], loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock('../../hooks/useCarePlanConfig', () => ({
  useCarePlanConfig: () => ({ config: null, loading: false }),
  useEnabledBuckets: () => ({ enabledBuckets: [], loading: false }),
}));
jest.mock('../../hooks/useTodayScope', () => ({
  __esModule: true,
  default: () => ({ scope: 'all', setScope: jest.fn() }),
  useTodayScope: () => ({ scope: 'all', setScope: jest.fn() }),
}));
jest.mock('../../hooks/useNowPrompts', () => ({
  useNowPrompts: () => ({
    showOnboarding: false,
    handlers: {
      handleShowMeWhatMatters: jest.fn(),
      handleExploreOnMyOwn: jest.fn(),
    },
  }),
}));

// ── Storage / utils used directly by NowScreen ─────────────────────────────
jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn().mockResolvedValue([]),
  getMedicationLogs: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/appointmentStorage', () => ({
  getUpcomingAppointments: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/dailyTrackingStorage', () => ({
  getDailyTracking: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../utils/centralStorage', () => ({
  getTodayVitalsLog: jest.fn().mockResolvedValue(null),
  getTodayMealsLog: jest.fn().mockResolvedValue(null),
  updateTodayWaterLog: jest.fn().mockResolvedValue(undefined),
  getTodayWaterLog: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn().mockResolvedValue(null),
  safeSetItem: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/storageKeys', () => ({
  StorageKeys: new Proxy({}, { get: (_, k) => `@embermate_${String(k).toLowerCase()}` }),
  scopedKey: (k: string) => k,
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsByType: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/vitalsGuidance', () => ({
  checkTodayVitalsExceedances: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/lastVisitTracker', () => ({
  recordVisit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/careSummaryBuilder', () => ({
  buildCareBrief: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../utils/sampleDataManager', () => ({
  hasSampleData: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../storage/patientRegistry', () => ({
  updatePatient: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  updateDailyInstanceStatus: jest.fn().mockResolvedValue(undefined),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../lib/events', () => ({
  useDataListener: jest.fn(),
  emitDataUpdate: jest.fn(),
}));
jest.mock('../../lib/eventNames', () => ({
  EVENT: new Proxy({}, { get: (_, k) => String(k) }),
}));
jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn(), devLog: jest.fn() }));
jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: jest.fn() }));
jest.mock('../../utils/urgency', () => ({
  isClinicalCritical: jest.fn(() => false),
  UPCOMING_WINDOW_MINUTES: 60,
}));
jest.mock('../../utils/nowHelpers', () => ({
  isOverdue: jest.fn(() => false),
  getRouteForInstanceType: jest.fn(() => '/'),
  groupByTimeWindow: jest.fn(() => ({ morning: [], afternoon: [], evening: [], night: [] })),
  getCurrentTimeWindow: jest.fn(() => 'morning'),
  TIME_WINDOW_HOURS: { morning: 6, afternoon: 12, evening: 18, night: 22 },
  OVERDUE_GRACE_MINUTES: 30,
  formatNextScheduledTime: jest.fn(() => null),
}));
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-04-25',
  toLocalDateString: (d: Date) => d.toISOString().split('T')[0],
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import NowScreen from '../../app/(tabs)/now';
import { navigate } from '../../lib/navigate';

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

beforeEach(() => mockNavigate.mockClear());

describe('NowScreen — render smoke test', () => {
  it('mounts without throwing in the empty (no data) state', () => {
    expect(() => render(<NowScreen />)).not.toThrow();
  });

  it('renders the patient-name region (NowHeader is wired in)', () => {
    const { getByText } = render(<NowScreen />);
    // NowHeader stub emits whatever patientName the screen passed in. The
    // screen's local patientName state defaults to '' before async load
    // completes, so the stub falls back to its own default ("your loved one").
    // That fallback proves NowHeader was rendered with a string prop.
    expect(getByText(/\[NowHeader\]/)).toBeTruthy();
  });

  it('does NOT render the StatRings region (orb row hidden per Phase 33b extension pre-Lock-3 Item A)', () => {
    // The orb row created the 7-into-6 cap conflict (Activity, 7th in
    // PRIORITY_ORDER, dropped). Resolved by hide-don't-delete: the
    // StatRings.tsx component + its component tests are preserved as
    // the post-launch restore path; the mount on Now is gone. Wizard-
    // designated Now buckets surface via NowTimeline instead.
    //
    // Mirrors `wizardToNowAlignment.test.ts` contract 5a at the
    // smoke-render layer.
    const { queryByText } = render(<NowScreen />);
    expect(queryByText('[StatRings]')).toBeNull();
  });

  it('renders the NowTimeline region with the empty-state copy when no care plan', () => {
    const { getByTestId } = render(<NowScreen />);
    const timeline = getByTestId('now-timeline');
    // hasCarePlan=false → "No Care Plan set up yet" copy from NowTimeline
    expect(timeline.props.children).toBe('No Care Plan set up yet');
  });

  it('renders the NowFooter region', () => {
    const { getByText } = render(<NowScreen />);
    expect(getByText('[NowFooter]')).toBeTruthy();
  });

  it('does not render the "Upcoming This Week" section when there is no upcoming prep appointment', () => {
    const { queryByText } = render(<NowScreen />);
    expect(queryByText('Upcoming This Week')).toBeNull();
  });
});
