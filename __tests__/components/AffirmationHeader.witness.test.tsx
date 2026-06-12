// ============================================================================
// Phase 11.2 — AffirmationHeader witness wiring.
//
// The header now takes an optional `witness` prop. When non-null, its
// line replaces the generic daily affirmation. Same styling, same
// voice — the user shouldn't be able to tell witness from generic.
// Fetching lifts to support.tsx (Phase 11.3); this component does NOT
// call buildCaregiverWitness itself.
//
// Pinned contracts:
//   1. Witness signal renders. When witness prop is non-null, the
//      rendered text matches witness.line exactly.
//   2. Generic fallback. When witness prop is null or undefined, the
//      rendered text matches getDailyAffirmation(today).
//   3. No internal fetch. The header must not call buildCaregiverWitness.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

const mockBuildCaregiverWitness = jest.fn();
jest.mock('../../utils/caregiverWitnessBuilder', () => ({
  // Type re-export — the header pulls WitnessSignal as a type-only import.
  __esModule: true,
  buildCaregiverWitness: (...args: any[]) => mockBuildCaregiverWitness(...args),
}));

import { AffirmationHeader } from '../../components/support/AffirmationHeader';
import { getDailyAffirmation } from '../../utils/dailyAffirmation';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

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
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(AffirmationHeader as any, props),
    );
  });
  return root!;
}

beforeEach(() => {
  mockBuildCaregiverWitness.mockReset();
});

describe('Phase 11.2 — AffirmationHeader witness prop', () => {
  it('contract 1: witness signal renders when witness prop is non-null', () => {
    const witness = {
      line: 'You showed up 6 of 7 mornings this week',
      footerLine: '6 mornings this week.\nMost people never see what that takes.',
      source: 'morning_streak' as const,
    };
    const tree = render({ witness });
    const texts = findAll(tree.root, (n) => n.type === 'Text');
    expect(texts.length).toBeGreaterThanOrEqual(1);
    const rendered = texts.map(flattenText).join(' ');
    expect(rendered).toContain('You showed up 6 of 7 mornings this week');
  });

  it('contract 1: accessibility label includes the witness line', () => {
    const witness = {
      line: 'You showed up 6 of 7 mornings this week',
      footerLine: '6 mornings this week.\nMost people never see what that takes.',
      source: 'morning_streak' as const,
    };
    const tree = render({ witness });
    const containers = findAll(
      tree.root,
      (n) => typeof n.props?.accessibilityLabel === 'string',
    );
    expect(containers.length).toBeGreaterThanOrEqual(1);
    const label = containers[0].props.accessibilityLabel as string;
    expect(label).toBe(`Today's reflection: ${witness.line}`);
  });

  it('contract 2: generic fallback when witness prop is null', () => {
    const fixedDate = new Date('2026-05-09T12:00:00Z');
    const expected = getDailyAffirmation(fixedDate);
    const tree = render({ date: fixedDate, witness: null });
    const rendered = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' ');
    expect(rendered).toContain(expected);
  });

  it('contract 2: generic fallback when witness prop is undefined', () => {
    const fixedDate = new Date('2026-05-09T12:00:00Z');
    const expected = getDailyAffirmation(fixedDate);
    const tree = render({ date: fixedDate });
    const rendered = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' ');
    expect(rendered).toContain(expected);
  });

  it('contract 3: header does NOT call buildCaregiverWitness internally', () => {
    // Render with no props — header is display-only. The screen
    // (support.tsx) owns the fetch in Phase 11.3.
    render();
    expect(mockBuildCaregiverWitness).not.toHaveBeenCalled();
  });

  it('contract 3: header does NOT fetch when witness prop is provided', () => {
    const witness = {
      line: 'X',
      footerLine: 'X',
      source: 'morning_streak' as const,
    };
    render({ witness });
    expect(mockBuildCaregiverWitness).not.toHaveBeenCalled();
  });

  it('contract 3: header does NOT fetch when witness prop is null', () => {
    render({ witness: null });
    expect(mockBuildCaregiverWitness).not.toHaveBeenCalled();
  });
});
