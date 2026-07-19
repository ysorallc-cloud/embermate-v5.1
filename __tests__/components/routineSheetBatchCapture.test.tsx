// ============================================================================
// RoutineSheet "Complete all" — must batch ONLY binary items (BUG 2).
//
// A one-tap batch-complete may not blind-complete value-bearing items (vitals
// reading, wellness sleep/mood/energy) — that records empty data. Those items are
// excluded from the batch (and its count) and must be tapped individually to open
// their capture screen. Same needsCaptureBeforeComplete predicate as quick-confirm.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    Modal: PT('Modal'), View: PT('View'), Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'), ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s, hairlineWidth: 1 },
  };
});

import { RoutineSheet } from '../../components/now/RoutineSheet';

function byLabelPrefix(root: TestRenderer.ReactTestInstance, prefix: string) {
  return root.findAll((n: any) => {
    try { return typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(prefix); }
    catch { return false; }
  })[0];
}
function textOf(tree: TestRenderer.ReactTestRenderer): string {
  const collect = (node: any): string => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(collect).join('');
    return collect(node.children);
  };
  return collect(tree.toJSON());
}

const items = [
  { id: 'med1', itemType: 'medication', itemName: 'Lisinopril', status: 'pending', scheduledTime: '2026-07-16T08:00:00' },
  { id: 'med2', itemType: 'medication', itemName: 'Warfarin', status: 'pending', scheduledTime: '2026-07-16T08:00:00' },
  { id: 'vit1', itemType: 'vitals', itemName: 'Check vitals', status: 'pending', scheduledTime: '2026-07-16T08:00:00' },
  { id: 'well1', itemType: 'wellness', itemName: 'Wellness check', status: 'pending', scheduledTime: '2026-07-16T08:00:00' },
];

describe('RoutineSheet "Complete all" excludes value-bearing items', () => {
  it('the batch button counts + submits ONLY the binary items (2 meds), not vitals/wellness', async () => {
    const onBatchComplete = jest.fn(async () => {});
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(RoutineSheet as any, {
          visible: true, window: 'morning', items,
          onItemPress: jest.fn(), onDismiss: jest.fn(), onBatchComplete,
        }),
      );
    });
    // Label + text reflect 2 (the binary meds), NOT 4 (all pending).
    expect(textOf(tree)).toContain('Complete all 2 items');
    const batchBtn = byLabelPrefix(tree.root, 'Complete all');
    expect(batchBtn.props.accessibilityLabel).toBe('Complete all 2 items');

    await act(async () => { await batchBtn.props.onPress(); });
    expect(onBatchComplete).toHaveBeenCalledWith(['med1', 'med2']);
  });

  it('hides the batch button when only ONE binary item remains among value-bearing ones', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(RoutineSheet as any, {
          visible: true, window: 'morning',
          items: [items[0], items[2], items[3]], // 1 med + vitals + wellness
          onItemPress: jest.fn(), onDismiss: jest.fn(), onBatchComplete: jest.fn(),
        }),
      );
    });
    // batchableItems.length === 1 → no "Complete all" button.
    expect(byLabelPrefix(tree.root, 'Complete all')).toBeUndefined();
  });
});
