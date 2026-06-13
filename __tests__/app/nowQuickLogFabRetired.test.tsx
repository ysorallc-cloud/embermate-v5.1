// ============================================================================
// QUICKLOG FAB RETIRED — ad-hoc logging routes through one "Log something else"
// link to /quick-log-more.
//
// Pre-fix: Now rendered <QuickLogFAB> at the tab-root z-index (floating button)
// + <QuickLogSheet> as its modal companion. The FAB+sheet pair was a UX-1
// pre-launch addition that competed with the rest of the Now zone hierarchy
// (HealthZoneNow already routes Vitals / Mood / Meals / Symptoms; the
// hydration LogToast already routes its own +cup add via /quick-log-more).
//
// Gate cleared:
//   • Vitals, Mood, Meals, Symptom — covered by HealthZoneNow tap-to-log.
//   • Water — covered by the existing hydration LogToast onAdd path.
//   • Note + anything else — /quick-log-more is the catch-all picker.
//
// Nothing strands. Replacing the FAB with a single "Log something else →"
// text link calms the visual hierarchy without losing the catch-all
// affordance.
//
// CONTRACT BUNDLE
//
//   A. SOURCE — app/(tabs)/now.tsx
//      1. Does not import QuickLogFAB.
//      2. Does not render <QuickLogFAB ... />.
//      3. Does not render <QuickLogSheet ... /> (nothing else opened it
//         besides the FAB; the mount retires alongside).
//      4. Does not declare the `quickLogSheetOpen` state setter.
//
//   B. MOUNT — Now screen restructure
//      ([[feedback_screen_restructure_needs_mount_test]])
//      5. Now mounts in the seeded empty-data state without crashing.
//      6. The QuickLogFAB stub identifier is NOT in the rendered tree
//         (the floating button is gone).
//      7. The "Log something else" affordance IS in the rendered tree.
//      8. Pressing the affordance fires navigate('/quick-log-more') —
//         proves the catch-all entry survives.
//
//   C. REGRESSION GUARDS
//      9. HealthZoneNow stub still renders (the catch-all link is
//         ADDITIVE, not the sole logging path; the zone keeps its own
//         Vitals/Mood/Meals/Symptom routing).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

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

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
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

// ── Heavy child component stubs (visible identifiers) ──────────────────────
jest.mock('../../components/aurora/AuroraBackground', () => {
  const React = require('react');
  return { AuroraBackground: () => React.createElement('AuroraBackground', null) };
});

jest.mock('../../components/now/NowHeader', () => {
  const React = require('react');
  return { NowHeader: () => React.createElement('Text', null, '[NowHeader]') };
});

jest.mock('../../components/now/StatRings', () => {
  const React = require('react');
  return { StatRings: () => React.createElement('Text', null, '[StatRings]') };
});

jest.mock('../../components/now/NowTimeline', () => {
  const React = require('react');
  return { NowTimeline: () => React.createElement('Text', null, '[NowTimeline]') };
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

// FAB + Sheet stubs: emit visible markers so we can assert ABSENCE after
// the retire commit. Pre-fix, the screen mounts both — these stubs would
// emit '[QuickLogFAB]' / '[QuickLogSheet]' in the tree. Post-fix, neither
// emits because the screen no longer mounts them.
jest.mock('../../components/now/QuickLogFAB', () => {
  const React = require('react');
  return {
    QuickLogFAB: () => React.createElement('Text', null, '[QuickLogFAB]'),
  };
});

jest.mock('../../components/now/QuickLogSheet', () => {
  const React = require('react');
  return {
    QuickLogSheet: () => React.createElement('Text', null, '[QuickLogSheet]'),
  };
});

jest.mock('../../components/now/HealthZoneNow', () => {
  const React = require('react');
  return {
    HealthZoneNow: () => React.createElement('Text', null, '[HealthZoneNow]'),
  };
});

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

// ── Hook stubs: empty-data defaults ────────────────────────────────────────
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
    handlers: { handleShowMeWhatMatters: jest.fn(), handleExploreOnMyOwn: jest.fn() },
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
  getTodayDateString: () => '2026-06-13',
  toLocalDateString: (d: Date) => d.toISOString().split('T')[0],
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NowScreen from '../../app/(tabs)/now';
import { navigate } from '../../lib/navigate';

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;
const ROOT = join(__dirname, '../..');
const NOW_SRC = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

beforeEach(() => mockNavigate.mockClear());

describe('Now QuickLog FAB retired — ad-hoc logging via "Log something else" link', () => {
  describe('A. Source structure', () => {
    const stripped = stripComments(NOW_SRC);

    it('does not import QuickLogFAB', () => {
      expect(stripped).not.toMatch(/import\s*\{[^}]*\bQuickLogFAB\b[^}]*\}/);
    });

    it('does not render <QuickLogFAB ...>', () => {
      expect(stripped).not.toMatch(/<QuickLogFAB\b/);
    });

    it('does not render <QuickLogSheet ...>', () => {
      // Verified per user: nothing besides the FAB opens the sheet, so the
      // sheet retires alongside. The file stays on disk (dormant).
      expect(stripped).not.toMatch(/<QuickLogSheet\b/);
    });

    it('does not declare the quickLogSheetOpen state setter', () => {
      // State went away with the FAB+sheet mount removal.
      expect(stripped).not.toMatch(/\bsetQuickLogSheetOpen\b/);
      expect(stripped).not.toMatch(/\bquickLogSheetOpen\b/);
    });
  });

  describe('B. Mount — Now restructure', () => {
    it('Now mounts without throwing in the seeded empty-data state', () => {
      expect(() => render(<NowScreen />)).not.toThrow();
    });

    it('QuickLogFAB stub is NOT in the rendered tree', () => {
      const { queryByText } = render(<NowScreen />);
      expect(queryByText('[QuickLogFAB]')).toBeNull();
    });

    it('the "Log something else" affordance is rendered', () => {
      const { getByText } = render(<NowScreen />);
      // Match the visible link copy. Allow trailing arrow variant (→ or ->).
      expect(getByText(/Log something else/i)).toBeTruthy();
    });

    it('pressing the affordance fires navigate("/quick-log-more")', () => {
      const { getByText } = render(<NowScreen />);
      const link = getByText(/Log something else/i);
      fireEvent.press(link);
      expect(mockNavigate).toHaveBeenCalledWith('/quick-log-more');
    });
  });

  describe('C. Regression — HealthZoneNow still routes the per-bucket paths', () => {
    it('HealthZoneNow stub still renders (catch-all link is additive)', () => {
      const { getByText } = render(<NowScreen />);
      expect(getByText('[HealthZoneNow]')).toBeTruthy();
    });
  });
});
