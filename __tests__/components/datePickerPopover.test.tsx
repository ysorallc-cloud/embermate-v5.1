// ============================================================================
// DatePickerPopover — month grid with outcome-coloured dots, slid down from
// below the date strip with LayoutAnimation. Phase 1 of the date-picker
// expansion.
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
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
      accent: '#5fb88a',
      warning: '#e5b04a',
      error: '#e6776e',
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
    LayoutAnimation: {
      configureNext: jest.fn(),
      Presets: { easeInEaseOut: { duration: 200 } },
    },
    Platform: { OS: 'ios' },
  };
});

import { DatePickerPopover } from '../../components/journal/DatePickerPopover';

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
  if (children?.props?.children !== undefined) {
    return flattenText(children.props.children);
  }
  return '';
}

// Freeze "today" for deterministic month nav assertions.
const REAL_DATE = Date;
class FakeDate extends REAL_DATE {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super('2026-04-15T12:00:00');
    } else {
      // @ts-expect-error pass-through to Date constructor
      super(...args);
    }
  }
  static now() {
    return new REAL_DATE('2026-04-15T12:00:00').getTime();
  }
}

const baseProps = {
  visible: true,
  selectedDate: '2026-04-15',
  onSelect: jest.fn(),
  onClose: jest.fn(),
  // 3 days with sample statuses.
  statuses: {
    '2026-04-10': 'good',
    '2026-04-12': 'partial',
    '2026-04-14': 'missed',
  } as Record<string, 'good' | 'partial' | 'missed'>,
};

beforeAll(() => {
  // @ts-expect-error swap global Date
  global.Date = FakeDate;
});

afterAll(() => {
  global.Date = REAL_DATE;
});

beforeEach(() => {
  baseProps.onSelect = jest.fn();
  baseProps.onClose = jest.fn();
});

describe('DatePickerPopover — visibility', () => {
  it('renders nothing when visible=false', () => {
    expect(DatePickerPopover({ ...baseProps, visible: false })).toBeNull();
  });

  it('renders the popover card when visible=true', () => {
    const tree = DatePickerPopover(baseProps);
    expect(tree).not.toBeNull();
  });
});

describe('DatePickerPopover — month label + navigation', () => {
  it('shows the current month label', () => {
    const tree = DatePickerPopover(baseProps);
    expect(flattenText(tree)).toContain('April 2026');
  });

  it('renders prev (‹) and next (›) chevrons', () => {
    const tree = DatePickerPopover(baseProps);
    const text = flattenText(tree);
    expect(text).toContain('‹');
    expect(text).toContain('›');
  });

  it('next chevron is disabled when displaying the current month', () => {
    const tree = DatePickerPopover(baseProps);
    const next = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /next month/i.test(n.props.accessibilityLabel),
    )[0];
    expect(next).toBeDefined();
    expect(next.props.disabled).toBe(true);
  });
});

describe('DatePickerPopover — day-of-week strip', () => {
  it('renders the seven weekday header letters', () => {
    const tree = DatePickerPopover(baseProps);
    const labels = findAll(tree, (n) =>
      n.props?.testID && /^weekday-/.test(n.props.testID),
    );
    expect(labels).toHaveLength(7);
    expect(labels.map((n) => flattenText(n))).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});

describe('DatePickerPopover — date cells render with status colours', () => {
  it('selected cell uses accent background', () => {
    const tree = DatePickerPopover(baseProps);
    const selected = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-15')[0];
    expect(selected).toBeDefined();
    const style = Object.assign({}, ...(Array.isArray(selected.props.style) ? selected.props.style : [selected.props.style]));
    expect(style.backgroundColor).toBe('#5fb88a');
  });

  it('good-day cell shows a mint dot', () => {
    const tree = DatePickerPopover(baseProps);
    const dot = findAll(tree, (n) => n.props?.testID === 'date-dot-2026-04-10')[0];
    expect(dot).toBeDefined();
    const style = Object.assign({}, ...(Array.isArray(dot.props.style) ? dot.props.style : [dot.props.style]));
    expect(style.backgroundColor).toBe('#5fb88a');
  });

  it('partial-day cell shows an amber dot', () => {
    const tree = DatePickerPopover(baseProps);
    const dot = findAll(tree, (n) => n.props?.testID === 'date-dot-2026-04-12')[0];
    const style = Object.assign({}, ...(Array.isArray(dot.props.style) ? dot.props.style : [dot.props.style]));
    expect(style.backgroundColor).toBe('#e5b04a');
  });

  it('missed-day cell shows a red dot', () => {
    const tree = DatePickerPopover(baseProps);
    const dot = findAll(tree, (n) => n.props?.testID === 'date-dot-2026-04-14')[0];
    const style = Object.assign({}, ...(Array.isArray(dot.props.style) ? dot.props.style : [dot.props.style]));
    expect(style.backgroundColor).toBe('#e6776e');
  });

  it('empty days have no dot', () => {
    const tree = DatePickerPopover(baseProps);
    const dot = findAll(tree, (n) => n.props?.testID === 'date-dot-2026-04-09')[0];
    expect(dot).toBeUndefined();
  });

  it('selected cell suppresses the dot even if a status exists', () => {
    const tree = DatePickerPopover({ ...baseProps, selectedDate: '2026-04-14' });
    const dot = findAll(tree, (n) => n.props?.testID === 'date-dot-2026-04-14')[0];
    expect(dot).toBeUndefined();
  });
});

describe('DatePickerPopover — future dates are not tappable', () => {
  it('cells past today are disabled', () => {
    const tree = DatePickerPopover(baseProps);
    const future = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-20')[0];
    expect(future).toBeDefined();
    expect(future.props.disabled).toBe(true);
  });

  it('today and earlier are tappable', () => {
    const tree = DatePickerPopover(baseProps);
    const today = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-15')[0];
    expect(today.props.disabled).toBe(false);
    const past = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-10')[0];
    expect(past.props.disabled).toBe(false);
  });
});

describe('DatePickerPopover — selection callback', () => {
  it('tapping a cell fires onSelect with the YYYY-MM-DD key', () => {
    const tree = DatePickerPopover(baseProps);
    const cell = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-10')[0];
    cell.props.onPress();
    expect(baseProps.onSelect).toHaveBeenCalledWith('2026-04-10');
  });

  it('tapping a future date does NOT fire onSelect', () => {
    const tree = DatePickerPopover(baseProps);
    const future = findAll(tree, (n) => n.props?.testID === 'date-cell-2026-04-20')[0];
    if (typeof future.props.onPress === 'function') future.props.onPress();
    expect(baseProps.onSelect).not.toHaveBeenCalled();
  });
});

describe('DatePickerPopover — outside-tap dismiss', () => {
  it('the wrapping overlay calls onClose when tapped', () => {
    const tree = DatePickerPopover(baseProps);
    const overlay = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /close/i.test(n.props.accessibilityLabel),
    )[0];
    expect(overlay).toBeDefined();
    overlay.props.onPress();
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});

describe('DatePickerPopover — footer adherence line', () => {
  it('renders the percentage when an adherence value is supplied', () => {
    const tree = DatePickerPopover({ ...baseProps, adherencePercent: 73 });
    expect(flattenText(tree)).toContain('73% adherence this month');
  });

  it('does not render the footer when no adherence is supplied', () => {
    const tree = DatePickerPopover(baseProps);
    expect(flattenText(tree)).not.toContain('adherence this month');
  });
});
