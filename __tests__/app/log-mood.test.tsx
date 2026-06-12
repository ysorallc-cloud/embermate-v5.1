// ============================================================================
// Phase 9.5 — log-mood migration to LogScreen + instance-completion fix.
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
  caregiverAccent: '#aa8adc',
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentWash: 'rgba(170, 138, 220, 0.18)',
  violetBright: '#aa8adc',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  surfaceElevated: '#2a2c25',
  greenBright: '#5fb88a',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
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
  usePathname: () => '/log-mood',
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

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-05-09',
}));

jest.mock('../../utils/centralStorage', () => ({
  saveMoodLog: jest.fn(async () => {}),
}));

jest.mock('../../utils/logEvents', () => ({
  logMood: jest.fn(async () => {}),
}));

jest.mock('../../utils/carePlanRouting', () => ({
  parseCarePlanContext: () => null,
  getCarePlanBannerText: () => '',
}));

jest.mock('../../utils/carePlanStorage', () => ({
  trackCarePlanProgress: jest.fn(async () => {}),
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { MOOD: 'mood', DAILY_INSTANCES: 'dailyInstances' },
}));

import LogMoodScreen from '../../app/log-mood';

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
    root = TestRenderer.create(React.createElement(LogMoodScreen as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
  mockLogInstanceCompletion.mockReset().mockResolvedValue(null);
  mockUseLocalSearchParams.mockReset().mockReturnValue({});
});

describe('Phase 9.5 — log-mood source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-mood.tsx'), 'utf8');
  const codeOnly = (() => {
    const lines = SRC.split('\n'); let inBlock = false; const out: string[] = [];
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
  it('uses LogScreen wrapper', () => { expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/); });
  it('imports listDailyInstances + logInstanceCompletion (instance-completion fix)', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/);
    expect(SRC).toMatch(/import\s*\{[^}]*logInstanceCompletion[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/);
  });
  it('CTA label "Save mood"', () => { expect(SRC).toMatch(/Save mood/); });
  it('drops SubScreenHeader + LinearGradient', () => {
    expect(codeOnly).not.toMatch(/SubScreenHeader/);
    expect(codeOnly).not.toMatch(/LinearGradient/);
  });
  it('no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});

describe('Phase 9.5 — log-mood behavior', () => {
  it('renders disclaimer', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-mood-disclaimer')).toHaveLength(1);
  });

  it('CTA "Save mood"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save mood/i);
  });

  it('CTA disabled until a mood is selected', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(true);
    const good = findAll(tree.root, (n) => n.props?.testID === 'log-mood-pill-good')[0];
    await act(async () => { good.props.onPress(); });
    const ctaAfter = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(ctaAfter.props.disabled).toBe(false);
  });

  it('5 mood pills render', async () => {
    const tree = await renderScreen();
    const pills = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-mood-pill-/.test(n.props.testID));
    expect(pills.length).toBe(5);
  });

  it('subtitle "1 of 2 today" with 2 mood instances and 1 completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'm1', itemType: 'mood', status: 'completed' },
      { id: 'm2', itemType: 'mood', status: 'pending' },
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
    expect(subtitle.props.children).toBe('1 of 2 today');
  });
});

describe('Phase 9.5 — log-mood instance completion (defensive 9.4-pattern fix)', () => {
  it('fires logInstanceCompletion with instanceId on save when present', async () => {
    mockUseLocalSearchParams.mockReturnValue({ instanceId: 'mood-abc' });
    const tree = await renderScreen();
    const good = findAll(tree.root, (n) => n.props?.testID === 'log-mood-pill-good')[0];
    await act(async () => { good.props.onPress(); });
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    await act(async () => { cta.props.onPress(); });
    await act(async () => {});
    expect(mockLogInstanceCompletion).toHaveBeenCalled();
    const callArgs = mockLogInstanceCompletion.mock.calls[0];
    expect(callArgs[2]).toBe('mood-abc');
    expect(callArgs[3]).toBe('completed');
  });

  it('does NOT call logInstanceCompletion when instanceId absent', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const tree = await renderScreen();
    const good = findAll(tree.root, (n) => n.props?.testID === 'log-mood-pill-good')[0];
    await act(async () => { good.props.onPress(); });
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    await act(async () => { cta.props.onPress(); });
    await act(async () => {});
    expect(mockLogInstanceCompletion).not.toHaveBeenCalled();
  });
});
