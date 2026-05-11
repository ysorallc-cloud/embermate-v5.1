// ============================================================================
// Phase 15.6 — NowFooter: Today's Journal feed-forward tile removed.
//
// Pre-15.6 NowFooter rendered a journal-preview ternary at the top
// of its body:
//   • completedCount < 5 → dimmed italic line "Your journal entry
//     builds throughout the day. Review it tonight."
//   • brief loaded     → populated card with "📓 Today's Journal" +
//     preview text + "View journal →" link routed to the Journal tab.
//
// The card was a feed-forward affordance — the Journal tab is
// reachable via the bottom tab bar already, so the in-Now preview
// duplicated navigation and competed with the End-of-Shift card for
// page-bottom attention. 15.6 retires the preview tile entirely.
//
// Pinned contracts:
//   1. No "Today's Journal" text rendered anywhere in NowFooter.
//   2. No "View journal" CTA rendered.
//   3. No dimmed "Your journal entry builds..." fallback rendered.
//   4. The remaining surfaces (all-done celebration when applicable,
//      EndOfShiftCard) still render correctly.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  greenTint: 'rgba(95, 184, 138, 0.15)',
  green: '#5fb88a',
  accent: '#5fb88a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../../lib/navigate', () => ({
  navigate: jest.fn(),
}));

// EndOfShiftCard is the sibling surface that stays in the footer.
// Stub it so we can assert "EndOfShiftCard still renders" without
// pulling its full dependency graph.
jest.mock('../EndOfShiftCard', () => ({
  EndOfShiftCard: (props: any) => {
    const React = require('react');
    return React.createElement('EndOfShiftCard-stub', { testID: 'end-of-shift-stub', ...props });
  },
}));

// Care Circle teaser path is feature-flagged off for v1.0 — stub the
// modules so their imports resolve cleanly.
jest.mock('../../CareCircleTeaser', () => ({
  CareCircleTeaser: () => null,
}));
jest.mock('../../CareCircleEmailCapture', () => ({
  CareCircleEmailCapture: () => null,
}));
jest.mock('../../../utils/careCircleTeaser', () => ({
  shouldShowTeaser: () => Promise.resolve(false),
}));
jest.mock('../../../utils/safeStorage', () => ({
  safeSetItem: () => Promise.resolve(),
}));

import { NowFooter } from '../NowFooter';

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string') { out.push(node); return; }
    if (typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children !== undefined) walk(node.children);
    if (node.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

function render(props: any = {}): TestRenderer.ReactTestRenderer {
  const defaults = {
    completedCount: 0,
    allPendingCount: 0,
    hasRegimenInstances: false,
    hasMissed: false,
  };
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(NowFooter as any, { ...defaults, ...props }),
    );
  });
  return root!;
}

describe('Phase 15.6 — NowFooter: journal preview tile removed', () => {
  // Pre-15.6 the populated card rendered when completedCount >= 5
  // AND a `brief` prop was non-null. We try passing both an explicit
  // `brief` and not passing it at all — post-fix the card must be
  // absent regardless of brief shape (and the prop itself is dropped
  // from the surface, but TypeScript-erased tests can still pass it).
  const populatedBrief = {
    headline: 'Test brief',
    morningWindow: {} as any,
    middayWindow: {} as any,
    eveningWindow: {} as any,
    overdue: [],
    completed: [],
    bedtimeChecklist: [],
  } as any;

  it('contract 1: no "Today\'s Journal" text rendered (populated case)', () => {
    const tree = render({
      completedCount: 7,
      allPendingCount: 0,
      hasRegimenInstances: true,
      hasMissed: false,
      brief: populatedBrief,
    });
    const all = flattenText(tree.root);
    expect(all).not.toMatch(/Today's Journal/i);
  });

  it('contract 2: no "View journal" CTA rendered', () => {
    const tree = render({ completedCount: 7, brief: populatedBrief });
    const all = flattenText(tree.root);
    expect(all).not.toMatch(/View journal/i);
    const touchables = tree.root.findAll(
      (n: any) => n.props?.accessibilityLabel === 'View journal',
    );
    expect(touchables).toHaveLength(0);
  });

  it('contract 3: no dimmed "Your journal entry builds..." fallback rendered', () => {
    // Pre-15.6 the dimmed fallback fired at completedCount < 5.
    const tree = render({ completedCount: 2 });
    const all = flattenText(tree.root);
    expect(all).not.toMatch(/Your journal entry builds/i);
    expect(all).not.toMatch(/Review it tonight/i);
  });

  it('contract 4: EndOfShiftCard still renders (regression)', () => {
    const tree = render({ completedCount: 7 });
    const stubs = tree.root.findAll(
      (n: any) => n.props?.testID === 'end-of-shift-stub',
    );
    expect(stubs.length).toBe(1);
  });

  it('contract 4: "All caught up!" message still renders when the conditions fire', () => {
    // hasRegimenInstances && allPendingCount === 0 && completedCount > 0
    // && !hasMissed → renders the all-done celebration.
    const tree = render({
      hasRegimenInstances: true,
      allPendingCount: 0,
      completedCount: 5,
      hasMissed: false,
    });
    const all = flattenText(tree.root);
    expect(all).toMatch(/All caught up/);
  });
});
