// ============================================================================
// SEAM 4 render-path regression — the assertion that was MISSING.
//
// Device walk failed: at 2:35p an afternoon-window lunch (window 14:00, so the
// shared boundary is 16:00) rendered "overdue / Nh ago" on the Now timeline,
// while Journal correctly showed it still-scheduled. The helper returns 'due'
// (Journal proved it) — but the timeline pending-row built its label + time-
// delta from getUrgencyStatus/getTimeDeltaString (zero-grace), NOT from
// getCareItemStatus. The prior tests asserted the helper return + buildCareBrief,
// never the RENDERED ROW — so green hid a broken device.
//
// This test renders the actual TimelineSection row with REAL getCareItemStatus
// + REAL urgency, only Date faked, and asserts the row's displayed state.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, jest.fn()],
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
      background: '#1f201c', glass: '#363830', glassBorder: 'rgba(255,255,255,0.07)',
      glassHover: 'rgba(255,255,255,0.04)', glassActive: 'rgba(255,255,255,0.08)',
      glassFaint: 'rgba(255,255,255,0.03)', glassSubtle: 'rgba(255,255,255,0.05)',
      accent: '#5fb88a', accentDim: 'rgba(95,184,138,0.10)', coral: '#e6776e',
      coralFaint: 'rgba(230,119,110,0.10)', coralMuted: 'rgba(230,119,110,0.20)',
      amber: '#e5b04a', green: '#5fb88a', textPrimary: '#fff', textSecondary: '#9aa0a6',
      textTertiary: '#6b7280', textMuted: '#9aa0a6', menuSurface: '#1a1f2b', overlay: 'rgba(0,0,0,0.6)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'),
    Modal: PT('Modal'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../components/now/MedsBatchPanel', () => ({ MedsBatchPanel: 'MedsBatchPanel' }));
jest.mock('../../components/now/WindowReceipt', () => ({ WindowReceipt: 'WindowReceipt' }));
jest.mock('../../components/now/SchedulePeriodHeader', () => ({ SchedulePeriodHeader: 'SchedulePeriodHeader' }));
jest.mock('../../constants/categoryLabels', () => ({
  CATEGORY_CONFIG: {
    medication: { label: 'MEDS', color: '#F59E0B' }, nutrition: { label: 'MEALS', color: '#10B981' },
    hydration: { label: 'WATER', color: '#38BDF8' }, wellness: { label: 'WELLNESS', color: '#EC4899' },
    vitals: { label: 'VITALS', color: '#3B82F6' },
  },
}));
// NOTE: nowHelpers, nowUrgency, urgency, careItemStatus, carePlanGenerator are
// deliberately NOT mocked — the bug lives in their real interaction.

import { TimelineSection } from '../../components/now/TimelineSection';
import { UpNextCard } from '../../components/now/UpNextCard';

function collectStrings(node: any, out: string[]): void {
  if (node == null) return;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach((n) => collectStrings(n, out)); return; }
  if (typeof node !== 'object') return;
  if (typeof node.type === 'function') {
    try { collectStrings(node.type(node.props || {}), out); } catch { /* skip */ }
  }
  collectStrings(node.props?.children, out);
}

function renderText(props: any): string {
  const out: string[] = [];
  collectStrings((TimelineSection as any)(props), out);
  return out.join(' ');
}

const LUNCH = {
  id: 'lunch-1', itemName: 'Lunch', itemType: 'nutrition',
  scheduledTime: '2026-06-29T12:00:00', status: 'pending', windowLabel: 'afternoon',
  date: '2026-06-29', // REQUIRED for windowEnd resolution (afternoon → 14:00 → boundary 16:00)
};

function props() {
  return {
    allPending: [LUNCH] as any[], completed: [] as any[], hasRegimenInstances: true,
    selectedCategory: 'meals' as any, onClearCategory: jest.fn(), onItemPress: jest.fn(),
    onQuickConfirm: jest.fn(), onQuickLog: jest.fn(), onQuickSkip: jest.fn(),
    onAddCup: jest.fn(), onWellnessTap: jest.fn(),
    todayStats: {
      meds: { completed: 0, total: 0 }, vitals: { completed: 0, total: 0 },
      meals: { completed: 0, total: 1 }, water: { completed: 0, total: 0 },
      sleep: { completed: 0, total: 0 }, activity: { completed: 0, total: 0 },
      wellness: { completed: 0, total: 0 }, custom: { completed: 0, total: 0 },
    },
    enabledBuckets: ['meals'] as any[],
  };
}

const at = (hhmm: string) => new Date(`2026-06-29T${hhmm}:00`);

describe('SEAM 4 render path — afternoon meal status on the Now timeline', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
        'cancelIdleCallback', 'hrtime', 'performance'],
    });
  });
  afterEach(() => { jest.useRealTimers(); });

  it('at 2:35p (within window, boundary 16:00) the lunch row is DUE — no overdue label/time-delta', () => {
    jest.setSystemTime(at('14:35'));
    const text = renderText(props());
    expect(text).toContain('Lunch');
    // RED before fix: pending branch printed the urgency "Late · 2h 35m ago".
    expect(text).not.toMatch(/ago/i);
    expect(text).not.toMatch(/late/i);
    expect(text).not.toMatch(/missed/i);
    expect(text).toContain('Due');
  });

  it('past the window (4:35p > 16:00) the lunch row IS overdue/missed (coral) — agrees with Journal', () => {
    jest.setSystemTime(at('16:35'));
    const text = renderText(props());
    expect(text).toContain('Lunch');
    expect(text).toMatch(/missed/i); // missed render branch (coral)
  });
});

describe('SEAM 4 render path — afternoon meal on the UpNextCard (same screen, second surface)', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
        'cancelIdleCallback', 'hrtime', 'performance'],
    });
  });
  afterEach(() => { jest.useRealTimers(); });

  const upNextText = () => {
    const out: string[] = [];
    collectStrings((UpNextCard as any)({ instance: LUNCH, onLogNow: jest.fn(), onSkip: jest.fn() }), out);
    return out.join(' ');
  };

  it('at 2:35p the next-up lunch is UP NEXT, NOT overdue — no contradiction with the timeline', () => {
    jest.setSystemTime(at('14:35'));
    const text = upNextText();
    expect(text).toContain('Lunch');
    // RED before fix: the local getTimeDelta printed "overdue".
    expect(text).not.toMatch(/overdue/i);
    expect(text).not.toMatch(/needs attention/i);
    expect(text).toContain('UP NEXT');
  });

  it('past the window (4:35p) the next-up lunch reads overdue (NEEDS ATTENTION)', () => {
    jest.setSystemTime(at('16:35'));
    const text = upNextText();
    expect(text).toContain('Lunch');
    expect(text).toMatch(/overdue|needs attention/i);
  });
});
