// ============================================================================
// Developer → Tenure override screen. Four options (real + 3 phases) writing
// to AsyncStorage via userTenure helpers. Render-only contract test — the
// real flow uses the live storage layer.
// ============================================================================

import React from 'react';

const mockGetTenureOverride = jest.fn();
const mockSetTenureOverride = jest.fn();
const mockClearTenureOverride = jest.fn();

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
      background: '#141612',
      glass: '#2a2c25',
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
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: 'SubScreenHeader',
}));

jest.mock('../../services/userTenure', () => ({
  getTenureOverride: (...args: any[]) => mockGetTenureOverride(...args),
  setTenureOverride: (...args: any[]) => mockSetTenureOverride(...args),
  clearTenureOverride: (...args: any[]) => mockClearTenureOverride(...args),
}));

beforeEach(() => {
  mockGetTenureOverride.mockReset();
  mockSetTenureOverride.mockReset();
  mockClearTenureOverride.mockReset();
  mockGetTenureOverride.mockResolvedValue(null);
});

import DevTenureOverrideScreen from '../../app/dev/tenure-override';

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

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (typeof children === 'object') {
    let acc = '';
    if (typeof children.type === 'function') {
      try { acc += flattenText(children.type(children.props || {})); } catch (_) { /* swallow */ }
    }
    if (children.props?.children !== undefined) acc += flattenText(children.props.children);
    return acc;
  }
  return '';
}

describe('DevTenureOverrideScreen', () => {
  it('renders the header with "Tenure override"', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header).toBeDefined();
    expect(header.props.title.toLowerCase()).toContain('tenure');
  });

  it('renders all four options', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const text = flattenText(tree);
    expect(text).toContain('Use real tenure');
    expect(text).toContain('New caregiver');
    expect(text).toContain('Experienced');
    expect(text).toContain('Seasoned');
  });

  it('"Use real tenure" row clears the override', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const real = findAll(tree, (n) => n.props?.testID === 'tenure-override-real')[0];
    expect(real).toBeDefined();
    real.props.onPress();
    expect(mockClearTenureOverride).toHaveBeenCalledTimes(1);
    expect(mockSetTenureOverride).not.toHaveBeenCalled();
  });

  it('"New caregiver" row writes "new"', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const btn = findAll(tree, (n) => n.props?.testID === 'tenure-override-new')[0];
    btn.props.onPress();
    expect(mockSetTenureOverride).toHaveBeenCalledWith('new');
  });

  it('"Experienced" row writes "experienced"', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const btn = findAll(tree, (n) => n.props?.testID === 'tenure-override-experienced')[0];
    btn.props.onPress();
    expect(mockSetTenureOverride).toHaveBeenCalledWith('experienced');
  });

  it('"Seasoned" row writes "seasoned"', () => {
    const tree = (DevTenureOverrideScreen as any)();
    const btn = findAll(tree, (n) => n.props?.testID === 'tenure-override-seasoned')[0];
    btn.props.onPress();
    expect(mockSetTenureOverride).toHaveBeenCalledWith('seasoned');
  });
});
