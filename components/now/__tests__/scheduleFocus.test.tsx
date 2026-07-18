// ============================================================================
// ScheduleFocus — the re-toned default schedule view (Part 2).
//
// Contract:
//   • active + a topAction → ONE "START HERE" hero (the next action), plus a
//     single folded line summarizing the rest ("N more open · M coming up →").
//   • done / no topAction → a calm wrapped-day state, no hero, no folded line.
//   • the folded line disappears when there is no "rest".
//   • calm framing — no "overdue"/"behind" wall.
//   • callbacks: complete / open / expand fire.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      amber: '#b8852f', accent: '#3f7d57', accentBorder: '#3f7d5733', accentFaint: '#3f7d5711',
      glass: '#fff', glassBorder: '#0001', textPrimary: '#111', textSecondary: '#555', textTertiary: '#999',
    },
  }),
}));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { ScheduleFocus } from '../ScheduleFocus';
import type { DailyCareInstance, CarePlanItemType } from '../../../types/carePlan';

let seq = 0;
function inst(over: Partial<DailyCareInstance> & { itemType: CarePlanItemType }): DailyCareInstance {
  seq += 1;
  return {
    id: `i-${seq}`, carePlanId: 'cp', carePlanItemId: `ci-${seq}`, patientId: 'default',
    date: '2026-07-18', scheduledTime: '2026-07-18T18:00:00', windowLabel: 'evening', windowId: 'w',
    status: 'pending', itemName: 'Item', priority: 'recommended', createdAt: '', updatedAt: '',
    ...over,
  } as DailyCareInstance;
}

function render(props: any) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(React.createElement(ScheduleFocus as any, props)); });
  return tree;
}
function textOf(root: TestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  root.findAll((n: any) => { const c = n.props?.children; if (typeof c === 'string') parts.push(c); return false; });
  return parts.join(' ');
}
function byId(root: TestRenderer.ReactTestInstance, id: string) {
  return root.findAll((n: any) => { try { return n.props?.testID === id; } catch { return false; } })[0];
}

const baseCbs = { onCompleteTop: jest.fn(), onOpenTop: jest.fn(), onExpand: jest.fn(), onCarePlan: jest.fn() };

describe('ScheduleFocus — calm re-toned schedule', () => {
  it('active + overdue hero → START HERE hero + folded "2 more open · 2 coming up →"', () => {
    const top = inst({ itemType: 'medication', itemName: 'Warfarin', itemDosage: '5mg' });
    const tree = render({ topAction: top, dayState: 'active', openCount: 3, upcomingCount: 2, ...baseCbs });
    const text = textOf(tree.root);

    expect(byId(tree.root, 'schedule-focus-hero')).toBeDefined();
    expect(text).toContain('START HERE');
    expect(text).toContain('Warfarin');
    expect(text).toContain('2 more open · 2 coming up →');
    // Calm framing — no alarm language.
    expect(text.toLowerCase()).not.toContain('overdue');
    expect(text.toLowerCase()).not.toContain('behind');
  });

  it('active + upcoming hero (no overdue) → folded "2 coming up →" only', () => {
    const top = inst({ itemType: 'nutrition', itemName: 'Dinner' });
    const tree = render({ topAction: top, dayState: 'active', openCount: 0, upcomingCount: 3, ...baseCbs });
    const text = textOf(tree.root);
    expect(text).toContain('Dinner');
    expect(text).toContain('2 coming up →');
    expect(text).not.toContain('more open');
  });

  it('single open item → hero, but NO folded line (nothing left to fold)', () => {
    const top = inst({ itemType: 'medication', itemName: 'Aspirin' });
    const tree = render({ topAction: top, dayState: 'active', openCount: 1, upcomingCount: 0, ...baseCbs });
    expect(byId(tree.root, 'schedule-focus-hero')).toBeDefined();
    expect(byId(tree.root, 'schedule-focus-folded')).toBeUndefined();
  });

  it('done → calm wrapped-day state, no hero, no folded line', () => {
    const tree = render({ topAction: null, dayState: 'done', openCount: 0, upcomingCount: 0, ...baseCbs });
    expect(byId(tree.root, 'schedule-focus-done')).toBeDefined();
    expect(byId(tree.root, 'schedule-focus-hero')).toBeUndefined();
    expect(byId(tree.root, 'schedule-focus-folded')).toBeUndefined();
    expect(textOf(tree.root)).toContain('caught up');
  });

  it('callbacks: expand / complete / open fire', () => {
    const cbs = { onCompleteTop: jest.fn(), onOpenTop: jest.fn(), onExpand: jest.fn(), onCarePlan: jest.fn() };
    const top = inst({ itemType: 'medication', itemName: 'Warfarin' });
    const tree = render({ topAction: top, dayState: 'active', openCount: 2, upcomingCount: 1, ...cbs });

    act(() => { byId(tree.root, 'schedule-focus-folded').props.onPress(); });
    expect(cbs.onExpand).toHaveBeenCalledTimes(1);

    act(() => { byId(tree.root, 'schedule-focus-hero-check').props.onPress(); });
    expect(cbs.onCompleteTop).toHaveBeenCalledWith(top);

    act(() => { byId(tree.root, 'schedule-focus-hero').props.onPress(); });
    expect(cbs.onOpenTop).toHaveBeenCalledWith(top);
  });
});
