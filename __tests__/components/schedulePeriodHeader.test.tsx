// ============================================================================
// SchedulePeriodHeader — disclosure chevron + first-launch hint.
// Wraps the morning / afternoon / evening / night pill rows in
// TimelineSection. The parent owns expand state; this component owns the
// chevron animation and the optional one-time first-launch hint.
// ============================================================================

import React from 'react';

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (k: string, v: string) => mockSetItem(k, v),
  getItem: (k: string) => mockGetItem(k),
}));

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.06)',
      accent: '#5fb88a',
      warning: '#e5b04a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  const Animated = {
    Value: class {
      _v: number;
      constructor(v: number) { this._v = v; }
      setValue(v: number) { this._v = v; }
      interpolate(_cfg: any) { return this; }
    },
    View: PT('AnimatedView'),
    Text: PT('AnimatedText'),
    timing: () => ({ start: (cb?: () => void) => cb && cb() }),
    sequence: (steps: any[]) => ({
      start: (cb?: () => void) => {
        for (const s of steps) s?.start?.(() => {});
        cb && cb();
      },
    }),
    parallel: (steps: any[]) => ({
      start: (cb?: () => void) => {
        for (const s of steps) s?.start?.(() => {});
        cb && cb();
      },
    }),
  };
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Animated,
    Easing: {
      out: () => (x: number) => x,
      inOut: () => (x: number) => x,
      ease: (x: number) => x,
      quad: (x: number) => x,
    },
  };
});

import { SchedulePeriodHeader } from '../../components/now/SchedulePeriodHeader';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const baseProps = {
  label: 'Morning',
  icon: '☀️',
  remainingCount: 3,
  completedCount: 1,
  isCollapsed: false,
  isActiveWindow: false,
  hintEnabled: false,
  onToggle: jest.fn(),
};

beforeEach(() => {
  mockSetItem.mockReset();
  mockGetItem.mockReset();
  baseProps.onToggle = jest.fn();
});

describe('SchedulePeriodHeader — chevron rendering', () => {
  it('renders a chevron glyph in the period pill', () => {
    const tree = SchedulePeriodHeader(baseProps);
    const text = flattenText(tree);
    // Either ▾ / ⌃ / › is acceptable — just confirm a disclosure glyph is present
    expect(text).toMatch(/▾|⌃|›|⌄/);
  });

  it('chevron uses textTertiary on inactive periods', () => {
    const tree = SchedulePeriodHeader({ ...baseProps, isActiveWindow: false });
    const chevron = findAll(tree, (n) => n.props?.testID === 'period-chevron')[0];
    const style = Object.assign({}, ...(Array.isArray(chevron.props.style) ? chevron.props.style : [chevron.props.style]));
    expect(style.color).toBe('#6b7280');
  });

  it('chevron uses accent mint on the active period', () => {
    const tree = SchedulePeriodHeader({ ...baseProps, isActiveWindow: true });
    const chevron = findAll(tree, (n) => n.props?.testID === 'period-chevron')[0];
    const style = Object.assign({}, ...(Array.isArray(chevron.props.style) ? chevron.props.style : [chevron.props.style]));
    expect(style.color).toBe('#5fb88a');
  });
});

describe('SchedulePeriodHeader — orientation reflects expanded state', () => {
  it('exposes the expanded state on accessibilityState', () => {
    const expanded = SchedulePeriodHeader({ ...baseProps, isCollapsed: false });
    const button = findAll(expanded, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityState).toEqual({ expanded: true });

    const collapsed = SchedulePeriodHeader({ ...baseProps, isCollapsed: true });
    const cb = findAll(collapsed, (n) => n.type === 'TouchableOpacity')[0];
    expect(cb.props.accessibilityState).toEqual({ expanded: false });
  });
});

