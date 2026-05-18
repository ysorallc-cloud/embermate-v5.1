/**
 * Understand tab — render smoke test.
 *
 * Pattern follows __tests__/app/supportScreenSmoke.test.tsx. The Understand
 * screen has heavy SVG charts, providerPrep building, and a large insights
 * pipeline. We mock the data-loader to return an empty UnderstandPageData
 * shape, stub the SVG primitives, and assert the screen mounts, the
 * "Insights" title shows, the empty-state copy appears for daysOfData=0,
 * and the Settings primary action is tappable.
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
    // Phase 15.11 — ShareSheet mounts a Modal; the consolidated
    // Share CTA routes through Share.share. Both stubbed for the
    // smoke test.
    Modal: make('Modal'),
    Share: { share: jest.fn().mockResolvedValue({ action: 'dismissedAction' }) },
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

// Mirror the journal pattern: fire focus callback inside a useEffect so the
// initial data-load runs without referencing local closures during render.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const make = (name: string) => (props: any) =>
    React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Polyline: make('Polyline'),
    Circle: make('Circle'),
    Path: make('Path'),
    Defs: make('Defs'),
    LinearGradient: make('LinearGradient'),
    Stop: make('Stop'),
    G: make('G'),
    Rect: make('Rect'),
    Text: make('SvgText'),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  BorderRadius: { sm: 4, md: 8, lg: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular', serifItalic: 'SourceSerif4_400Regular_Italic', serifMedium: 'SourceSerif4_500Medium', serifSemiBold: 'SourceSerif4_600SemiBold' },
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({
    activePatient: { id: 'default', name: 'Mom' },
    patients: [{ id: 'default', name: 'Mom' }],
  }),
}));

// ── Heavy child components / shared primitives ─────────────────────────────
jest.mock('../../components/aurora/AuroraBackground', () => {
  const React = require('react');
  return { AuroraBackground: () => React.createElement('AuroraBackground', null) };
});

jest.mock('../../components/ScreenHeader', () => {
  const React = require('react');
  return {
    __esModule: true,
    ScreenHeader: ({ title, rightAction }: any) =>
      React.createElement(
        'View',
        null,
        React.createElement('Text', null, title),
        rightAction ?? null,
      ),
    default: ({ title, rightAction }: any) =>
      React.createElement(
        'View',
        null,
        React.createElement('Text', null, title),
        rightAction ?? null,
      ),
  };
});

jest.mock('../../components/shared/ShareToast', () => ({
  ShareToast: () => null,
}));

jest.mock('../../components/insights/UpcomingVisitInsightsCard', () => ({
  UpcomingVisitInsightsCard: () => null,
}));

// ── Insights data layer: returns the empty-data shape ─────────────────────
jest.mock('../../utils/understandInsights', () => ({
  loadUnderstandPageData: jest.fn().mockResolvedValue({
    timeRange: 7,
    framing: { primary: '', secondary: '', context: '' },
    standOutInsights: [],
    positiveObservations: [],
    correlationCards: [],
    hasEnoughData: false,
    daysOfData: 0,
    adherenceRate: 0,
    dosesLogged: 0,
    dosesScheduled: 0,
    avgMealsPerDay: 0,
    avgHydrationPerDay: 0,
    avgSleepHours: 0,
    avgWellnessPerDay: 0,
    lunchSkipRate: 0,
    isSampleData: false,
  }),
  generatePlainLanguageSummary: jest.fn(() => ''),
}));

// ── Storage / utils ────────────────────────────────────────────────────────
jest.mock('../../utils/providerPrepBuilder', () => ({
  buildProviderPrep: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn().mockResolvedValue([]),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-04-25',
  toLocalDateString: (d: Date) => d.toISOString().split('T')[0],
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

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UnderstandScreen from '../../app/(tabs)/understand';
import { navigate } from '../../lib/navigate';

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

beforeEach(() => mockNavigate.mockClear());

/** Render and wait for the "Analyzing patterns..." spinner to clear. */
async function renderUnderstand() {
  const utils = render(<UnderstandScreen />);
  await waitFor(() => expect(utils.queryByText(/Analyzing patterns/)).toBeNull());
  return utils;
}

describe('UnderstandScreen — render smoke test', () => {
  it('mounts without throwing in the empty (no data) state', async () => {
    await expect(renderUnderstand()).resolves.toBeDefined();
  });

  it('renders the "Insights" title', async () => {
    const { getByText } = await renderUnderstand();
    expect(getByText('Insights')).toBeTruthy();
  });

  it('renders the empty-state preview when daysOfData is 0', async () => {
    // Phase 4 of v6.7 visual-consistency replaced the "No data yet" /
    // "Building your picture" banners with the InsightsEmptyStatePreview
    // consolidated card. The card surfaces the v7-tease copy ("PATTERNS
    // COMING") + the redirect tip ("Start logging from Now").
    const { getByText } = await renderUnderstand();
    expect(getByText('PATTERNS COMING')).toBeTruthy();
    expect(getByText(/Start logging from Now/)).toBeTruthy();
  });

  it('teases what\'s coming via the consolidated card', async () => {
    // The "Patterns coming" headline anchors the empty state. The 4-row
    // "What we'll be watching for" preview lives inside the same card.
    const { getByText } = await renderUnderstand();
    expect(getByText(/more day[s]?, then trends appear/)).toBeTruthy();
    expect(getByText("WHAT WE'LL BE WATCHING FOR")).toBeTruthy();
  });

  it('renders the Settings primary action with proper a11y', async () => {
    const { getByLabelText } = await renderUnderstand();
    const settings = getByLabelText('Settings');
    expect(settings.props.accessibilityRole).toBe('button');
  });

  it('tapping the Settings gear navigates to /settings', async () => {
    const { getByLabelText } = await renderUnderstand();
    fireEvent.press(getByLabelText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});
