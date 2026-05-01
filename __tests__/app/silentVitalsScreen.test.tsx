// ============================================================================
// silent-vitals screen — replaces the v6.7 placeholder. Hosts
// SilentVitalsCapture on a dedicated screen reachable from the Now-tab
// wellness checkbox routing and any deep link to /silent-vitals.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, jest.fn()];
    },
    useEffect: (_fn: any) => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#1f201c',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    TextInput: PT('TextInput'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: jest.fn() },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const PT = (n: string) => n;
  return { SafeAreaView: PT('SafeAreaView') };
});

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: 'SubScreenHeader',
}));

jest.mock('../../components/now/SilentVitalsCapture', () => ({
  SilentVitalsCapture: 'SilentVitalsCapture',
}));

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({ activePatient: { id: 'mom', name: 'Mom' } }),
}));

jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: () => '2026-04-30',
}));

jest.mock('../../storage/dailyReflectionRepo', () => ({
  upsertDailyReflection: jest.fn(),
  getDailyReflection: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../storage/carePlanRepo', () => ({
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../lib/navigate', () => ({ navigateBack: jest.fn() }));

jest.mock('../../utils/hapticFeedback', () => ({
  hapticSuccess: jest.fn(),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));

import SilentVitalsScreen from '../../app/silent-vitals';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}

describe('silent-vitals screen', () => {
  it('renders SubScreenHeader with the silent-vitals title', () => {
    const tree = (SilentVitalsScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header).toBeDefined();
    expect(typeof header.props.title).toBe('string');
    expect(header.props.title.toLowerCase()).toContain('silent vital');
  });

  it('substitutes the patient name into the subtitle', () => {
    const tree = (SilentVitalsScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header.props.subtitle).toContain('Mom');
  });

  it('renders SilentVitalsCapture as the body', () => {
    const tree = (SilentVitalsScreen as any)();
    const capture = findAll(tree, (n) => n.type === 'SilentVitalsCapture')[0];
    expect(capture).toBeDefined();
    expect(capture.props.patientName).toBe('Mom');
    expect(typeof capture.props.onSave).toBe('function');
    expect(typeof capture.props.onCancel).toBe('function');
  });
});
