// ============================================================================
// ReflectionZoneNow — Part 3 disclosure.
//   • Conditional render: hidden before 17:00 (morning), shown in the evening.
//   • Collapse: collapsed by default → only the header row (no body); expanded
//     → header + body. Toggling the header fires onToggleCollapse.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#8faa7a', textPrimary: '#f4ddb8', textSecondary: '#c4c1b3',
      textTertiary: '#9a978c', textMuted: '#6b6a63', borderReflect: '#333',
    },
  }),
}));
jest.mock('../../../utils/safeStorage', () => ({
  safeGetItem: async (_k: string, fallback: any) => fallback, // not dismissed
  safeSetItem: async () => true,
}));
jest.mock('../ReflectionSheet', () => ({ ReflectionSheet: () => null }));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { ReflectionZoneNow } from '../ReflectionZoneNow';

function byId(root: TestRenderer.ReactTestInstance, id: string) {
  return root.findAll((n: any) => { try { return n.props?.testID === id; } catch { return false; } })[0];
}
async function render(props: any): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(React.createElement(ReflectionZoneNow as any, props)); });
  await act(async () => { await Promise.resolve(); });
  return tree;
}

describe('ReflectionZoneNow — Part 3 disclosure', () => {
  afterEach(() => jest.useRealTimers());

  it('MORNING (before 17:00) → does not render at all', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 9, 0, 0));
    const tree = await render({ dayComplete: false, collapsed: true, onToggleCollapse: jest.fn() });
    expect(tree.toJSON()).toBeNull();
  });

  it('EVENING + collapsed (default) → only the header row, no body', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ dayComplete: false, collapsed: true, onToggleCollapse: jest.fn() });
    expect(byId(tree.root, 'reflection-zone-header')).toBeDefined();
    // Body states are hidden while collapsed.
    expect(byId(tree.root, 'reflection-zone-state-a')).toBeUndefined();
    expect(byId(tree.root, 'reflection-zone-state-b')).toBeUndefined();
    expect(byId(tree.root, 'reflection-zone-state-c')).toBeUndefined();
  });

  it('EVENING + expanded → header + body', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const tree = await render({ dayComplete: false, collapsed: false, onToggleCollapse: jest.fn() });
    expect(byId(tree.root, 'reflection-zone-header')).toBeDefined();
    expect(byId(tree.root, 'reflection-zone-state-b')).toBeDefined();
  });

  it('tapping the header fires onToggleCollapse', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
    const onToggle = jest.fn();
    const tree = await render({ dayComplete: false, collapsed: true, onToggleCollapse: onToggle });
    act(() => { byId(tree.root, 'reflection-zone-header').props.onPress(); });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
