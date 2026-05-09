// ============================================================================
// Phase 9.5 — log-sleep migration to LogScreen.
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
  accentHint: 'rgba(95, 184, 138, 0.14)',
  caregiverAccent: '#aa8adc',
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  surfaceElevated: '#2a2c25',
  surfaceHighlight: '#2a2c25',
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
  usePathname: () => '/log-sleep',
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
  getTodayDateString: () => '2026-05-09',
}));

jest.mock('../../utils/dailyTrackingStorage', () => ({
  saveDailyTracking: jest.fn(async () => {}),
  getDailyTracking: jest.fn(async () => null),
}));

jest.mock('../../utils/centralStorage', () => ({
  saveSleepLog: jest.fn(async () => {}),
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { DAILY_INSTANCES: 'dailyInstances' },
}));

import LogSleep from '../../app/log-sleep';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

async function renderScreen(): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(LogSleep as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
});

describe('Phase 9.5 — log-sleep source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-sleep.tsx'), 'utf8');

  const codeOnly = (() => {
    const lines = SRC.split('\n');
    let inBlock = false;
    const out: string[] = [];
    for (const line of lines) {
      let l = line;
      if (inBlock) { const e = l.indexOf('*/'); if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue; }
      const bs = l.indexOf('/*');
      if (bs >= 0) { const be = l.indexOf('*/', bs + 2); if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2); else { inBlock = true; l = l.slice(0, bs); } }
      const lc = l.indexOf('//'); if (lc >= 0) l = l.slice(0, lc);
      out.push(l);
    }
    return out.join('\n');
  })();

  it('imports LogScreen', () => {
    expect(SRC).toMatch(/import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/);
  });

  it('uses LogScreen as wrapper', () => {
    expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/);
  });

  it('imports listDailyInstances', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/);
  });

  it('CTA label "Save sleep"', () => {
    expect(SRC).toMatch(/Save sleep/);
  });

  it('drops legacy "Log Sleep" CTA copy', () => {
    expect(codeOnly).not.toMatch(/['"`]Log Sleep['"`]/);
  });

  it('drops SubScreenHeader + LinearGradient imports', () => {
    expect(codeOnly).not.toMatch(/SubScreenHeader/);
    expect(codeOnly).not.toMatch(/LinearGradient/);
  });

  it('no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});

describe('Phase 9.5 — log-sleep behavior', () => {
  it('renders disclaimer at top', async () => {
    const tree = await renderScreen();
    const d = findAll(tree.root, (n) => n.props?.testID === 'log-sleep-disclaimer')[0];
    expect(d).toBeDefined();
  });

  it('CTA label "Save sleep"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save sleep/i);
  });

  it('exactly one primary CTA', async () => {
    const tree = await renderScreen();
    const ctas = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta');
    expect(ctas).toHaveLength(1);
  });

  it('subtitle reads "1 of 2 today" with 2 sleep instances and 1 completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 's1', itemType: 'sleep', status: 'completed' },
      { id: 's2', itemType: 'sleep', status: 'pending' },
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
    expect(subtitle.props.children).toBe('1 of 2 today');
  });

  it('subtitle omitted when no sleep instances', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')).toHaveLength(0);
  });

  it('CTA disabled until either hours or quality is supplied', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(true);
    const hoursInput = findAll(tree.root, (n) => n.props?.testID === 'log-sleep-hours')[0];
    await act(async () => { hoursInput.props.onChangeText('7.5'); });
    const ctaAfter = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(ctaAfter.props.disabled).toBe(false);
  });

  it('quality buttons toggle selection state', async () => {
    const tree = await renderScreen();
    const q4 = findAll(tree.root, (n) => n.props?.testID === 'log-sleep-quality-4')[0];
    expect(q4.props.accessibilityState?.selected).toBe(false);
    await act(async () => { q4.props.onPress(); });
    const q4after = findAll(tree.root, (n) => n.props?.testID === 'log-sleep-quality-4')[0];
    expect(q4after.props.accessibilityState?.selected).toBe(true);
  });
});
