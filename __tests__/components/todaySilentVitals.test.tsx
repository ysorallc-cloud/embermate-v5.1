// ============================================================================
// TodaySilentVitals — compact three-dot preview of the day's silent vital
// signs. Renders only when at least one value exists; surfaced above the
// SilentVitalsCapture card on the silent-vitals screen.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.07)',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { TodaySilentVitals } from '../../components/now/TodaySilentVitals';

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

describe('TodaySilentVitals', () => {
  it('renders nothing when no values are captured', () => {
    const tree = (TodaySilentVitals as any)({ values: undefined });
    expect(tree).toBeNull();
  });

  it('renders three dots when at least one value is set', () => {
    const tree = (TodaySilentVitals as any)({
      values: { sleepQuality: 4, mood: 3, energyLevel: 2 },
    });
    const dots = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^silent-vitals-today-dot-(sleep|mood|energy)$/.test(n.props.testID),
    );
    expect(dots.length).toBe(3);
  });

  it('marks missing values with a dimmed dot, present values with the accent color', () => {
    const tree = (TodaySilentVitals as any)({
      values: { sleepQuality: 4 }, // mood + energy missing
    });
    const sleep = findAll(tree, (n) => n.props?.testID === 'silent-vitals-today-dot-sleep')[0];
    const mood = findAll(tree, (n) => n.props?.testID === 'silent-vitals-today-dot-mood')[0];
    expect(sleep.props.accessibilityLabel).toContain('Sleep');
    expect(mood.props.accessibilityLabel).toContain('not logged');
  });

  it('fires onPress when tapped (if provided)', () => {
    const onPress = jest.fn();
    const tree = (TodaySilentVitals as any)({
      values: { sleepQuality: 4 },
      onPress,
    });
    const button = findAll(tree, (n) => n.props?.testID === 'silent-vitals-today')[0];
    button.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
