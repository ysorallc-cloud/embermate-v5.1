// ============================================================================
// Phase 35 Slice 3-C — BEHAVIOR pins for the relocated Share action.
//
// The sister source-pin file (journalShareHeaderAction35S3C.test.ts) green-
// lit a button whose tap path was silent on every non-success branch — a
// "structure-shipped, behavior-broken" failure mode. The audit lesson:
// source-string pins prove a literal appears in the file; they do not
// prove the rendered TouchableOpacity's onPress invokes the handler at
// runtime, nor that failure branches surface user-facing feedback.
//
// This file fills the gap. The contracts here mount the Journal screen,
// locate the rendered header-action by testID, and invoke its onPress
// prop directly (via @testing-library/react-native's fireEvent.press,
// which wraps TouchableOpacity.props.onPress() under the hood). Each
// contract asserts a runtime side-effect, not a source string.
//
// COVERAGE:
//   1. WIRING — press fires handleShareDaily → buildHandoffDay is called
//      with selectedDate. Fails if onPress is wired to undefined or to a
//      different function.
//   2. EMPTY-DAY ALERT — buildHandoffDay returns null → Alert
//      "Nothing to share for this day yet." The pre-PART-2 silent return
//      gets the trust fix.
//   3. SHARE-FAILED ALERT — generateAndShareHandoff returns false (its
//      own try/catch swallowed an error OR Sharing.isAvailableAsync
//      returned false) → Alert "Couldn't share — please try again."
//      The pre-PART-2 discarded boolean is now checked.
//   4. THROWN-ERROR ALERT — buildHandoffDay throws → friendly Alert +
//      logError still called. The pre-PART-2 catch swallowed silently.
//   5. SUCCESS PATH — buildHandoffDay returns a payload →
//      generateAndShareHandoff is called with the payload and no Alert
//      fires.
//
// The failure-Alert template established here should be the model for
// any future share/export trust path (per the user's standing rule):
// every non-success branch surfaces caregiver-facing feedback. A silent-
// failing share button is the same trust class as the notes-into-the-
// void bug — health app + invisible failure = caregiver loses trust.
// ============================================================================

// ── Mocks (mirrors journalScreenSmoke.test.tsx structure; trimmed to
//    what JournalTab's render path actually touches) ─────────────────────

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
    TextInput: make('TextInput'),
    Modal: ({ visible, children }: any) =>
      visible ? React.createElement('Modal', null, children) : null,
    Animated: {
      Value: class { constructor(_v: number) {} setValue(_v: number) {} },
      View: make('AnimatedView'),
      Text: make('AnimatedText'),
      timing: () => ({ start: () => {} }),
      sequence: () => ({ start: () => {} }),
    },
    Easing: { out: () => (x: number) => x, quad: (x: number) => x },
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

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 80,
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

