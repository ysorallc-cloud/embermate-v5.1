// ============================================================================
// ReflectionZoneNow — reflection honesty (Part 1).
//
// BUG: State A hardcoded "Evening meds done." gated on eveningMedsComplete —
// which is true whenever no evening MEDS are pending, even if the rest of the
// day is still open (or there were no evening meds at all). So the reflection
// claimed completion that didn't happen, contradicting the schedule.
//
// FIX: gate on the day being DONE (dayComplete, from computeNowFocus.dayState).
//   • dayComplete=false (active) → honest quiet line, NO celebratory/done copy.
//   • dayComplete=true  (done)   → celebratory reflection with the CTA.
//
// RED before the fix: the component ignores day-completeness (reads
// eveningMedsComplete), so the dayComplete=true case never shows State A.
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

// Not dismissed — resolve the per-day flag to false so State A/B (not C) render.
jest.mock('../../../utils/safeStorage', () => ({
  safeGetItem: async (_k: string, fallback: any) => fallback,
  safeSetItem: async () => true,
}));

// Avoid pulling the ReflectionSheet's dependency graph.
jest.mock('../ReflectionSheet', () => ({ ReflectionSheet: () => null }));

jest.mock('react-native', () => {
  const React = require('react');
  const PT = (n: string) => ({ children, ...props }: any) =>
    React.createElement(n, props, children);
  return {
    View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { ReflectionZoneNow } from '../ReflectionZoneNow';

function allText(root: TestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  root.findAll((n: any) => {
    const c = n.props?.children;
    if (typeof c === 'string') parts.push(c);
    return false;
  });
  return parts.join(' ');
}

function hasTestId(root: TestRenderer.ReactTestInstance, id: string): boolean {
  return root.findAll((n: any) => {
    try { return n.props?.testID === id; } catch { return false; }
  }).length > 0;
}

async function render(props: any): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(ReflectionZoneNow as any, props));
  });
  // Flush the async dismissed-flag load.
  await act(async () => { await Promise.resolve(); });
  return tree;
}

describe('ReflectionZoneNow — honesty (never claim completion that did not happen)', () => {
  beforeAll(() => {
    // 8pm so the 17:00 evening gate is open.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 18, 20, 0, 0));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('day ACTIVE (dayComplete=false) → shows the honest quiet line, NOT the "done" copy', async () => {
    const tree = await render({ dayComplete: false });
    const text = allText(tree.root);

    // The dishonest completion claim must not appear while things are open.
    expect(text).not.toMatch(/done\b/i);
    expect(text).not.toMatch(/wrapped/i);
    expect(hasTestId(tree.root, 'reflection-zone-state-a')).toBe(false);
    expect(hasTestId(tree.root, 'reflection-zone-cta')).toBe(false);
    // The honest active line is shown.
    expect(hasTestId(tree.root, 'reflection-zone-state-b')).toBe(true);
  });

  it('day DONE (dayComplete=true) → shows the celebratory reflection + CTA', async () => {
    const tree = await render({ dayComplete: true });
    expect(hasTestId(tree.root, 'reflection-zone-state-a')).toBe(true);
    expect(hasTestId(tree.root, 'reflection-zone-cta')).toBe(true);
  });
});
