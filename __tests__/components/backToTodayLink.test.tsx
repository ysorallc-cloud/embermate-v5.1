// ============================================================================
// DateTabStrip — Phase 4 "Back to today" affordance.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#1f201c',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
    },
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    LayoutAnimation: { configureNext: jest.fn(), Presets: { easeInEaseOut: {} } },
    Platform: { OS: 'ios' },
    UIManager: { setLayoutAnimationEnabledExperimental: jest.fn() },
  };
});

jest.mock('../../components/journal/DatePickerPopover', () => ({
  DatePickerPopover: () => null,
}));

import { DateTabStrip } from '../../components/journal/DateTabStrip';

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

const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) super('2026-04-29T12:00:00');
    // @ts-expect-error pass-through
    else super(...args);
  }
  static now() { return new RealDate('2026-04-29T12:00:00').getTime(); }
}

beforeAll(() => { (global as any).Date = FakeDate; });
afterAll(() => { (global as any).Date = RealDate; });

describe('Back to today affordance', () => {
  it('is hidden when today is selected', () => {
    const tree = DateTabStrip({
      selectedDate: '2026-04-29',
      onDateSelect: () => {},
    });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /back to today/i.test(n.props.accessibilityLabel),
    );
    expect(button).toEqual([]);
  });

  it('is visible when a past date is selected', () => {
    const tree = DateTabStrip({
      selectedDate: '2026-04-15',
      onDateSelect: () => {},
    });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /back to today/i.test(n.props.accessibilityLabel),
    );
    expect(button.length).toBeGreaterThan(0);
  });

  it('tapping it fires onDateSelect with todays date key', () => {
    const onDateSelect = jest.fn();
    const tree = DateTabStrip({
      selectedDate: '2026-04-15',
      onDateSelect,
    });
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /back to today/i.test(n.props.accessibilityLabel),
    )[0];
    button.props.onPress();
    expect(onDateSelect).toHaveBeenCalledWith('2026-04-29');
  });

  it('the button uses the accent colour', () => {
    const tree = DateTabStrip({
      selectedDate: '2026-04-15',
      onDateSelect: () => {},
    });
    const buttonLabel = findAll(tree, (n) =>
      n.type === 'Text' &&
      typeof n.props?.children === 'string' &&
      n.props.children === 'Back to today',
    )[0];
    expect(buttonLabel).toBeDefined();
    const style = Object.assign({}, ...(Array.isArray(buttonLabel.props.style) ? buttonLabel.props.style : [buttonLabel.props.style]));
    expect(style.color).toBe('#5fb88a');
  });
});
