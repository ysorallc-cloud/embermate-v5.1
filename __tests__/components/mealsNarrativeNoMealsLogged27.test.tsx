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
//   2. skipped/missed only — UPDATED by the missed-surfacing fix: each
//      meal is NAMED with its status ("Breakfast — skipped.", "Lunch —
//      missed."), the generic "No meals logged yet." is suppressed so the
//      miss isn't buried, and there is still no orphan "scheduled." nor
//      double space. (The original Phase-27 contract asserted the generic
//      line here — that encoded the silent-drop bug and is superseded.)
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

  it('contract 2: skipped/missed-only day NAMES each meal with its status (missed-surfacing fix supersedes the old generic line)', () => {
    // meals.total > 0, completed = 0, pending = 0 → all skipped/missed.
    // The ORIGINAL Phase-27 contract asserted this rendered the generic
    // "No meals logged yet." — but that was the silent-drop bug: a missed
    // meal vanished into a generic line instead of being named to the next
    // caregiver. The missed-surfacing fix names each meal with its status,
    // so the generic line is suppressed when missed/skipped exist (their
    // specific lines carry the story). The empty-names "orphan scheduled."
    // double-space path the original test guarded is now structurally
    // impossible — the generic line no longer renders on this branch.
    const meals = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'skipped', scheduledTime: '08:00' },
        { name: 'Lunch',     status: 'missed',  scheduledTime: '12:00' },
      ],
    };
    const prose = renderProse(meals);
    // Each meal named with its status — no longer dropped into a generic line.
    expect(prose).toMatch(/Breakfast/);
    expect(prose).toMatch(/skipped/);
    expect(prose).toMatch(/Lunch/);
    expect(prose).toMatch(/missed/);
    // The generic "No meals logged yet." no longer buries the miss.
    expect(prose).not.toMatch(/No meals logged yet\./);
    // No orphan "scheduled." clause and no double space (original guard).
    expect(prose).not.toMatch(/\.\s+scheduled\./);
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
