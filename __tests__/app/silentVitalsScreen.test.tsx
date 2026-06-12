// ============================================================================
// Phase 9.4 — silent-vitals migration to LogScreen.
//
// Pre-9.4 the screen rendered SubScreenHeader + TodaySilentVitals recap
// + the SilentVitalsCapture card (with its own inline Cancel/Save footer
// and wordy "How did Mom sleep?" prose). The migration wraps in
// LogScreen, drops the recap, restructures SilentVitalsCapture in place,
// and fixes the silent instance-completion bug surfaced in 9.4.0
// pre-flight.
//
// Contracts pinned at the screen layer (component-internal contracts —
// rows / emoji / anchors / labels — live in
// __tests__/components/silentVitalsCapture.test.tsx):
//
//   1.  Wraps in LogScreen.
//   9.  Save button "Save check-in", disabled-until-fill semantics.
//   10. No palette violations.
//   11. (Disclaimer position) Medical disclaimer renders before the
//       capture component in the children well.
//   12. Counter math derived from listDailyInstances filtered to
//       itemType === 'wellness'.
//   13. Instance-completion fires on save when instanceId is present;
//       does NOT fire in the standalone flow without instanceId.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  surfaceElevated: '#2a2c25',
  menuSurface: '#1a1f2b',
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

const mockUseLocalSearchParams: jest.Mock = jest.fn(() => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => (mockUseLocalSearchParams as any).apply(null, []),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/silent-vitals',
}));

jest.mock('../../lib/navigate', () => ({
  navigateBack: jest.fn(),
  navigate: jest.fn(),
  navigateReplace: jest.fn(),
}));

const mockListDailyInstances: jest.Mock = jest.fn(async () => [] as any[]);
const mockLogInstanceCompletion: jest.Mock = jest.fn(async () => null);
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...args: any[]) => (mockListDailyInstances as any).apply(null, args),
  logInstanceCompletion: (...args: any[]) => (mockLogInstanceCompletion as any).apply(null, args),
  DEFAULT_PATIENT_ID: 'default',
}));

const mockUpsertDailyReflection: jest.Mock = jest.fn(async () => undefined);
const mockGetDailyReflection: jest.Mock = jest.fn(async () => null);
jest.mock('../../storage/dailyReflectionRepo', () => ({
  upsertDailyReflection: (...args: any[]) => (mockUpsertDailyReflection as any).apply(null, args),
  getDailyReflection: (...args: any[]) => (mockGetDailyReflection as any).apply(null, args),
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({ activePatient: { id: 'mom', name: 'Mom' } }),
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-05-08',
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { WELLNESS: 'wellness', DAILY_INSTANCES: 'dailyInstances' },
}));

import SilentVitalsScreen from '../../app/silent-vitals';

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
    root = TestRenderer.create(React.createElement(SilentVitalsScreen as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
  mockLogInstanceCompletion.mockReset().mockResolvedValue(null);
  mockUpsertDailyReflection.mockReset().mockResolvedValue(undefined);
  mockGetDailyReflection.mockReset().mockResolvedValue(null);
  mockUseLocalSearchParams.mockReset().mockReturnValue({});
});

// ----------------------------------------------------------------------------
// Source-level contracts
// ----------------------------------------------------------------------------