// Heavy child components — stubbed
jest.mock('../../components/aurora/AuroraBackground', () => ({
  AuroraBackground: () => null,
}));
jest.mock('../../components/ScreenHeader', () => ({
  __esModule: true,
  ScreenHeader: () => null,
  default: () => null,
}));
jest.mock('../../components/journal/JournalNotesCard', () => ({
  JournalNotesCard: () => null,
}));
jest.mock('../../components/journal/HandoffCard', () => ({
  HandoffCard: () => null,
}));
jest.mock('../../components/journal/DateTabStrip', () => ({
  DateTabStrip: () => null,
}));
jest.mock('../../components/journal/MonthCalendar', () => ({
  MonthCalendar: () => null,
}));
jest.mock('../../components/journal/JournalSummary', () => ({
  JournalSummary: () => null,
}));
jest.mock('../../components/journal/JournalFlagged', () => ({
  JournalFlagged: () => null,
  buildHandoffNotes: jest.fn(() => []),
}));
jest.mock('../../components/journal/JournalPatterns', () => ({
  JournalPatterns: () => null,
}));
jest.mock('../../components/journal/ReflectionPrompt', () => ({
  ReflectionPrompt: () => null,
}));
jest.mock('../../components/journal/TodayOutcomes', () => ({
  TodayOutcomes: () => null,
}));
jest.mock('../../components/shared/ReportPreviewModal', () => ({
  ReportPreviewModal: () => null,
}));
jest.mock('../../components/SectionEyebrow', () => ({
  SectionEyebrow: () => null,
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// Hooks
jest.mock('../../hooks/useCareTasks', () => ({
  useCareTasks: () => ({
    state: { tasks: [], loading: false, error: null },
    refresh: jest.fn(),
  }),
}));
jest.mock('../../hooks/useCarePlanConfig', () => ({
  useEnabledBuckets: () => ({ enabledBuckets: [], loading: false }),
}));
jest.mock('../../hooks/useCalendarStatuses', () => ({
  useCalendarStatuses: () => ({ calendarStatuses: {}, loading: false }),
}));

// Storage / utils
jest.mock('../../utils/insightEngine', () => ({
  getAllInsights: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/auditLog', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
  AuditEventType: new Proxy({}, { get: (_, k) => String(k) }),
  AuditSeverity: new Proxy({}, { get: (_, k) => String(k) }),
}));
jest.mock('../../utils/biometricAuth', () => ({
  isBiometricEnabled: jest.fn().mockResolvedValue(false),
  shouldLockSession: jest.fn().mockResolvedValue(false),
  requireAuthentication: jest.fn().mockResolvedValue(true),
  updateLastActivity: jest.fn().mockResolvedValue(undefined),
  getAutoLockTimeout: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../utils/centralStorage', () => ({
  getNotesLogs: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/medicalInfo', () => ({
  getMedicalInfo: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn().mockResolvedValue(null),
  safeSetItem: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/storageKeys', () => ({
  StorageKeys: new Proxy({}, { get: (_, k) => `@embermate_${String(k).toLowerCase()}` }),
  scopedKey: (k: string) => k,
}));
jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/sampleDataManager', () => ({
  hasSampleData: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../utils/reportBuilders', () => ({
  buildDailySummaryReport: jest.fn(() => ({ title: 'Daily Summary', sections: [] })),
  buildClinicalReportData: jest.fn(() => ({ title: 'Clinical Report', sections: [] })),
}));
jest.mock('../../utils/pdfExport', () => ({
  generateAndSharePDF: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/careSummaryBuilder', () => ({
  buildCareBrief: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../utils/reflectionPrompts', () => ({
  getDailyPrompt: jest.fn(() => 'How did today feel?'),
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn().mockResolvedValue(null),
  saveReflection: jest.fn().mockResolvedValue(undefined),
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
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-06-03',
  toLocalDateString: (d: Date) => d.toISOString().split('T')[0],
}));
jest.mock('../../utils/dailyOutcomes', () => ({
  getDailyOutcomes: jest.fn().mockResolvedValue({
    logged: { count: 0 },
    missed: { count: 0, names: [] },
    pending: { count: 0, names: [] },
  }),
}));
jest.mock('../../utils/dayComplete', () => ({
  isDayComplete: jest.fn().mockResolvedValue(false),
  markDayComplete: jest.fn().mockResolvedValue(undefined),
}));

// The two mocks the behavior contracts actually re-configure per-test
jest.mock('../../services/handoffPdf', () => ({
  generateAndShareHandoff: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/handoffDayBuilder', () => ({
  buildHandoffDay: jest.fn().mockResolvedValue(null),
}));

// ── Test body ───────────────────────────────────────────────────────────

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JournalTab from '../../app/(tabs)/journal';
import { buildHandoffDay } from '../../utils/handoffDayBuilder';
import { generateAndShareHandoff } from '../../services/handoffPdf';
import { logError } from '../../utils/devLog';

const buildHandoffDayMock = buildHandoffDay as jest.MockedFunction<typeof buildHandoffDay>;
const generateAndShareHandoffMock = generateAndShareHandoff as jest.MockedFunction<typeof generateAndShareHandoff>;
const alertMock = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const logErrorMock = logError as jest.MockedFunction<typeof logError>;

const SAMPLE_PAYLOAD = {
  date: '2026-06-03',
  patientName: 'Mom',
  gestalt: 'Steady day.',
  medications: [],
  vitals: null,
  worthFlagging: [],
  notes: null,
  nextAppointment: null,
};

async function renderJournalAndGetShareAction() {
  const utils = render(<JournalTab />);
  await waitFor(() => {
    expect(utils.queryByText('Loading...')).toBeNull();
  });
  // The relocated Share action lives in the headerRow; only renders once
  // the screen is past the loading state.
  const action = await waitFor(() => utils.getByTestId('journal-share-header-action'));
  return { ...utils, action };
}

