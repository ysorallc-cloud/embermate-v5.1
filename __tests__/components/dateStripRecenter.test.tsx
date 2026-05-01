// ============================================================================
// DateTabStrip — Phase 3 strip re-centering.
// Selecting a non-today date snaps the strip so the selected date sits on
// the right end. Earlier days fill in to the left.
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
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      warning: '#e5b04a',
      error: '#e6776e',
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

function chipsFor(selectedDate: string) {
  const tree = DateTabStrip({
    selectedDate,
    onDateSelect: () => {},
    daysToShow: 4,
  });
  return findAll(tree, (n) =>
    typeof n.props?.testID === 'string' && n.props.testID.startsWith('strip-chip-'),
  ).map((n) => n.props.testID.replace('strip-chip-', ''));
}

describe('DateTabStrip — strip ends on the selected date', () => {
  it('today as selected → ends on today, last 4 days inclusive', () => {
    expect(chipsFor('2026-04-29')).toEqual([
      '2026-04-26',
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
    ]);
  });

  it('mid-month past date as selected → ends on that date', () => {
    expect(chipsFor('2026-04-15')).toEqual([
      '2026-04-12',
      '2026-04-13',
      '2026-04-14',
      '2026-04-15',
    ]);
  });

  it('start-of-month date as selected → strip can dip into the previous month', () => {
    expect(chipsFor('2026-04-02')).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
    ]);
  });

  it('selected chip is on the right end every time', () => {
    const cases = ['2026-04-29', '2026-04-20', '2026-04-15', '2026-04-08'];
    for (const d of cases) {
      expect(chipsFor(d)[chipsFor(d).length - 1]).toBe(d);
    }
  });
});
