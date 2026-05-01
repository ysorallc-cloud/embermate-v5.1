// ============================================================================
// EndOfShiftCard — visual-consistency Phase 2.
// Border drops to ≤ 0.30 lavender so the card reads as a soft suggestion,
// not an alert. Heading is the canonical lavender token (#aa8adc); body
// uses the locked textSecondary (#c4c1b3). Dismiss × fires onDismiss.
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
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    colors: {
      background: '#1f201c',
      glass: '#363830',
      caregiverAccent: '#aa8adc',
      caregiverAccentText: '#d4baff',
      caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
      caregiverAccentBorder: 'rgba(170, 138, 220, 0.25)',
      textPrimary: '#fff',
      textSecondary: '#c4c1b3',
      textTertiary: '#8a8a82',
      textWarmSecondary: '#b0b8c0',
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

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../lib/events', () => ({ useDataListener: jest.fn() }));
jest.mock('../../utils/dayComplete', () => ({ isDayComplete: jest.fn(() => Promise.resolve(false)) }));
jest.mock('../../utils/text/composers/endOfShiftBody', () => ({
  composeEndOfShiftBody: (_o: any, _a: any) => 'Composed end-of-shift body.',
}));

import { EndOfShiftCard } from '../../components/now/EndOfShiftCard';

// Force evening so the component renders. The component reads
// `new Date().getHours()` at render time; mock that.
const realNow = Date.now;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-30T19:00:00'));
});
afterEach(() => {
  jest.useRealTimers();
  Date.now = realNow;
});

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

const baseProps = (overrides: any = {}) => ({
  completedCount: 9,
  // Pass outcomes so the composer path runs (and we can pin its rendered
  // text deterministically via the mock).
  outcomes: { completed: 9, missed: 2, total: 11 } as any,
  alerts: [] as any,
  ...overrides,
});

const styleOf = (node: any) => {
  const styleProp = node.props.style;
  const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
  return Object.assign({}, ...styles.filter(Boolean));
};

function alphaOf(rgba: string): number {
  const m = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

describe('EndOfShiftCard — soft-suggestion border (≤ 0.3 alpha)', () => {
  it('border opacity is ≤ 0.30 (not the previous ~0.6 alert weight)', () => {
    const tree = (EndOfShiftCard as any)(baseProps());
    expect(tree).not.toBeNull();
    const root = styleOf(tree);
    const alpha = alphaOf(root.borderColor);
    expect(alpha).toBeLessThanOrEqual(0.30);
  });
});

describe('EndOfShiftCard — heading + body color', () => {
  it('heading uses the canonical lavender (#aa8adc), not the brighter caregiverAccentText', () => {
    const tree = (EndOfShiftCard as any)(baseProps());
    const titleNodes = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const text = n.props?.children;
      return typeof text === 'string' && text === 'End of shift';
    });
    expect(titleNodes.length).toBe(1);
    const merged = styleOf(titleNodes[0]);
    expect(merged.color).toBe('#aa8adc');
  });

  it('body uses textSecondary (#c4c1b3, the locked muted)', () => {
    const tree = (EndOfShiftCard as any)(baseProps());
    const bodyNodes = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const text = n.props?.children;
      return typeof text === 'string' && text === 'Composed end-of-shift body.';
    });
    expect(bodyNodes.length).toBe(1);
    const merged = styleOf(bodyNodes[0]);
    expect(merged.color).toBe('#c4c1b3');
  });
});

describe('EndOfShiftCard — dismiss', () => {
  it('tapping × fires the onDismiss prop', () => {
    const onDismiss = jest.fn();
    const tree = (EndOfShiftCard as any)(baseProps({ onDismiss }));
    // Walk for the dismiss TouchableOpacity by its accessibility label.
    const dismiss = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      n.props?.accessibilityLabel === 'Dismiss end of shift card',
    )[0];
    expect(dismiss).toBeDefined();
    dismiss.props.onPress();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
