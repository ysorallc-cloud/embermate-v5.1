// ============================================================================
// Phase 9.5 — log-symptom migration to LogScreen (multi-step exception wrap).
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
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
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
  usePathname: () => '/log-symptom',
}));

jest.mock('../../lib/navigate', () => ({
  navigate: jest.fn(), navigateBack: jest.fn(), navigateReplace: jest.fn(),
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

import LogSymptomScreen from '../../app/log-symptom';

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
    root = TestRenderer.create(React.createElement(LogSymptomScreen as any));
  });
  await act(async () => {});
  return root!;
}

describe('Phase 9.5 — log-symptom source-level', () => {
  const SRC = readFileSync(join(__dirname, '../../app/log-symptom.tsx'), 'utf8');

  it('imports LogScreen', () => {
    expect(SRC).toMatch(/import\s*\{\s*LogScreen\s*\}\s*from\s*['"][^'"]+\/components\/logging\/LogScreen['"]/);
  });
  it('uses LogScreen wrapper', () => { expect(SRC).toMatch(/<LogScreen[\s\S]*?>[\s\S]*?<\/LogScreen>/); });
  it('CTA "Save symptom"', () => { expect(SRC).toMatch(/Save symptom/); });
  it('preserves the 9.0 multi-step exception comment', () => {
    expect(SRC).toMatch(/LogScreen exception:\s*multi-step parent/);
  });
  it('preserves the Pain handoff to log-pain', () => {
    expect(SRC).toMatch(/log-pain/);
  });
});

describe('Phase 9.5 — log-symptom behavior', () => {
  it('renders disclaimer', async () => {
    const tree = await renderScreen();
    expect(findAll(tree.root, (n) => n.props?.testID === 'log-symptom-disclaimer')).toHaveLength(1);
  });

  it('CTA "Save symptom"', async () => {
    const tree = await renderScreen();
    const ctaText = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta-text')[0];
    expect(ctaText.props.children).toMatch(/Save symptom/i);
  });

  it('symptom grid + severity scale render (multi-step body preserved)', async () => {
    const tree = await renderScreen();
    const chips = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-symptom-chip-/.test(n.props.testID));
    expect(chips.length).toBeGreaterThanOrEqual(7); // 8 minus Pain (still rendered, just routes away)
    const severityButtons = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^log-symptom-severity-\d+$/.test(n.props.testID));
    expect(severityButtons.length).toBe(10);
  });

  it('CTA disabled until non-Pain symptom selected', async () => {
    const tree = await renderScreen();
    const cta = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(cta.props.disabled).toBe(true);
    const headache = findAll(tree.root, (n) => n.props?.testID === 'log-symptom-chip-Headache')[0];
    await act(async () => { headache.props.onPress(); });
    const ctaAfter = findAll(tree.root, (n) => n.props?.testID === 'log-screen-primary-cta')[0];
    expect(ctaAfter.props.disabled).toBe(false);
  });
});
