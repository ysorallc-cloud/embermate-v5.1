// ============================================================================
// WatchForScreen — onboarding-ready cards summarizing "things to watch for"
// per condition. Built reusable so the same screen powers Settings →
// What to watch for. Onboarding integration lands when the flow gains a
// conditions-capture step — for now the screen is consumed by Settings only.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
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

import { WatchForScreen } from '../../app/(onboarding)/screens/WatchForScreen';

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
  if (typeof node.type === 'function') {
    try {
      const rendered = node.type(node.props || {});
      for (const k of flattenChildren(rendered)) {
        out.push(...findAll(k, predicate));
      }
    } catch (_) {
      /* swallow */
    }
  }
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
      try {
        acc += flattenText(children.type(children.props || {}));
      } catch (_) {
        /* swallow */
      }
    }
    if (children.props?.children !== undefined) acc += flattenText(children.props.children);
    return acc;
  }
  return '';
}

const baseProps = (overrides: any = {}) => ({
  conditions: ['Hypertension', 'Type 2 diabetes'],
  onContinue: jest.fn(),
  onSkip: jest.fn(),
  ...overrides,
});

describe('WatchForScreen — header + structure', () => {
  it('renders the title "Things to watch for"', () => {
    const tree = (WatchForScreen as any)(baseProps());
    expect(flattenText(tree)).toContain('Things to watch for');
  });

  it('renders a card for each condition passed in', () => {
    const tree = (WatchForScreen as any)(baseProps());
    const htn = findAll(tree, (n) => n.props?.testID === 'watch-for-card-hypertension')[0];
    const t2d = findAll(tree, (n) => n.props?.testID === 'watch-for-card-type_2_diabetes')[0];
    expect(htn).toBeDefined();
    expect(t2d).toBeDefined();
  });
});

describe('WatchForScreen — custom-condition fallback', () => {
  it('shows the fallback copy for conditions not in the library', () => {
    const tree = (WatchForScreen as any)(baseProps({
      conditions: ['Mystery diagnosis'],
    }));
    const text = flattenText(tree).toLowerCase();
    expect(text).toContain('healthcare provider');
  });

  it('still renders a card for the unknown condition with its name', () => {
    const tree = (WatchForScreen as any)(baseProps({
      conditions: ['Mystery diagnosis'],
    }));
    expect(flattenText(tree)).toContain('Mystery diagnosis');
  });
});

describe('WatchForScreen — Continue + Skip', () => {
  it('renders a Continue button that fires onContinue', () => {
    const props = baseProps();
    const tree = (WatchForScreen as any)(props);
    const cont = findAll(tree, (n) => n.props?.testID === 'watch-for-continue')[0];
    expect(cont).toBeDefined();
    cont.props.onPress();
    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders a Skip-for-now link that fires onSkip', () => {
    const props = baseProps();
    const tree = (WatchForScreen as any)(props);
    const skip = findAll(tree, (n) => n.props?.testID === 'watch-for-skip')[0];
    expect(skip).toBeDefined();
    skip.props.onPress();
    expect(props.onSkip).toHaveBeenCalledTimes(1);
  });

  it('hides Skip when not provided (Settings re-render does not need to skip)', () => {
    const tree = (WatchForScreen as any)({
      conditions: ['Hypertension'],
      onContinue: jest.fn(),
      // no onSkip
    });
    const skip = findAll(tree, (n) => n.props?.testID === 'watch-for-skip')[0];
    expect(skip).toBeUndefined();
  });
});

describe('WatchForScreen — footer hint', () => {
  it('mentions where to find the list later (Settings)', () => {
    const tree = (WatchForScreen as any)(baseProps());
    expect(flattenText(tree).toLowerCase()).toContain('settings');
  });
});
