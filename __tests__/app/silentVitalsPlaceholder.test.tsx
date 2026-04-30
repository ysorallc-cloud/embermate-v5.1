// ============================================================================
// silent-vitals placeholder — temporary destination for the wellness checkbox
// until Prompt 3 ships the real silent vitals capture screen.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const PT = (n: string) => n;
  return { SafeAreaView: PT('SafeAreaView') };
});

jest.mock('../../components/SubScreenHeader', () => ({
  SubScreenHeader: 'SubScreenHeader',
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

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

describe('silent-vitals placeholder', () => {
  it('renders a SubScreenHeader with a wellness-related title', () => {
    const tree = (SilentVitalsScreen as any)();
    const header = findAll(tree, (n) => n.type === 'SubScreenHeader')[0];
    expect(header).toBeDefined();
    expect(typeof header.props.title).toBe('string');
    expect(header.props.title.length).toBeGreaterThan(0);
  });

  it('shows a "Coming next" message for the user', () => {
    const tree = (SilentVitalsScreen as any)();
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('coming next');
  });
});
