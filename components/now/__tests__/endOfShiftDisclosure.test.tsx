// ============================================================================
// EndOfShiftCard — Part 3 disclosure.
//   • Conditional render: hidden before 18:00; in the evening, hidden unless
//     there's handoff context (something logged, a handoff note, or unresolved
//     items). Early day / empty evening → does not render at all.
//   • Collapse: collapsed by default → title row only (no body/CTA); expanded →
//     full card. Toggling the title fires onToggleCollapse.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccentBg: '#0000', borderHandoff: '#333', caregiverAccentText: '#88f',
      caregiverAccent: '#aa8adc', textPrimary: '#fff', textSecondary: '#999',
    },
  }),
}));
jest.mock('../../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../../utils/text/composers/endOfShiftBody', () => ({
  composeEndOfShiftBody: () => 'Today\'s care is wrapping up.',
}));
jest.mock('../../../utils/dayComplete', () => ({ isDayComplete: async () => false }));
jest.mock('../../../lib/events', () => ({ useDataListener: () => {} }));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { EndOfShiftCard } from '../EndOfShiftCard';

function byId(root: TestRenderer.ReactTestInstance, id: string) {
  return root.findAll((n: any) => { try { return n.props?.testID === id; } catch { return false; } })[0];
}
function textOf(root: TestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  root.findAll((n: any) => { const c = n.props?.children; if (typeof c === 'string') parts.push(c); return false; });
  return parts.join(' ');
}
async function render(props: any): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(React.createElement(EndOfShiftCard as any, props)); });
  await act(async () => { await Promise.resolve(); }); // flush isDayComplete
  return tree;
}

describe('EndOfShiftCard — Part 3 disclosure', () => {
  afterEach(() => jest.useRealTimers());

  it('MORNING (before 18:00) → does not render even with context', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 10, 0, 0));
    const tree = await render({ completedCount: 3, collapsed: true });
    expect(tree.toJSON()).toBeNull();
  });

  it('EVENING but NO handoff context (0 logged, no note, 0 pending) → does not render', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ completedCount: 0, hasHandoffNote: false, allPendingCount: 0, collapsed: true });
    expect(tree.toJSON()).toBeNull();
  });

  it('EVENING + context (items logged) + collapsed (default) → title row only, no CTA', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ completedCount: 2, collapsed: true, onToggleCollapse: jest.fn() });
    expect(byId(tree.root, 'eos-header')).toBeDefined();
    expect(textOf(tree.root)).toContain('End of shift');
    expect(textOf(tree.root)).not.toContain('View journal');
  });

  it('EVENING + context + expanded → full card (body + CTA)', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ completedCount: 2, collapsed: false, onToggleCollapse: jest.fn() });
    expect(textOf(tree.root)).toContain('View journal');
  });

  it('handoff context can come from unresolved items alone (0 logged, pending > 0)', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ completedCount: 0, allPendingCount: 4, collapsed: true });
    expect(byId(tree.root, 'eos-header')).toBeDefined();
  });

  it('tapping the title fires onToggleCollapse', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const onToggle = jest.fn();
    const tree = await render({ completedCount: 2, collapsed: true, onToggleCollapse: onToggle });
    act(() => { byId(tree.root, 'eos-header').props.onPress(); });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
