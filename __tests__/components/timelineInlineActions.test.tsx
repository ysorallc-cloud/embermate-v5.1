// ============================================================================
// TimelineSection — inline trailing-edge actions contract.
// Validates the v6.7 Now-tab UX: checkbox replaces the Log button, hydration
// items render a `+` button, wellness items get a routing button.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => {
      // Make useState behave like a stable single-render shim — the tree we
      // walk is the first render, which is enough for our contract checks.
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, jest.fn()];
    },
    useEffect: (_fn: any) => {},
    useRef: (initial: any) => ({ current: initial }),
    useCallback: (fn: any) => fn,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#1f201c',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)',
      glassActive: 'rgba(255,255,255,0.08)',
      glassFaint: 'rgba(255,255,255,0.03)',
      glassSubtle: 'rgba(255,255,255,0.05)',
      accent: '#5fb88a',
      accentDim: 'rgba(95,184,138,0.10)',
      red: '#e6776e',
      redFaint: 'rgba(230,119,110,0.10)',
      redMuted: 'rgba(230,119,110,0.20)',
      amber: '#e5b04a',
      green: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      textMuted: '#9aa0a6',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../components/now/MedsBatchPanel', () => ({
  MedsBatchPanel: 'MedsBatchPanel',
}));
jest.mock('../../components/now/WindowReceipt', () => ({
  WindowReceipt: 'WindowReceipt',
}));
jest.mock('../../components/now/SchedulePeriodHeader', () => ({
  SchedulePeriodHeader: 'SchedulePeriodHeader',
}));

jest.mock('../../utils/scheduleStatus', () => ({
  getPeriodStatus: () => undefined,
}));

jest.mock('../../utils/nowHelpers', () => ({
  isOverdue: () => false,
  groupByTimeWindow: (items: any[]) => ({
    morning: items,
    afternoon: [],
    evening: [],
    night: [],
  }),
  getCurrentTimeWindow: () => 'morning',
}));

jest.mock('../../utils/nowUrgency', () => ({
  getUrgencyStatus: () => ({ tone: 'soon', label: 'Soon', itemUrgency: undefined }),
}));

jest.mock('../../utils/urgency', () => ({
  getDetailedUrgencyLabel: () => 'Soon',
  getTimeDeltaString: () => '',
}));

jest.mock('../../constants/categoryLabels', () => ({
  CATEGORY_CONFIG: {
    medication: { label: 'MEDS', color: '#F59E0B' },
    nutrition: { label: 'MEALS', color: '#10B981' },
    hydration: { label: 'WATER', color: '#38BDF8' },
    wellness: { label: 'WELLNESS', color: '#EC4899' },
    vitals: { label: 'VITALS', color: '#3B82F6' },
  },
}));

import { TimelineSection } from '../../components/now/TimelineSection';

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
  // When the node's type is a custom React function component, invoke it so
  // we can recurse into its rendered output. Strings (e.g. mocked 'View')
  // and class components are skipped.
  if (typeof node.type === 'function') {
    try {
      const rendered = node.type(node.props || {});
      for (const k of flattenChildren(rendered)) {
        out.push(...findAll(k, predicate));
      }
    } catch (_) {
      /* swallow — some components may need refs/context we haven't mocked */
    }
  }
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}

const baseInstance = (overrides: Partial<any> = {}) => ({
  id: 'inst-1',
  itemName: 'Acetaminophen',
  itemType: 'medication',
  scheduledTime: '2026-04-29T08:00:00',
  status: 'pending',
  windowLabel: 'morning',
  ...overrides,
});

const baseProps = () => ({
  allPending: [baseInstance()] as any[],
  completed: [] as any[],
  hasRegimenInstances: true,
  selectedCategory: null,
  onClearCategory: jest.fn(),
  onItemPress: jest.fn(),
  onQuickConfirm: jest.fn(),
  onQuickLog: jest.fn(),
  onQuickSkip: jest.fn(),
  onAddCup: jest.fn(),
  onWellnessTap: jest.fn(),
  todayStats: {
    meds: { completed: 0, total: 1 },
    vitals: { completed: 0, total: 0 },
    meals: { completed: 0, total: 0 },
    water: { completed: 0, total: 0 },
    sleep: { completed: 0, total: 0 },
    activity: { completed: 0, total: 0 },
    wellness: { completed: 0, total: 0 },
    custom: { completed: 0, total: 0 },
  } as any,
  enabledBuckets: ['meds'] as any,
});

describe('TimelineSection — inline trailing-edge actions', () => {
  it('renders an InlineCheckbox at the trailing edge for a pending med item', () => {
    const tree = (TimelineSection as any)(baseProps());
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-1')[0];
    expect(checkbox).toBeDefined();
  });

  it('tapping the checkbox fires onQuickLog with the instance', () => {
    const props = baseProps();
    const tree = (TimelineSection as any)(props);
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-1')[0];
    checkbox.props.onPress();
    expect(props.onQuickLog).toHaveBeenCalledTimes(1);
    expect(props.onQuickLog.mock.calls[0][0].id).toBe('inst-1');
  });

  it('long-press on the checkbox fires onLongPress prop on the checkbox', () => {
    const props = baseProps();
    const tree = (TimelineSection as any)(props);
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-1')[0];
    expect(typeof checkbox.props.onLongPress).toBe('function');
  });

  it('hydration items render an add-cup button instead of the checkbox', () => {
    const props = baseProps();
    props.allPending = [baseInstance({ id: 'inst-h', itemType: 'hydration', itemName: 'Water' })];
    const tree = (TimelineSection as any)(props);
    const cupBtn = findAll(tree, (n) => n.props?.testID === 'inline-add-cup-inst-h')[0];
    expect(cupBtn).toBeDefined();
    cupBtn.props.onPress();
    expect(props.onAddCup).toHaveBeenCalledTimes(1);
    expect(props.onAddCup.mock.calls[0][0].id).toBe('inst-h');
    // No checkbox for hydration
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-h')[0];
    expect(checkbox).toBeUndefined();
  });

  it('wellness items: tapping the checkbox fires onWellnessTap', () => {
    const props = baseProps();
    props.allPending = [baseInstance({ id: 'inst-w', itemType: 'wellness', itemName: 'Check-in' })];
    const tree = (TimelineSection as any)(props);
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-w')[0];
    expect(checkbox).toBeDefined();
    checkbox.props.onPress();
    expect(props.onWellnessTap).toHaveBeenCalledTimes(1);
    expect(props.onWellnessTap.mock.calls[0][0].id).toBe('inst-w');
    expect(props.onQuickLog).not.toHaveBeenCalled();
  });

  it('completed items show a logged-state checkbox (filled)', () => {
    const props = baseProps();
    // Keep one pending sibling so the morning window doesn't auto-collapse —
    // the default-collapse rule hides windows where every item is finished.
    props.allPending = [baseInstance({ id: 'inst-p' })];
    props.completed = [baseInstance({ id: 'inst-d', status: 'completed' })];
    const tree = (TimelineSection as any)(props);
    const checkbox = findAll(tree, (n) => n.props?.testID === 'inline-checkbox-inst-d')[0];
    expect(checkbox).toBeDefined();
    expect(checkbox.props.state).toBe('logged');
  });
});
