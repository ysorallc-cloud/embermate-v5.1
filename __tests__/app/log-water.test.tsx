// ============================================================================
// Phase 9.5 — log-water migration to LogScreen.
//
// Pre-9.5 the screen rendered AuroraBackground + custom header + counter
// (− / number / +) + progress bar + quick-add row + bottom "Done ✓"
// save button. No medical disclaimer, no instance-derived subtitle.
//
// Post-9.5 contracts pinned:
//   1.  Wraps in LogScreen.
//   2.  Single primary CTA, label "Save water".
//   3.  Disclaimer renders at the top of children.
//   4.  Counter subtitle from listDailyInstances filtered to
//       itemType === 'hydration'.
//   5.  No palette violations.
//   6.  Counter increment / decrement preserved.
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
  glassActive: 'rgba(255, 240, 215, 0.04)',
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
  surfaceElevated: '#2a2c25',
  cyan: '#7dd3fc',
  sageBorder: 'rgba(95, 184, 138, 0.25)',
  sageGlow: 'rgba(95, 184, 138, 0.40)',
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

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/log-water',
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

jest.mock('../../utils/centralStorage', () => ({
  getTodayWaterLog: jest.fn(async () => null),
  updateTodayWaterLog: jest.fn(async () => {}),
}));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(async () => {}),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { WATER: 'water', DAILY_INSTANCES: 'dailyInstances' },
}));

import LogWaterScreen from '../../app/log-water';

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
    root = TestRenderer.create(React.createElement(LogWaterScreen as any));
  });
  await act(async () => {});
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset().mockResolvedValue([]);
});

// ----------------------------------------------------------------------------
// Source-level
// ----------------------------------------------------------------------------

describe('Phase 9.5 — log-water source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-water.tsx'), 'utf8');

  it('imports LogScreen', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/,
    );
  });

  it('uses LogScreen as wrapper', () => {
    expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/);
  });

  it('imports listDailyInstances for the counter', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*listDailyInstances[^}]*\}\s*from\s*['"][^'"]+\/storage\/carePlanRepo['"]/,
    );
  });

  it('CTA label "Save water"', () => {
    expect(SRC).toMatch(/Save water/);
  });

  // Strip line + block comments so historical-context references don't
  // false-match against the regex audits.
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

  it('drops legacy AuroraBackground import + render', () => {
    expect(codeOnly).not.toMatch(/AuroraBackground/);
  });

  it('no orange-family hex literals', () => {
    expect(codeOnly).not.toMatch(/#FF8C42|#F97316|#EA580C|#FB7185|#FFA500|#FB923C/i);
  });
});

// ----------------------------------------------------------------------------
// Behavior
// ----------------------------------------------------------------------------

describe('Phase 9.5 — log-water behavior', () => {
  it('renders disclaimer at top of children', async () => {
    const tree = await renderScreen();
    const disclaimer = findAll(tree.root, (n) => n.props?.testID === 'log-water-disclaimer')[0];
    expect(disclaimer).toBeDefined();
  });

  it('CTA label resolves to "Save water"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save water/i);
  });

  it('exactly one primary CTA renders', async () => {
    const tree = await renderScreen();
    const ctas = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta');
    expect(ctas).toHaveLength(1);
  });

  it('counter subtitle reads "1 of 2 today" with 2 hydration instances and 1 completed', async () => {
    mockListDailyInstances.mockResolvedValue([
      { id: 'h1', itemType: 'hydration', status: 'completed' },
      { id: 'h2', itemType: 'hydration', status: 'pending' },
      { id: 'm1', itemType: 'medication', status: 'completed' },
    ] as any);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
    expect(subtitle).toBeDefined();
    expect(subtitle.props.children).toBe('1 of 2 today');
  });

  it('subtitle is omitted when no hydration instances exist', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    const tree = await renderScreen();
    const subtitle = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle');
    expect(subtitle).toHaveLength(0);
  });

  it('counter increment + decrement preserved', async () => {
    const tree = await renderScreen();
    const inc = findAll(tree.root, (n) => n.props?.testID === 'log-water-increment')[0];
    expect(inc).toBeDefined();
    await act(async () => { inc.props.onPress(); });
    await act(async () => { inc.props.onPress(); });
    const display = findAll(tree.root, (n) => n.props?.testID === 'log-water-display')[0];
    expect(display.props.children).toBe(2);
    const dec = findAll(tree.root, (n) => n.props?.testID === 'log-water-decrement')[0];
    await act(async () => { dec.props.onPress(); });
    const after = findAll(tree.root, (n) => n.props?.testID === 'log-water-display')[0];
    expect(after.props.children).toBe(1);
  });
});
