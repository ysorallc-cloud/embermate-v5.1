// ============================================================================
// Phase 9.2 — log-vitals migration to LogScreen.
//
// Pre-9.2 the screen rendered all 6 vital fields at once with no priority
// hierarchy, prefilled inputs from prior readings (state values, not
// placeholders), and showed "6 of 2 vitals checks logged today" — the
// numerator counted non-null fields, the denominator counted scheduled
// checks. Phase 9.2.0 documented the source mismatch in
// utils/rhythmStorage.ts; the migration sidesteps it by reading counts
// directly from listDailyInstances (the canonical wizard-driven source).
//
// Contracts pinned here (Phase 9.2.2):
//
//   1.  Wraps in LogScreen.
//   2.  Default render shows exactly 2 vital groups (BP + HR).
//   3.  Expander row text "More fields" with collapsed-fields subtitle.
//   4.  Expander tap reveals the 4 collapsed fields.
//   5.  Time-taken row renders 3 pills, "Just now" pre-selected.
//   6.  No standalone progress card / chip.
//   7.  Counter math correct — derived from listDailyInstances.
//   8.  Primary CTA label "Save reading."
//   9.  Empty save disabled; filling BP enables.
//   10. No orange-family hex literals in the screen source.
//   11. "Use last reading" affordance behaviour (render + tap-fills + absent
//       when no history). Repositioned below BP/HR per Q1(b) decision.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

// ----------------------------------------------------------------------------
// Mocks — mirror the LogScreen primitive test's strategy: stub react-native
// primitives so the tree is introspectable, stub storage/services so the
// screen mounts synchronously without touching real AsyncStorage.
// ----------------------------------------------------------------------------

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
  caregiverAccent: '#aa8adc',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  surfaceElevated: '#2a2c25',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    Pressable: PT('Pressable'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: jest.fn() },
    KeyboardAvoidingView: PT('KeyboardAvoidingView'),
    Platform: { OS: 'ios' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/log-vitals',
}));

jest.mock('../../lib/navigate', () => ({
  navigateBack: jest.fn(),
  navigate: jest.fn(),
  navigateReplace: jest.fn(),
}));

const mockListDailyInstances: jest.Mock = jest.fn(async () => [] as any[]);
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...args: any[]) => (mockListDailyInstances as any).apply(null, args),
  logInstanceCompletion: jest.fn(async () => null),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-05-08',
}));

const mockGetLatestVitals: jest.Mock = jest.fn(async () => ({} as any));
jest.mock('../../utils/vitalsStorage', () => ({
  saveVital: jest.fn(async () => {}),
  getLatestVitals: (...args: any[]) => (mockGetLatestVitals as any).apply(null, args),
}));

jest.mock('../../utils/centralStorage', () => ({
  saveVitalsLog: jest.fn(async () => {}),
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/carePlanRouting', () => ({
  parseCarePlanContext: () => null,
  getCarePlanBannerText: () => '',
}));

jest.mock('../../utils/carePlanStorage', () => ({
  trackCarePlanProgress: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: {
    VITALS: 'vitals',
    DAILY_INSTANCES: 'dailyInstances',
  },
}));

// SubScreenHeader is removed in 9.2; mock so any stale import path is silent.
jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: () => null,
}));

import LogVitalsScreen from '../../app/log-vitals';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

async function renderScreen(): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(LogVitalsScreen as any));
  });
  // Allow any pending effects (instance count load, prevVitals load) to flush.
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
  mockGetLatestVitals.mockReset().mockResolvedValue({});
});

// ----------------------------------------------------------------------------
// Source-level contracts
// ----------------------------------------------------------------------------

describe('Phase 9.2 — log-vitals source-level contracts', () => {
  const SRC = readFileSync(
    join(__dirname, '../../app/log-vitals.tsx'),
    'utf8',
  );

  it('contract 1: imports LogScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/,
    );
  });

  it('contract 1: uses LogScreen as the screen wrapper', () => {
    // The migrated screen renders <LogScreen ...>; assertion is structural.
    expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/);
  });

  it('counter source: imports listDailyInstances (canonical wizard pipeline)', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/,
    );
  });

  it('counter source: does NOT import or call getTodayProgress (the broken source)', () => {
    // Tighten to import + invocation patterns so the source's historical
    // comments referencing the legacy helper don't cause a false match.
    expect(SRC).not.toMatch(/import\s+\{[^}]*getTodayProgress/);
    expect(SRC).not.toMatch(/getTodayProgress\s*\(/);
  });

  it('contract 8: primary CTA label is "Save reading"', () => {
    expect(SRC).toMatch(/Save reading/);
  });

  it('contract 10: no orange-family hex literals', () => {
    const ORANGE_RE = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500/i;
    expect(SRC).not.toMatch(ORANGE_RE);
  });

  it('contract 6: no contextBanner style / vitals-checks-logged-today literal in code', () => {
    // styles.contextBanner was the standalone progress chip; gone. The
    // banner string was the broken counter copy; gone. Restricted to
    // code-level patterns so historical comments don't false-match.
    expect(SRC).not.toMatch(/styles\.contextBanner\b/);
    expect(SRC).not.toMatch(/contextBanner:\s*\{/);
    expect(SRC).not.toMatch(/['"`]vitals checks logged today['"`]/);
  });
});

// ----------------------------------------------------------------------------
// Behaviour contracts
// ----------------------------------------------------------------------------

describe('Phase 9.2 — log-vitals default render', () => {
  it('contract 2: shows BP and HR input groups by default', async () => {
    const tree = await renderScreen();
    const systolic = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-systolic',
    );
    const diastolic = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-diastolic',
    );
    const heartRate = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-heartRate',
    );
    expect(systolic).toHaveLength(1);
    expect(diastolic).toHaveLength(1);
    expect(heartRate).toHaveLength(1);
  });

  it('contract 2: collapsed fields (SpO2 / Temp / Glucose / Weight) are not rendered', async () => {
    const tree = await renderScreen();
    for (const id of ['oxygen', 'temperature', 'glucose', 'weight']) {
      const inputs = findAll(
        tree.root,
        (n) => n.props?.testID === `log-vitals-input-${id}`,
      );
      expect(inputs).toHaveLength(0);
    }
  });
});

