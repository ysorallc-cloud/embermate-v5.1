// ============================================================================
// Insights — ring % == card % == canonical, for a profile WITH skipped doses.
//
// The divergence this guards: Insights used to credit skipped doses in the
// DataCard headline ((taken+skipped)/total) while the clinician PDFs counted
// them against (taken/total). The reconcile routes BOTH the ring and the card
// through computeCanonicalAdherence and feeds them the SAME adherence object.
//
// Render-path proof: mount UnderstandScreen with a seeded skipped-dose profile
// (6 completed, 2 skipped, 2 missed → canonical 60%, NOT the credited 80%),
// capture the AdherenceRing.pct prop and the InsightsDataCard.adherence.rate
// prop, and assert they equal each other AND the canonical number.
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
    Pressable: make('Pressable'),
    RefreshControl: make('RefreshControl'),
    ActivityIndicator: make('ActivityIndicator'),
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
    SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
  };
});

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

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: new Proxy({}, { get: () => 8 }),
  BorderRadius: new Proxy({}, { get: () => 8 }),
  Fonts: new Proxy({}, { get: () => 'Poppins_400Regular' }),
}));
jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({
    activePatient: { id: 'default', name: 'Mom' },
    patients: [{ id: 'default', name: 'Mom' }],
  }),
}));

// ── Capture the two surfaces' props ────────────────────────────────────────
jest.mock('../../components/insights/AdherenceRing', () => ({
  AdherenceRing: jest.fn(() => null),
}));
jest.mock('../../components/insights/InsightsDataCard', () => ({
  InsightsDataCard: jest.fn(() => null),
}));

// ── Heavy siblings stubbed ─────────────────────────────────────────────────
jest.mock('../../components/ScreenHeader', () => ({ ScreenHeader: () => null, default: () => null }));
jest.mock('../../components/shared/ShareToast', () => ({ ShareToast: () => null }));
jest.mock('../../components/insights/UpcomingVisitInsightsCard', () => ({ UpcomingVisitInsightsCard: () => null }));
jest.mock('../../components/understand/InsightsEmptyStatePreview', () => ({ InsightsEmptyStatePreview: () => null }));

// ── Data layer: populated page, seeded SKIPPED-dose instances, ready coverage ─
jest.mock('../../utils/understandInsights', () => ({
  loadUnderstandPageData: jest.fn().mockResolvedValue({
    timeRange: 14,
    framing: { primary: '', secondary: '', context: '' },
    standOutInsights: [],
    positiveObservations: [],
    correlationCards: [],
    hasEnoughData: true,
    daysOfData: 20,
    adherenceRate: 0,
    isSampleData: false,
  }),
  generatePlainLanguageSummary: jest.fn(() => ''),
}));

// 6 completed, 2 skipped, 2 missed → canonical 6/10 = 60% (skipped AGAINST).
// The old skipped-credited math would read (6+2)/10 = 80%.
const SKIPPED_PROFILE = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, itemType: 'medication', status: 'completed', scheduledTime: '2026-06-10T08:00:00' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `s${i}`, itemType: 'medication', status: 'skipped', scheduledTime: '2026-06-11T08:00:00' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `m${i}`, itemType: 'medication', status: 'missed', scheduledTime: '2026-06-12T08:00:00' })),
];
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn().mockResolvedValue(SKIPPED_PROFILE),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-06-20',
  toLocalDateString: (d: Date) => d.toISOString().split('T')[0],
}));
jest.mock('../../utils/visitCoverage', () => ({
  loadDataCoverage: jest.fn().mockResolvedValue({
    daysLogged: 10, windowDays: 14, meds: 10, vitals: 0, meals: 0, notes: 0,
  }),
}));

jest.mock('../../utils/vitalsStorage', () => ({ getVitalsInRange: jest.fn().mockResolvedValue([]) }));
jest.mock('../../utils/insightsDataGaps', () => ({ computeDataGaps: jest.fn(() => []) }));
jest.mock('../../utils/appointmentStorage', () => ({ getUpcomingAppointments: jest.fn().mockResolvedValue([]) }));
jest.mock('../../lib/events', () => ({ useDataListener: jest.fn(), emitDataUpdate: jest.fn() }));
jest.mock('../../lib/eventNames', () => ({ EVENT: new Proxy({}, { get: (_: any, k: any) => String(k) }) }));
jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../utils/devLog', () => ({ logError: jest.fn(), devLog: jest.fn() }));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import UnderstandScreen from '../../app/(tabs)/understand';
import { AdherenceRing } from '../../components/insights/AdherenceRing';
import { InsightsDataCard } from '../../components/insights/InsightsDataCard';

const ringMock = AdherenceRing as unknown as jest.Mock;
const cardMock = InsightsDataCard as unknown as jest.Mock;

const lastProps = (m: jest.Mock) => m.mock.calls[m.mock.calls.length - 1][0];

describe('Insights adherence parity — ring == card == canonical (skipped profile)', () => {
  beforeEach(() => {
    ringMock.mockClear();
    cardMock.mockClear();
  });

  it('both surfaces show the canonical 60% (skipped counts AGAINST, not credited 80%)', async () => {
    render(<UnderstandScreen />);

    // Wait until the ring has rendered with real adherence loaded.
    await waitFor(() => {
      expect(ringMock).toHaveBeenCalled();
      expect(lastProps(ringMock).pct).toBeGreaterThan(0);
    });

    const ringPct = lastProps(ringMock).pct;
    const cardRate = lastProps(cardMock).adherence?.rate;

    // Canonical: 6 completed / 10 total = 60. Skipped-credited would be 80.
    expect(ringPct).toBe(60);
    expect(cardRate).toBe(60);
    // The whole point: one number, both surfaces.
    expect(ringPct).toBe(cardRate);
  });
});
