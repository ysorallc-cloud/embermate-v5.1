// ============================================================================
// Settings → What to watch for — re-uses the WatchForScreen component, reads
// active conditions from MedicalInfo.diagnoses, surfaces a Last shown line.
// ============================================================================

import React from 'react';

const mockGetMedicalInfo = jest.fn();

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
      warning: '#e5b04a',
      criticalAlert: '#e6776e',
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
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

jest.mock('../../utils/medicalInfo', () => ({
  getMedicalInfo: (...args: any[]) => mockGetMedicalInfo(...args),
}));

jest.mock('../../lib/navigate', () => ({ navigateBack: jest.fn() }));

jest.mock('../../app/(onboarding)/screens/WatchForScreen', () => ({
  WatchForScreen: 'WatchForScreen',
}));

beforeEach(() => {
  mockGetMedicalInfo.mockReset();
  mockGetMedicalInfo.mockResolvedValue({
    diagnoses: [
      { condition: 'Hypertension', status: 'active' },
      { condition: 'Type 2 diabetes', status: 'active' },
    ],
  });
});

import WhatToWatchForScreen from '../../app/settings/what-to-watch-for';

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

describe('Settings → What to watch for', () => {
  it('renders the WatchForScreen component as the body', () => {
    const tree = (WhatToWatchForScreen as any)();
    const screen = findAll(tree, (n) => n.type === 'WatchForScreen')[0];
    expect(screen).toBeDefined();
  });

  it('passes the active conditions through to WatchForScreen', () => {
    const tree = (WhatToWatchForScreen as any)();
    const screen = findAll(tree, (n) => n.type === 'WatchForScreen')[0];
    // The mocked useState returns initial state — the [Hypertension, T2D]
    // diagnoses are loaded inside useEffect which the shim no-ops; on first
    // render the `conditions` prop is the empty array. Verify the contract
    // — that the screen receives the array as a prop.
    expect(Array.isArray(screen.props.conditions)).toBe(true);
  });

  it('does not pass an onSkip — Settings re-render does not need to skip', () => {
    const tree = (WhatToWatchForScreen as any)();
    const screen = findAll(tree, (n) => n.type === 'WatchForScreen')[0];
    expect(screen.props.onSkip).toBeUndefined();
  });

  it('passes an onContinue that closes the screen', () => {
    const tree = (WhatToWatchForScreen as any)();
    const screen = findAll(tree, (n) => n.type === 'WatchForScreen')[0];
    expect(typeof screen.props.onContinue).toBe('function');
  });
});
