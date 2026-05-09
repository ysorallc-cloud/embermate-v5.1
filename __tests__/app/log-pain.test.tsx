// ============================================================================
// Phase 9.5 — log-pain migration to LogScreen (multi-step exception wrap).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  caregiverAccent: '#aa8adc',
  criticalAlert: '#e6776e',
  green: '#5fb88a',
  amber: '#e5b04a',
  orange: '#FB923C',
  red: '#e6776e',
  rose: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
  textPlaceholder: '#6b7280',
  surfaceElevated: '#2a2c25',
  surface: '#2a2c25',
  border: 'rgba(255, 240, 215, 0.08)',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'), Text: PT('Text'), TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'), Pressable: PT('Pressable'),
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
  usePathname: () => '/log-pain',
}));

jest.mock('../../lib/navigate', () => ({
  navigateBack: jest.fn(), navigate: jest.fn(), navigateReplace: jest.fn(),
}));

jest.mock('../../storage/carePlanRepo', () => ({
  logInstanceCompletion: jest.fn(async () => null),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-05-09',
}));

jest.mock('../../utils/symptomStorage', () => ({
  saveSymptom: jest.fn(async () => {}),
}));

jest.mock('../../utils/hapticFeedback', () => ({ hapticSuccess: jest.fn(async () => {}) }));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));
jest.mock('../../lib/events', () => ({ emitDataUpdate: jest.fn() }));
jest.mock('../../lib/eventNames', () => ({ EVENT: { SYMPTOMS: 'symptoms', DAILY_INSTANCES: 'dailyInstances' } }));

import LogPainScreen from '../../app/log-pain';

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
    root = TestRenderer.create(React.createElement(LogPainScreen as any));
  });
  await act(async () => {});
  return root!;
}

describe('Phase 9.5 — log-pain source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-pain.tsx'), 'utf8');

  it('imports LogScreen', () => {
    expect(SRC).toMatch(/import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/);
  });
  it('uses LogScreen wrapper', () => { expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/); });
  it('CTA "Save pain"', () => { expect(SRC).toMatch(/Save pain/); });
  it('preserves the 9.0 multi-step exception comment', () => {
    expect(SRC).toMatch(/LogScreen exception:\s*multi-step companion/);
  });
});

describe('Phase 9.5 — log-pain behavior', () => {
  it('renders disclaimer', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-pain-disclaimer')).toHaveLength(1);
  });

  it('CTA "Save pain"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save pain/i);
  });

  it('NRS 0–10 scale renders all 11 buttons', async () => {
    const tree = await renderScreen();
    const buttons = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-pain-severity-\d+$/.test(n.props.testID));
    expect(buttons.length).toBe(11);
  });

  it('CTA disabled until severity is picked', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(true);
    const five = findAll(tree.root, (n) => n.props?.testID === 'log-pain-severity-5')[0];
    await act(async () => { five.props.onPress(); });
    const ctaAfter = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(ctaAfter.props.disabled).toBe(false);
  });

  it('body location and character chips both render', async () => {
    const tree = await renderScreen();
    const locations = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-pain-location-/.test(n.props.testID));
    const characters = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-pain-character-/.test(n.props.testID));
    expect(locations.length).toBeGreaterThan(0);
    expect(characters.length).toBeGreaterThan(0);
  });
});
