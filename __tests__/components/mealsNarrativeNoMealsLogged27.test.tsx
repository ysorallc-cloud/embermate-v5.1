// ============================================================================
// Phase 27 closeout — MealsNarrative "no meals logged yet" double-space.
//
// Pre-existing render bug surfaced during 27.X simulator verification.
// MealsNarrative line 54-55 has:
//   <Text>No meals logged yet. {names} scheduled.</Text>
// where `names = pending.map(...).join(', ')`. When pending is empty
// (e.g. a day where all meals are skipped/missed — meals.total > 0,
// completed.length === 0, pending.length === 0), `{names}` resolves
// to the empty string and the JSX template renders as
// "No meals logged yet.  scheduled." — double space, orphan "scheduled."
//
// Same render-layer-string-concat shape as Phase 27 Tuning 1's dose
// stutter fix. Fix here: only append the trailing " {names} scheduled."
// clause when pending.length > 0. Otherwise render just "No meals
// logged yet." with no trailing.
//
// Pinned contracts:
//   1. pending has items — renders "No meals logged yet. {names}
//      scheduled." (unchanged behavior).
//   2. pending is empty (skipped/missed only) — renders "No meals
//      logged yet." with no trailing " scheduled." clause and NO
//      double space anywhere.
//   3. Defensive: no double-space substring in either branch.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glassHover: 'rgba(255, 245, 220, 0.06)',
  border: 'rgba(255, 245, 220, 0.12)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  amber: '#e5b04a',
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

import { MealsNarrative } from '../../components/journal/MealsNarrative';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(n: TestRenderer.ReactTestInstance): string {
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

function renderProse(meals: any): string {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(MealsNarrative as any, { meals, bare: true }),
    );
  });
  return findAll(root!.root, (n) => n.type === 'Text')
    .map(flattenText)
    .join(' ');
}

describe('Phase 27 closeout — MealsNarrative "no meals logged yet" double-space', () => {
  it('contract 1: pending has items — "No meals logged yet. {names} scheduled." renders unchanged', () => {
    const meals = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'pending', scheduledTime: '08:00' },
        { name: 'Lunch',     status: 'pending', scheduledTime: '12:00' },
      ],
    };
    const prose = renderProse(meals);
    expect(prose).toMatch(/No meals logged yet\./);
    expect(prose).toMatch(/Breakfast, Lunch scheduled\./);
    expect(prose).not.toMatch(/\s{2,}/);
  });

  it('contract 2: pending is empty (skipped/missed only) — no trailing " scheduled." clause, no double space', () => {
    // meals.total > 0, completed = 0, pending = 0 → all skipped/missed.
    // Pre-fix the prose rendered "No meals logged yet.  scheduled."
    // with a double space and an orphan "scheduled.".
    const meals = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'skipped', scheduledTime: '08:00' },
        { name: 'Lunch',     status: 'missed',  scheduledTime: '12:00' },
      ],
    };
    const prose = renderProse(meals);
    expect(prose).toMatch(/No meals logged yet\./);
    // The trailing " {names} scheduled." clause must NOT render when
    // names is empty.
    expect(prose).not.toMatch(/\.\s+scheduled\./);
    // And no double space anywhere in the prose (the simulator
    // regression pattern).
    expect(prose).not.toMatch(/\s{2,}/);
  });

  it('contract 3: defensive — no double-space substring in either branch', () => {
    // Sweep both branches with one fixture set; assert no double-space
    // appears across the rendered prose.
    for (const meals of [
      // pending-only
      { total: 2, meals: [
        { name: 'Breakfast', status: 'pending', scheduledTime: '08:00' },
        { name: 'Lunch',     status: 'pending', scheduledTime: '12:00' },
      ]},
      // skipped/missed only
      { total: 1, meals: [
        { name: 'Breakfast', status: 'skipped', scheduledTime: '08:00' },
      ]},
      // mixed completed + pending
      { total: 2, meals: [
        { name: 'Breakfast', status: 'completed', scheduledTime: '08:00', appetite: 'normal' },
        { name: 'Lunch',     status: 'pending',   scheduledTime: '12:00' },
      ]},
    ]) {
      const prose = renderProse(meals);
      expect(prose).not.toMatch(/\s{2,}/);
    }
  });
});
