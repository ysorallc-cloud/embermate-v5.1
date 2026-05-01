// ============================================================================
// Journal — May 1 sizing pass Phase 4.
//
// 4a — Notes textarea minHeight ≤ 36 (compact empty state).
// 4b — HandoffCard buttons height 36 (or padding+font produces 36pt).
// 4c — TodayOutcomes "still to do" row uses textPrimary, NOT criticalAlert.
//      Coral / criticalAlert is reserved for past-window items only.
// ============================================================================

import React from 'react';

const themeColors = {
  background: '#141612',
  glass: '#2a2c25',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  warning: '#e5b04a',
  criticalAlert: '#e6776e',
  error: '#e6776e',
  coral: '#e89a7a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
};

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
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    TextInput: PT('TextInput'),
    Animated: {
      View: PT('Animated.View'),
      Value: jest.fn(() => ({ setValue: jest.fn() })),
      timing: jest.fn(() => ({ start: jest.fn() })),
    },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../utils/text/primitives', () => ({
  formatTime: () => '8:30 AM',
}));

jest.mock('../../utils/dailyOutcomes', () => ({
  formatOutcomeDetail: (items: any[]) =>
    items.map((i) => i.name || i.label || 'item').join(', '),
}));

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';
import { HandoffCard } from '../../components/journal/HandoffCard';
import { TodayOutcomes } from '../../components/journal/TodayOutcomes';

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

const styleOf = (node: any) => {
  const styleProp = node.props.style;
  const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
  return Object.assign({}, ...styles.filter(Boolean));
};

// ── 4a — Notes textarea ────────────────────────────────────────────────
describe('JournalNotesCard — compact textarea (Phase 4a)', () => {
  it('TextInput minHeight is 36 (no taller than the empty placeholder)', () => {
    const tree = (JournalNotesCard as any)({ date: '2026-04-30', onSave: jest.fn() });
    const inputs = findAll(tree, (n) => n.type === 'TextInput');
    expect(inputs.length).toBeGreaterThan(0);
    const merged = styleOf(inputs[0]);
    expect(merged.minHeight).toBe(36);
  });

  it('TextInput does not declare a height above 80', () => {
    const tree = (JournalNotesCard as any)({ date: '2026-04-30', onSave: jest.fn() });
    const inputs = findAll(tree, (n) => n.type === 'TextInput');
    const merged = styleOf(inputs[0]);
    if (merged.height !== undefined) {
      expect(merged.height).toBeLessThanOrEqual(80);
    }
    if (merged.maxHeight !== undefined) {
      expect(merged.maxHeight).toBeLessThanOrEqual(160); // empty cap
    }
  });
});

// ── 4b — Handoff buttons ────────────────────────────────────────────────
describe('HandoffCard — buttons fit a 36pt height (Phase 4b)', () => {
  const baseProps = {
    hasNotes: true,
    hasMissed: false,
    hasPending: false,
    hasLogged: true,
    dayComplete: false,
    onShare: jest.fn(),
    onDoneForToday: jest.fn(),
  };

  function visualHeight(buttonStyle: any, textStyle: any): number {
    if (buttonStyle.height) return buttonStyle.height;
    const padV = buttonStyle.paddingVertical ?? 0;
    const font = textStyle.fontSize ?? 11;
    const lineH = textStyle.lineHeight ?? font * 1.4;
    return padV * 2 + lineH;
  }

  it('Share summary button visual height ≤ 36', () => {
    const tree = (HandoffCard as any)(baseProps);
    const btn = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Share summary/.test(n.props.accessibilityLabel),
    )[0];
    expect(btn).toBeDefined();
    const btnStyle = styleOf(btn);
    const txt = findAll(btn, (n) => n.type === 'Text')[0];
    const txtStyle = styleOf(txt);
    expect(visualHeight(btnStyle, txtStyle)).toBeLessThanOrEqual(36);
  });

  it('Done for today button visual height ≤ 36', () => {
    const tree = (HandoffCard as any)(baseProps);
    const btn = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Done for today/.test(n.props.accessibilityLabel),
    )[0];
    expect(btn).toBeDefined();
    const btnStyle = styleOf(btn);
    const txt = findAll(btn, (n) => n.type === 'Text')[0];
    const txtStyle = styleOf(txt);
    expect(visualHeight(btnStyle, txtStyle)).toBeLessThanOrEqual(36);
  });
});

// ── 4c — Outcomes dual row, "still to do" colour ───────────────────────
describe('TodayOutcomes — dual row, pending count uses textPrimary (Phase 4c)', () => {
  const dualOutcomes = {
    outcomes: {
      missed:  { count: 1, names: ['Morning wellness check'], items: undefined },
      pending: { count: 8, names: ['Vitals', 'Meals', 'Mood'], items: undefined },
      logged:  { count: 0, names: [], summary: '' },
    } as any,
    asOf: new Date('2026-04-30T20:00:00'),
  };

  it('renders both missed and pending rows', () => {
    const tree = (TodayOutcomes as any)(dualOutcomes);
    expect(findAll(tree, (n) => n.props?.testID === 'outcome-icon-missed')[0]).toBeDefined();
    expect(findAll(tree, (n) => n.props?.testID === 'outcome-icon-pending')[0]).toBeDefined();
  });

  it('"8" pending count is textPrimary, NOT criticalAlert', () => {
    const tree = (TodayOutcomes as any)(dualOutcomes);
    const eight = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const text = n.props?.children;
      return String(text) === '8';
    })[0];
    expect(eight).toBeDefined();
    const merged = styleOf(eight);
    expect(merged.color).toBe('#fff'); // textPrimary
    expect(merged.color).not.toBe('#e6776e'); // criticalAlert
  });

  it('"1" missed count uses criticalAlert (past-window — coral reserved here)', () => {
    const tree = (TodayOutcomes as any)(dualOutcomes);
    const one = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const text = n.props?.children;
      return String(text) === '1';
    })[0];
    expect(one).toBeDefined();
    expect(styleOf(one).color).toBe('#e6776e');
  });
});