describe('SchedulePeriodHeader — entire header row is the tap target', () => {
  it('the whole row is wrapped in a single TouchableOpacity', () => {
    const tree = SchedulePeriodHeader(baseProps);
    const buttons = findAll(tree, (n) => n.type === 'TouchableOpacity');
    // The header row itself + at most one Start button = up to 2.
    // The chevron must NOT be its own button — the whole row is.
    expect(buttons[0].props.onPress).toBe(baseProps.onToggle);
  });

  it('tapping fires onToggle once', () => {
    const tree = SchedulePeriodHeader(baseProps);
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    button.props.onPress();
    expect(baseProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('header row meets 44pt minimum tap target', () => {
    const tree = SchedulePeriodHeader(baseProps);
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    const style = Object.assign({}, ...(Array.isArray(button.props.style) ? button.props.style : [button.props.style]));
    expect((style.minHeight ?? 44)).toBeGreaterThanOrEqual(44);
  });
});

describe('SchedulePeriodHeader — accessibility', () => {
  it('label includes period, count, and expanded state (warm-tone copy)', () => {
    const tree = SchedulePeriodHeader({ ...baseProps, label: 'Morning', remainingCount: 5, isCollapsed: false });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityLabel).toBe('Morning, 5 to go, expanded');
  });

  it('label flips when collapsed', () => {
    const tree = SchedulePeriodHeader({ ...baseProps, label: 'Morning', remainingCount: 5, isCollapsed: true });
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityLabel).toBe('Morning, 5 to go, collapsed');
  });

  it('hint mentions the inverse action', () => {
    const expanded = SchedulePeriodHeader({ ...baseProps, isCollapsed: false });
    const button = findAll(expanded, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityHint).toBe('Double tap to collapse this period.');

    const collapsed = SchedulePeriodHeader({ ...baseProps, isCollapsed: true });
    const cb = findAll(collapsed, (n) => n.type === 'TouchableOpacity')[0];
    expect(cb.props.accessibilityHint).toBe('Double tap to expand this period.');
  });

  it('exposes accessibilityRole="button"', () => {
    const tree = SchedulePeriodHeader(baseProps);
    const button = findAll(tree, (n) => n.type === 'TouchableOpacity')[0];
    expect(button.props.accessibilityRole).toBe('button');
  });
});

describe('SchedulePeriodHeader — first-launch hint persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('persists the nowTabChevronHintShown flag after the hint runs', () => {
    SchedulePeriodHeader({ ...baseProps, hintEnabled: true, isActiveWindow: true });
    // useEffect runs synchronously in the mock; the storage write should be
    // queued by the time render returns.
    expect(mockSetItem).toHaveBeenCalledWith('nowTabChevronHintShown', 'true');
  });

  it('does NOT play / persist the hint when hintEnabled=false', () => {
    SchedulePeriodHeader({ ...baseProps, hintEnabled: false });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('does NOT play the hint on inactive periods even when hintEnabled=true', () => {
    SchedulePeriodHeader({ ...baseProps, hintEnabled: true, isActiveWindow: false });
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('SchedulePeriodHeader — caregiver-warm status metadata', () => {
  function metaText(tree: any): string {
    const node = findAll(tree, (n) => n.props?.testID === 'period-meta')[0];
    return flattenText(node);
  }
  function metaStyle(tree: any): any {
    const node = findAll(tree, (n) => n.props?.testID === 'period-meta')[0];
    return Object.assign({}, ...(Array.isArray(node.props.style) ? node.props.style : [node.props.style]));
  }

  it('past-complete renders "complete" in textTertiary', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      status: { kind: 'past-complete', loggedCount: 3, label: 'complete' } as any,
    });
    expect(metaText(tree)).toBe('complete');
    expect(metaStyle(tree).color).toBe('#6b7280');
  });

  it('past-incomplete renders "[N] not logged" in warning amber', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      status: { kind: 'past-incomplete', loggedCount: 1, notLoggedCount: 2, label: '2 not logged' } as any,
    });
    expect(metaText(tree)).toBe('2 not logged');
    expect(metaStyle(tree).color).toBe('#e5b04a');
  });

  it('current-active renders "[N] to go" in warning amber', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      status: { kind: 'current-active', toGoCount: 5, label: '5 to go' } as any,
    });
    expect(metaText(tree)).toBe('5 to go');
    expect(metaStyle(tree).color).toBe('#e5b04a');
  });

  it('current-caughtup renders "caught up" in accent mint', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      status: { kind: 'current-caughtup', label: 'caught up' } as any,
    });
    expect(metaText(tree)).toBe('caught up');
    expect(metaStyle(tree).color).toBe('#5fb88a');
  });

  it('future renders "[N] coming up" in textTertiary', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      status: { kind: 'future', comingUpCount: 3, label: '3 coming up' } as any,
    });
    expect(metaText(tree)).toBe('3 coming up');
    expect(metaStyle(tree).color).toBe('#6b7280');
  });

  it('the legacy "missed" copy is never rendered, regardless of status', () => {
    const cases = [
      { kind: 'past-complete', loggedCount: 3, label: 'complete' },
      { kind: 'past-incomplete', loggedCount: 1, notLoggedCount: 2, label: '2 not logged' },
      { kind: 'current-active', toGoCount: 5, label: '5 to go' },
      { kind: 'current-caughtup', label: 'caught up' },
      { kind: 'future', comingUpCount: 3, label: '3 coming up' },
    ];
    for (const status of cases) {
      const tree = SchedulePeriodHeader({ ...baseProps, status: status as any });
      const text = flattenText(tree);
      expect(text).not.toMatch(/missed|overdue|failed/i);
    }
  });
});

describe('SchedulePeriodHeader — Start button only on current-active', () => {
  it('shows Start when status is current-active', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      onStart: jest.fn(),
      status: { kind: 'current-active', toGoCount: 3, label: '3 to go' } as any,
    });
    const startButtons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /^Start /.test(n.props.accessibilityLabel),
    );
    expect(startButtons.length).toBe(1);
  });

  it('hides Start in every other status, even when collapsed with pending counts', () => {
    const cases = [
      { kind: 'past-complete', loggedCount: 3, label: 'complete' },
      { kind: 'past-incomplete', loggedCount: 1, notLoggedCount: 2, label: '2 not logged' },
      { kind: 'current-caughtup', label: 'caught up' },
      { kind: 'future', comingUpCount: 3, label: '3 coming up' },
    ];
    for (const status of cases) {
      const tree = SchedulePeriodHeader({
        ...baseProps,
        isCollapsed: true,
        remainingCount: 5,
        onStart: jest.fn(),
        status: status as any,
      });
      const startButtons = findAll(tree, (n) =>
        n.type === 'TouchableOpacity' &&
        typeof n.props?.accessibilityLabel === 'string' &&
        /^Start /.test(n.props.accessibilityLabel),
      );
      expect(startButtons.length).toBe(0);
    }
  });
});

describe('SchedulePeriodHeader — Start button passthrough', () => {
  it('renders a Start button only when collapsed AND a Start handler is provided', () => {
    const onStart = jest.fn();
    const tree = SchedulePeriodHeader({
      ...baseProps,
      isCollapsed: true,
      remainingCount: 3,
      onStart,
    });
    const startButtons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /^Start /.test(n.props.accessibilityLabel),
    );
    expect(startButtons.length).toBe(1);
  });

  it('does not render Start when expanded', () => {
    const tree = SchedulePeriodHeader({
      ...baseProps,
      isCollapsed: false,
      remainingCount: 3,
      onStart: jest.fn(),
    });
    const startButtons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /^Start /.test(n.props.accessibilityLabel),
    );
    expect(startButtons.length).toBe(0);
  });
});
