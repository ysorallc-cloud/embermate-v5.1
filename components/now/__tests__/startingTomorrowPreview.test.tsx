// StartingTomorrowPreview — renders neutral "first dose/reading tomorrow" lines
// for born-past meds + vitals; renders nothing when the list is empty.

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#111', textSecondary: '#555', glassBorder: '#0001' },
  }),
}));
jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) => React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s, hairlineWidth: 1 },
  };
});

import { StartingTomorrowPreview } from '../StartingTomorrowPreview';

function byId(root: TestRenderer.ReactTestInstance, id: string) {
  return root.findAll((n: any) => { try { return n.props?.testID === id; } catch { return false; } })[0];
}
function collect(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collect).join('');
  return collect(node.children);
}
function textOf(tree: TestRenderer.ReactTestRenderer): string {
  return collect(tree.toJSON());
}

describe('StartingTomorrowPreview', () => {
  it('renders nothing for an empty list', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => { tree = TestRenderer.create(React.createElement(StartingTomorrowPreview, { items: [] })); });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders a med "first dose tomorrow" line and a vitals "first reading tomorrow" line', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(StartingTomorrowPreview, {
          items: [
            { id: 'm1', name: 'Lisinopril (Zestril)', timeLabel: '8:00 AM', noun: 'dose', emoji: '💊' },
            { id: 'vitals', name: 'Vitals check', timeLabel: '8:00 AM', noun: 'reading', emoji: '📊' },
          ],
        }),
      );
    });
    expect(byId(tree.root, 'starting-tomorrow-preview')).toBeDefined();
    expect(byId(tree.root, 'starting-tomorrow-m1')).toBeDefined();
    expect(byId(tree.root, 'starting-tomorrow-vitals')).toBeDefined();
    const text = textOf(tree);
    expect(text).toContain('Lisinopril (Zestril)');
    expect(text).toContain('first dose tomorrow');
    expect(text).toContain('Vitals check');
    expect(text).toContain('first reading tomorrow');
    expect(text).toContain('8:00 AM');
  });

  it('omits the time when no label is resolvable', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(StartingTomorrowPreview, { items: [{ id: 'm1', name: 'Eliquis', noun: 'dose', emoji: '💊' }] }),
      );
    });
    const text = textOf(tree);
    expect(text).toContain('first dose tomorrow');
    expect(text).not.toContain(',');
  });
});
