// ============================================================================
// ScheduleFocus — the conditional START HERE pointer (Direction C).
//   • Renders the single overdue item it's given (the Now tab only mounts it
//     when overdue, so the component itself is a plain pointer).
//   • check → onComplete; tapping the pointer → onOpen.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#3f7d57', accentBorder: '#3f7d5733', accentFaint: '#3f7d5711',
      textPrimary: '#111', textSecondary: '#555',
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
    status: 'missed', itemName: 'Item', priority: 'recommended', createdAt: '', updatedAt: '',
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

describe('ScheduleFocus — conditional START HERE pointer', () => {
  it('points at the overdue item (name + dose), calm framing', () => {
    const top = inst({ itemType: 'medication', itemName: 'Warfarin', itemDosage: '5mg' });
    const tree = render({ topAction: top, onComplete: jest.fn() });
    const text = textOf(tree.root);
    expect(byId(tree.root, 'schedule-focus-pointer')).toBeDefined();
    expect(text).toContain('START HERE');
    expect(text).toContain('Warfarin');
    expect(text).toContain('5mg');
    expect(text.toLowerCase()).not.toContain('overdue');
    expect(text.toLowerCase()).not.toContain('behind');
  });

  it('PRIMARY tap completes the med directly (like the timeline check) — no navigation', () => {
    const top = inst({ itemType: 'medication', itemName: 'Warfarin' });
    const onComplete = jest.fn();
    const tree = render({ topAction: top, onComplete });

    // Tapping the card body marks it taken directly — it does NOT route away.
    act(() => { byId(tree.root, 'schedule-focus-pointer').props.onPress(); });
    expect(onComplete).toHaveBeenCalledWith(top);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('the check-circle also completes in place', () => {
    const top = inst({ itemType: 'medication', itemName: 'Warfarin' });
    const onComplete = jest.fn();
    const tree = render({ topAction: top, onComplete });
    act(() => { byId(tree.root, 'schedule-focus-pointer-check').props.onPress(); });
    expect(onComplete).toHaveBeenCalledWith(top);
  });
});
