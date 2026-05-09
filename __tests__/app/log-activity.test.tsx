// ============================================================================
// Phase 9.5 — log-activity migration to LogScreen.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  glassFaint: 'rgba(255, 240, 215, 0.03)',
  glassActive: 'rgba(255, 240, 215, 0.04)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  caregiverAccent: '#aa8adc',
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  textPlaceholder: '#6b7280',
  surfaceElevated: '#2a2c25',
  sageBorder: 'rgba(95, 184, 138, 0.25)',
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
  usePathname: () => '/log-activity',
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

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { DAILY_INSTANCES: 'dailyInstances' },
}));

import LogActivityScreen from '../../app/log-activity';

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
    root = TestRenderer.create(React.createElement(LogActivityScreen as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
});

describe('Phase 9.5 — log-activity source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-activity.tsx'), 'utf8');
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
  it('imports listDailyInstances', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/);
  });
  it('CTA label "Save activity"', () => { expect(SRC).toMatch(/Save activity/); });
  it('drops AuroraBackground', () => { expect(codeOnly).not.toMatch(/AuroraBackground/); });
  it('no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});

describe('Phase 9.5 — log-activity behavior', () => {
  it('renders disclaimer', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-activity-disclaimer')).toHaveLength(1);
  });

  it('CTA "Save activity"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save activity/i);
  });

  it('exactly one primary CTA', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')).toHaveLength(1);
  });

  it('CTA disabled until at least one activity selected', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(true);
    const walk = findAll(tree.root, (n) => n.props?.testID === 'log-activity-pill-walk')[0];
    await act(async () => { walk.props.onPress(); });
    const ctaAfter = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(ctaAfter.props.disabled).toBe(false);
  });

  it('multi-select on activity types', async () => {
    const tree = await renderScreen();
    const walk = findAll(tree.root, (n) => n.props?.testID === 'log-activity-pill-walk')[0];
    const stretch = findAll(tree.root, (n) => n.props?.testID === 'log-activity-pill-stretch')[0];
    await act(async () => { walk.props.onPress(); });
    await act(async () => { stretch.props.onPress(); });
    const walkAfter = findAll(tree.root, (n) => n.props?.testID === 'log-activity-pill-walk')[0];
    const stretchAfter = findAll(tree.root, (n) => n.props?.testID === 'log-activity-pill-stretch')[0];
    expect(walkAfter.props.accessibilityState?.selected).toBe(true);
    expect(stretchAfter.props.accessibilityState?.selected).toBe(true);
  });

  it('subtitle "1 of 2 today" with 2 activity instances and 1 completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'a1', itemType: 'activity', status: 'completed' },
      { id: 'a2', itemType: 'activity', status: 'pending' },
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
    expect(subtitle.props.children).toBe('1 of 2 today');
  });
});