describe('Phase 35 Slice 3-C — BEHAVIOR pins (TouchableOpacity onPress fires the handler chain)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Defaults: null payload (empty-day path is the most common runtime
    // failure mode worth a default pin). Per-test overrides change this.
    buildHandoffDayMock.mockResolvedValue(null);
    generateAndShareHandoffMock.mockResolvedValue(true);
  });

  it('contract 1 (WIRING): pressing the header action invokes handleShareDaily → buildHandoffDay is called with selectedDate', async () => {
    // The audit's load-bearing test: if onPress is unwired or wired to
    // the wrong function, buildHandoffDay is never called. Pure source-
    // string pins (the old shape) cannot prove this. fireEvent.press
    // calls TouchableOpacity.props.onPress() exactly the way a tap
    // does at runtime.
    const { action } = await renderJournalAndGetShareAction();
    fireEvent.press(action);
    await waitFor(() => {
      expect(buildHandoffDayMock).toHaveBeenCalledTimes(1);
    });
    expect(buildHandoffDayMock).toHaveBeenCalledWith('2026-06-03');
  });

  it('contract 2 (EMPTY-DAY ALERT): when buildHandoffDay returns null, Alert "Nothing to share for this day yet." fires (PART 2 silent-return fix)', async () => {
    // Pre-PART-2: `if (!payload) return;` — silent. User taps Share on
    // a day with no care brief, gets nothing back, can't tell whether
    // the app heard the tap or whether the day genuinely has nothing
    // to share. PART 2 surfaces it.
    buildHandoffDayMock.mockResolvedValue(null);
    const { action } = await renderJournalAndGetShareAction();
    fireEvent.press(action);
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    const firstCall = alertMock.mock.calls[0];
    const haystack = `${firstCall[0]} ${firstCall[1] ?? ''}`;
    expect(haystack).toMatch(/Nothing to share for this day/i);
    // generateAndShareHandoff must NOT be called on the empty-day branch
    // — null payload short-circuits before PDF generation.
    expect(generateAndShareHandoffMock).not.toHaveBeenCalled();
  });

  it('contract 3 (SHARE-FAILED ALERT): when generateAndShareHandoff returns false, Alert "Couldn\'t share — please try again." fires (PART 2 discarded-boolean fix)', async () => {
    // Pre-PART-2: `await generateAndShareHandoff(...)` discarded the
    // boolean. generateAndShareHandoff's OWN try/catch swallowed inner
    // throws and returned false; outer handleShareDaily ignored the
    // return. Result: PDF/Sharing failure was completely silent.
    buildHandoffDayMock.mockResolvedValue(SAMPLE_PAYLOAD);
    generateAndShareHandoffMock.mockResolvedValue(false);
    const { action } = await renderJournalAndGetShareAction();
    fireEvent.press(action);
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    const firstCall = alertMock.mock.calls[0];
    const haystack = `${firstCall[0]} ${firstCall[1] ?? ''}`;
    expect(haystack).toMatch(/couldn'?t share|please try again/i);
  });

  it('contract 4 (THROWN-ERROR ALERT): when buildHandoffDay throws, friendly Alert fires and logError still records the error (PART 2 swallowed-catch fix)', async () => {
    // Pre-PART-2: catch block called `logError(...)` only. User saw
    // nothing. PART 2 still logs (for debugging) but ALSO surfaces an
    // Alert so the caregiver knows the action failed.
    buildHandoffDayMock.mockRejectedValue(new Error('synthetic — handoff builder threw'));
    const { action } = await renderJournalAndGetShareAction();
    fireEvent.press(action);
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    expect(logErrorMock).toHaveBeenCalled();
    // Friendly user-facing wording — no raw stack trace surfaced.
    const firstCall = alertMock.mock.calls[0];
    const haystack = `${firstCall[0]} ${firstCall[1] ?? ''}`;
    expect(haystack).not.toMatch(/synthetic — handoff builder threw/);
  });

  it('contract 5 (SUCCESS PATH): payload returned + share succeeds → generateAndShareHandoff called with payload; no Alert fires', async () => {
    buildHandoffDayMock.mockResolvedValue(SAMPLE_PAYLOAD);
    generateAndShareHandoffMock.mockResolvedValue(true);
    const { action } = await renderJournalAndGetShareAction();
    fireEvent.press(action);
    await waitFor(() => {
      expect(generateAndShareHandoffMock).toHaveBeenCalledTimes(1);
    });
    const arg = generateAndShareHandoffMock.mock.calls[0][0];
    expect(arg.payload).toEqual(SAMPLE_PAYLOAD);
    expect(arg.dateLabel).toBeTruthy();
    expect(arg.timeLabel).toBeTruthy();
    // No user-facing Alert on the happy path — the OS share sheet IS
    // the feedback.
    expect(alertMock).not.toHaveBeenCalled();
  });
});
