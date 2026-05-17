// ============================================================================
// Phase 29 Batch B F1 — ResourcesList variant prop contracts.
//
// ResourcesList ships in the You-lane in two shapes after B:
//   • Default (the pre-B shape) — expanded category rows with descriptions
//     and inline expand-on-tap revealing link lists. Rendered on the new
//     /resources subscreen (full reference surface for caregivers
//     actively looking for help).
//   • Compact (new in B) — title + chevron-forward Ionicons only. No
//     descriptions, no inline expand. Tap routes to /resources. Rendered
//     on the You tab so the resources surface doesn't overshadow the
//     reflection / breath / action affordances above it.
//
// Per spec D3 the compact variant retires the planAheadCard wrapper on
// the You tab — chevron rows are the chrome. Per D1 each row's chevron
// routes to /resources (future scope: anchor-scroll to the tapped
// category; v1.0 lands on subscreen with all categories visible).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  caregiverAccent: '#aa8adc',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  textMuted: '#9aa0a6',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Linking: { openURL: jest.fn() },
  };
});

const mockNavigate = jest.fn();
jest.mock('../../lib/navigate', () => ({
  navigate: (...args: any[]) => mockNavigate(...args),
}));

jest.mock('@expo/vector-icons', () => {
  const PT = (n: string) => n;
  return { Ionicons: PT('Ionicons') };
});

import { ResourcesList } from '../../components/support/ResourcesList';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flatText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node?.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

function render(props: any = {}): TestRenderer.ReactTestRenderer {
  let tree: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    tree = TestRenderer.create(React.createElement(ResourcesList as any, props));
  });
  return tree!;
}

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('Phase 29 Batch B F1 — ResourcesList default variant (defense pin)', () => {
  it('contract D1: default variant (no variant prop) renders category descriptions', () => {
    const tree = render();
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    // The default rendering surfaces category descriptions like
    // "Benefits, tax credits, and financial assistance" (financial) and
    // "Connect with other caregivers" (community).
    expect(allText).toContain('Benefits, tax credits');
    expect(allText).toContain('Connect with other caregivers');
  });

  it('contract D2: default variant — tapping a category toggles inline expand (does NOT navigate)', () => {
    const tree = render();
    // Find the first category's TouchableOpacity (the header row).
    const tappables = findAll(tree.root, (n) => n.type === 'TouchableOpacity');
    expect(tappables.length).toBeGreaterThan(0);
    act(() => { tappables[0].props.onPress(); });
    // Expansion adds link rows beneath. The link titles for "Financial
    // help" (the first category) include "Family & Medical Leave Act".
    const allTextAfter = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allTextAfter).toContain('Family & Medical Leave Act');
    // And navigate was NOT called.
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('contract D3: default variant renders no chevron-forward Ionicons (uses Unicode glyph)', () => {
    const tree = render();
    const forwardChevrons = findAll(
      tree.root,
      (n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward',
    );
    expect(forwardChevrons).toHaveLength(0);
  });
});

describe('Phase 29 Batch B F1 — ResourcesList compact variant', () => {
  it('contract C1: compact variant renders category titles', () => {
    const tree = render({ variant: 'compact' });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    // All 5 category titles are present.
    expect(allText).toContain('Financial help');
    expect(allText).toContain('Respite care');
    expect(allText).toContain('Legal & planning');
    expect(allText).toContain('Condition guides');
    expect(allText).toContain('Community');
  });

  it('contract C2: compact variant does NOT render category descriptions', () => {
    const tree = render({ variant: 'compact' });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    // Description strings present in the default variant must be absent
    // in compact. Pin two distinct descriptions to be robust against
    // a single-category copy edit.
    expect(allText).not.toContain('Benefits, tax credits');
    expect(allText).not.toContain('Connect with other caregivers');
  });

  it('contract C3: compact variant renders chevron-forward Ionicons for each category', () => {
    const tree = render({ variant: 'compact' });
    const forwardChevrons = findAll(
      tree.root,
      (n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward',
    );
    // 5 categories → 5 chevrons.
    expect(forwardChevrons).toHaveLength(5);
    // Per spec: size 18, color textMuted (lane-quiet chrome).
    for (const c of forwardChevrons) {
      expect(c.props.size).toBe(18);
      expect(c.props.color).toBe('#9aa0a6'); // textMuted from mock theme
    }
  });

  it('contract C4: compact variant — tap calls navigate("/resources"), does NOT inline-expand', () => {
    const tree = render({ variant: 'compact' });
    const tappables = findAll(tree.root, (n) => n.type === 'TouchableOpacity');
    expect(tappables.length).toBeGreaterThan(0);
    act(() => { tappables[0].props.onPress(); });
    expect(mockNavigate).toHaveBeenCalledWith('/resources');
    // After tap, no link-row inline expansion. Link titles from the
    // default-variant inline-expand path must remain absent.
    const allTextAfter = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allTextAfter).not.toContain('Family & Medical Leave Act');
  });

  it('contract C5: compact variant — every category row tap routes to /resources', () => {
    const tree = render({ variant: 'compact' });
    const tappables = findAll(tree.root, (n) => n.type === 'TouchableOpacity');
    // 5 categories → 5 tappable rows (no link tappables in compact).
    expect(tappables).toHaveLength(5);
    for (const t of tappables) {
      mockNavigate.mockClear();
      act(() => { t.props.onPress(); });
      expect(mockNavigate).toHaveBeenCalledWith('/resources');
    }
  });
});