describe('Phase 9.4 — silent-vitals source-level contracts', () => {
  const SRC = readFileSync(join(__dirname, '../../app/silent-vitals.tsx'), 'utf8');

  const codeOnly = (() => {
    const lines = SRC.split('\n');
    let inBlock = false;
    const out: string[] = [];
    for (const line of lines) {
      let l = line;
      if (inBlock) {
        const end = l.indexOf('*/');
        if (end >= 0) { inBlock = false; l = l.slice(end + 2); }
        else continue;
      }
      const blockStart = l.indexOf('/*');
      if (blockStart >= 0) {
        const blockEnd = l.indexOf('*/', blockStart + 2);
        if (blockEnd >= 0) l = l.slice(0, blockStart) + l.slice(blockEnd + 2);
        else { inBlock = true; l = l.slice(0, blockStart); }
      }
      const lineComment = l.indexOf('//');
      if (lineComment >= 0) l = l.slice(0, lineComment);
      out.push(l);
    }
    return out.join('\n');
  })();

  it('contract 1: imports LogScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/,
    );
  });

  it('contract 1: uses LogScreen as the screen wrapper', () => {
    expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/);
  });

  it('contract 9: primary CTA label "Save check-in"', () => {
    expect(SRC).toMatch(/Save check-in/);
  });

  it('contract 10: no orange-family hex literals in code', () => {
    const ORANGE_RE = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i;
    expect(codeOnly).not.toMatch(ORANGE_RE);
  });

  it('contract 12: imports listDailyInstances for the wellness counter', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/,
    );
  });

  it('contract 13: imports logInstanceCompletion (instance-completion fix)', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*logInstanceCompletion[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/,
    );
  });

  it('drops the legacy SubScreenHeader import', () => {
    expect(codeOnly).not.toMatch(/import\s+\{\s*SubScreenHeader/);
  });

  it('drops the TodaySilentVitals recap import', () => {
    expect(codeOnly).not.toMatch(/import\s+\{\s*TodaySilentVitals/);
  });

  it('title is "Wellness check" (replaces "Silent vital signs")', () => {
    expect(SRC).toMatch(/title=['"`]Wellness check['"`]/);
  });
});

// ----------------------------------------------------------------------------
// Behaviour contracts
// ----------------------------------------------------------------------------

describe('Phase 9.4 — silent-vitals default render', () => {
  it('contract 11: medical disclaimer renders before the capture component', async () => {
    const tree = await renderScreen();
    const disclaimer = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-disclaimer')[0];
    expect(disclaimer).toBeDefined();
    const capture = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-capture')[0];
    expect(capture).toBeDefined();
    const all = findAll(tree.root, () => true);
    expect(all.indexOf(disclaimer)).toBeLessThan(all.indexOf(capture));
  });
});

describe('Phase 9.4 — silent-vitals counter', () => {
  it('contract 12: subtitle reads "1 of 2 today" with 2 wellness instances and 1 completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'w1', itemType: 'wellness', status: 'completed' },
      { id: 'w2', itemType: 'wellness', status: 'pending' },
      { id: 'v1', itemType: 'vitals', status: 'completed' },
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
    expect(subtitle).toBeDefined();
    expect(subtitle.props.children).toBe('1 of 2 today');
  });

  it('contract 12: subtitle is omitted when no wellness instances exist', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle');
    expect(subtitle).toHaveLength(0);
  });
});

describe('Phase 9.4 — silent-vitals primary CTA', () => {
  it('contract 9: CTA label resolves to "Save check-in"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save check-in/i);
  });

  it('contract 9: save button is disabled by default (no slider filled)', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta).toBeDefined();
    expect(cta.props.disabled).toBe(true);
  });

  it('contract 9: tapping a sleep emoji enables save', async () => {
    const tree = await renderScreen();
    const sleep4 = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-sleep-4')[0];
    expect(sleep4).toBeDefined();
    await act(async () => { sleep4.props.onPress(); });
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(false);
  });
});

describe('Phase 9.4 — silent-vitals instance completion (contract 13)', () => {
  it('fires logInstanceCompletion with the routed instanceId on save', async () => {
    mockUseLocalSearchParams.mockReturnValue({ instanceId: 'abc-123' });
    const tree = await renderScreen();
    const sleep4 = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-sleep-4')[0];
    await act(async () => { sleep4.props.onPress(); });
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    await act(async () => { cta.props.onPress(); });
    await act(async () => {});
    expect(mockLogInstanceCompletion).toHaveBeenCalled();
    const callArgs = mockLogInstanceCompletion.mock.calls[0];
    // signature: (patientId, today, instanceId, outcome, data, options)
    expect(callArgs[2]).toBe('abc-123');
    expect(callArgs[3]).toBe('completed');
  });

  it('does NOT call logInstanceCompletion when instanceId is absent (standalone flow)', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const tree = await renderScreen();
    const sleep4 = findAll(tree.root, (n) => n.props?.testID === 'silent-vitals-sleep-4')[0];
    await act(async () => { sleep4.props.onPress(); });
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    await act(async () => { cta.props.onPress(); });
    await act(async () => {});
    expect(mockLogInstanceCompletion).not.toHaveBeenCalled();
    // Verify the standalone-flow write still fires.
    expect(mockUpsertDailyReflection).toHaveBeenCalled();
  });
});