describe('Phase 9.2 — log-vitals expander', () => {
  it('contract 3: renders expander row labelled "More fields" with collapsed-fields subtitle', async () => {
    const tree = await renderScreen();
    const expander = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-expander',
    )[0];
    expect(expander).toBeDefined();
    const expanderLabel = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-expander-label',
    )[0];
    expect(expanderLabel.props.children).toMatch(/More fields/);
    const expanderSubtitle = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-expander-subtitle',
    )[0];
    expect(expanderSubtitle.props.children).toMatch(/SpO.{0,2}.*Temp.*Glucose.*Weight/);
  });

  it('contract 4: tapping the expander reveals the 4 collapsed fields', async () => {
    const tree = await renderScreen();
    const expander = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-expander',
    )[0];
    await act(async () => {
      expander.props.onPress();
    });
    for (const id of ['oxygen', 'temperature', 'glucose', 'weight']) {
      const inputs = findAll(
        tree.root,
        (n) => n.props?.testID === `log-vitals-input-${id}`,
      );
      expect(inputs).toHaveLength(1);
    }
  });
});

describe('Phase 9.2 — log-vitals time-taken row', () => {
  it('contract 5: renders 3 pills with "Just now" pre-selected', async () => {
    const tree = await renderScreen();
    const now = findAll(tree.root, (n) => n.props?.testID === 'log-vitals-time-now')[0];
    const m15 = findAll(tree.root, (n) => n.props?.testID === 'log-vitals-time-15m')[0];
    const earlier = findAll(tree.root, (n) => n.props?.testID === 'log-vitals-time-earlier')[0];
    expect(now).toBeDefined();
    expect(m15).toBeDefined();
    expect(earlier).toBeDefined();
    // The selected pill carries an explicit prop so the test isn't coupled
    // to a specific style key.
    expect(now.props.accessibilityState?.selected).toBe(true);
    expect(m15.props.accessibilityState?.selected).toBe(false);
    expect(earlier.props.accessibilityState?.selected).toBe(false);
  });
});

describe('Phase 9.2 — log-vitals counter (regression test for "6 of 2")', () => {
  it('contract 7: subtitle reads "1 of 2 today" when 2 vitals instances exist and 1 is completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'v1', itemType: 'vitals', status: 'completed' },
      { id: 'v2', itemType: 'vitals', status: 'pending' },
      { id: 'm1', itemType: 'medication', status: 'completed' }, // unrelated
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-subtitle',
    )[0];
    expect(subtitle).toBeDefined();
    expect(subtitle.props.children).toBe('1 of 2 today');
  });

  it('contract 7: subtitle is omitted when no vitals instances exist for the day', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    const tree = await renderScreen();
    const subtitle = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-subtitle',
    );
    expect(subtitle).toHaveLength(0);
  });
});

describe('Phase 9.2 — log-vitals primary CTA', () => {
  it('contract 9: save button is disabled when no field has a value', async () => {
    const tree = await renderScreen();
    const cta = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta',
    )[0];
    expect(cta).toBeDefined();
    expect(cta.props.disabled).toBe(true);
  });

  it('contract 9: filling BP enables the save button', async () => {
    const tree = await renderScreen();
    const systolic = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-systolic',
    )[0];
    await act(async () => {
      systolic.props.onChangeText('120');
    });
    const cta = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta',
    )[0];
    expect(cta.props.disabled).toBe(false);
  });

  it('contract 8: primary CTA label resolves to "Save reading"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-screen-primary-cta-text',
    )[0];
    expect(ctaText.props.children).toMatch(/Save reading/i);
  });
});

describe('Phase 9.2 — log-vitals "Use last reading" affordance', () => {
  it('contract 11: renders affordance when prior reading history exists', async () => {
    mockGetLatestVitals.mockResolvedValue({
      systolic: { value: 130, date: '2026-05-07' },
      diastolic: { value: 85, date: '2026-05-07' },
      heartRate: { value: 78, date: '2026-05-07' },
    });
    const tree = await renderScreen();
    const link = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-use-last',
    );
    expect(link).toHaveLength(1);
  });

  it('contract 11: tapping the affordance fills BP and HR with the prior values', async () => {
    mockGetLatestVitals.mockResolvedValue({
      systolic: { value: 130, date: '2026-05-07' },
      diastolic: { value: 85, date: '2026-05-07' },
      heartRate: { value: 78, date: '2026-05-07' },
    });
    const tree = await renderScreen();
    const link = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-use-last',
    )[0];
    await act(async () => {
      link.props.onPress();
    });
    const systolic = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-systolic',
    )[0];
    const diastolic = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-diastolic',
    )[0];
    const heartRate = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-input-heartRate',
    )[0];
    expect(systolic.props.value).toBe('130');
    expect(diastolic.props.value).toBe('85');
    expect(heartRate.props.value).toBe('78');
  });

  it('contract 11: affordance does not render when there is no history', async () => {
    mockGetLatestVitals.mockResolvedValue({});
    const tree = await renderScreen();
    const link = findAll(
      tree.root,
      (n) => n.props?.testID === 'log-vitals-use-last',
    );
    expect(link).toHaveLength(0);
  });
});
