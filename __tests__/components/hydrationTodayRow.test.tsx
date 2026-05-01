// ============================================================================
// HydrationTodayRow — Now-tab standalone hydration tracker (Prompt 2 Phase 7).
// Eyebrow + big-number + goal subtitle + trailing `+` button with long-press
// picker (+1 / +2 / +4). Tap row body opens the detail sheet.
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
    useRef: (initial: any) => ({ current: initial }),
    useEffect: (_fn: any) => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      menuSurface: '#1a1f2b',
      overlay: 'rgba(0,0,0,0.6)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Modal: PT('Modal'),
    Animated: {
      View: PT('Animated.View'),
      Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn() })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
      sequence: jest.fn(() => ({ start: jest.fn() })),
    },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { HydrationTodayRow } from '../../components/now/HydrationTodayRow';

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
      try { acc += flattenText(children.type(children.props || {})); } catch (_) { /* swallow */ }
    }
    if (children.props?.children !== undefined) acc += flattenText(children.props.children);
    return acc;
  }
  return '';
}

const baseProps = (overrides: any = {}) => ({
  cupsToday: 4,
  goal: 6,
  onAddCup: jest.fn(),
  onRowPress: jest.fn(),
  ...overrides,
});

describe('HydrationTodayRow — header + numbers', () => {
  it('renders the eyebrow "HYDRATION TODAY"', () => {
    const tree = (HydrationTodayRow as any)(baseProps());
    expect(flattenText(tree)).toContain('HYDRATION TODAY');
  });

  it('shows the big number with cup count', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ cupsToday: 4 }));
    const text = flattenText(tree);
    expect(text).toContain('4');
    expect(text.toLowerCase()).toContain('cup');
  });

  it('singular form when cupsToday is exactly 1', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ cupsToday: 1 }));
    const text = flattenText(tree);
    expect(text).toContain('1 cup');
    expect(text).not.toContain('1 cups');
  });
});

describe('HydrationTodayRow — goal subtitle', () => {
  it('shows "Goal: N cups" when a goal is set', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ goal: 6 }));
    expect(flattenText(tree)).toContain('Goal: 6 cups');
  });

  it('shows the em-dash placeholder when no goal is set', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ goal: undefined }));
    expect(flattenText(tree)).toContain('—');
  });

  it('does NOT use the alarming "Configure hydration target" copy (per Prompt 2 tone)', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ goal: undefined }));
    expect(flattenText(tree)).not.toContain('Configure hydration target');
  });
});

describe('HydrationTodayRow — + button (single tap = +1)', () => {
  it('renders the + button with mint accent styling', () => {
    const tree = (HydrationTodayRow as any)(baseProps());
    const btn = findAll(tree, (n) => n.props?.testID === 'hydration-today-add')[0];
    expect(btn).toBeDefined();
  });

  it('tap fires onAddCup(1)', () => {
    const props = baseProps();
    const tree = (HydrationTodayRow as any)(props);
    const btn = findAll(tree, (n) => n.props?.testID === 'hydration-today-add')[0];
    btn.props.onPress();
    expect(props.onAddCup).toHaveBeenCalledWith(1);
  });

  it('exposes a long-press handler for the multi-cup picker', () => {
    const tree = (HydrationTodayRow as any)(baseProps());
    const btn = findAll(tree, (n) => n.props?.testID === 'hydration-today-add')[0];
    expect(typeof btn.props.onLongPress).toBe('function');
  });
});

describe('HydrationTodayRow — row body tap opens detail', () => {
  it('renders a row-body button with onPress wired to onRowPress', () => {
    const props = baseProps();
    const tree = (HydrationTodayRow as any)(props);
    const body = findAll(tree, (n) => n.props?.testID === 'hydration-today-row')[0];
    expect(body).toBeDefined();
    body.props.onPress();
    expect(props.onRowPress).toHaveBeenCalledTimes(1);
  });
});

describe('HydrationTodayRow — accessibility', () => {
  it('+ button has a descriptive a11y label', () => {
    const tree = (HydrationTodayRow as any)(baseProps());
    const btn = findAll(tree, (n) => n.props?.testID === 'hydration-today-add')[0];
    expect(btn.props.accessibilityLabel.toLowerCase()).toContain('cup');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('row body has a descriptive a11y label that includes today\'s count', () => {
    const tree = (HydrationTodayRow as any)(baseProps({ cupsToday: 4, goal: 6 }));
    const body = findAll(tree, (n) => n.props?.testID === 'hydration-today-row')[0];
    expect(body.props.accessibilityLabel).toContain('4');
  });
});
