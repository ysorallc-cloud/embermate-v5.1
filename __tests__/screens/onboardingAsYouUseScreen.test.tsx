// ============================================================================
// AsYouUseScreen — onboarding milestone preview (Prompt 7 Phase 1).
// Verifies header, opening line, three milestones (verbatim copy), and the
// Got it footer.
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
      caregiverAccent: '#aa8adc',
      warning: '#e5b04a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      youAffirmationText: '#d4d1c3',
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

import { AsYouUseScreen } from '../../app/(onboarding)/screens/AsYouUseScreen';

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

const baseProps = (overrides: any = {}) => ({
  onContinue: jest.fn(),
  ...overrides,
});

describe('AsYouUseScreen — header', () => {
  it('renders the title "As you use EmberMate"', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    expect(flattenText(tree)).toContain('As you use EmberMate');
  });

  it('renders the opening line about tracking unlocking the app', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    expect(flattenText(tree)).toContain('The longer you track, the more this app can do.');
  });
});

describe('AsYouUseScreen — three milestone rows (verbatim copy)', () => {
  it('row 1: WITHIN 2 WEEKS — Patterns start showing', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    const text = flattenText(tree);
    expect(text).toContain('WITHIN 2 WEEKS');
    expect(text).toContain('Patterns start showing');
    expect(text).toContain('Insights begins to surface trends');
  });

  it('row 2: WITHIN 30 DAYS — Visit prep gets smarter', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    const text = flattenText(tree);
    expect(text).toContain('WITHIN 30 DAYS');
    expect(text).toContain('Visit prep gets smarter');
    expect(text).toContain('Doctor reports include symptom changes');
  });

  it('row 3: COMING THIS YEAR — Clinical insights engine', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    const text = flattenText(tree);
    expect(text).toContain('COMING THIS YEAR');
    expect(text).toContain('Clinical insights engine');
    expect(text).toContain('Auto-generated correlations');
    expect(text).toContain('Built with input from real nurses');
  });
});

describe('AsYouUseScreen — framing rules', () => {
  it('does NOT mention Care Circle', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    expect(flattenText(tree).toLowerCase()).not.toContain('care circle');
  });

  it('does NOT use "coming soon!" anywhere', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    expect(flattenText(tree).toLowerCase()).not.toContain('coming soon');
  });
});

describe('AsYouUseScreen — Got it footer', () => {
  it('renders the Got it button that fires onContinue', () => {
    const props = baseProps();
    const tree = (AsYouUseScreen as any)(props);
    const btn = findAll(tree, (n) => n.props?.testID === 'as-you-use-continue')[0];
    expect(btn).toBeDefined();
    btn.props.onPress();
    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });

  it('button label is "Got it →"', () => {
    const tree = (AsYouUseScreen as any)(baseProps());
    expect(flattenText(tree)).toContain('Got it');
  });
});
