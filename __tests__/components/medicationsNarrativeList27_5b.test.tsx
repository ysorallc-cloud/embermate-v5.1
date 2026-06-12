// ============================================================================
// Phase 27.5b F4 — MedicationsNarrative list restructure.
//
// Pre-27.5b the component rendered paragraph prose — one <Text> per
// medication with bold name + dose + " taken at X:XX PM." inline. The
// Section 2 (Objective) row in Journal stacks five-plus medications as
// a paragraph wall, hard to scan visually.
//
// Post-27.5b the component renders a per-medication list: one ROW per
// med, with name + dose on the LEFT and status / time on the RIGHT.
// Scannable for the Journal Section 2 row AND for eventual Visit Prep
// PDF consumption (PDF doesn't currently consume this component;
// noting the design forward-fit).
//
// Pinned contracts:
//   1. Each medication renders in its own <View> row, not folded into
//      a single shared <Text>. With N meds → at least N row Views.
//   2. Each row contains a left-side <Text> with name + dose AND a
//      right-side <Text> with status / time. Two Text nodes per row.
//   3. Status differentiation preserved across all four branches:
//      • completed → right column shows the taken time (e.g. "8:00 AM")
//      • pending   → right column shows scheduled time + "not yet"
//      • skipped   → right column shows "skipped"
//      • missed    → right column shows "missed" (or equivalent)
//   4. Tuning 1's dose-stutter dedupe carries forward. Name with dose
//      embedded ("Warfarin 5mg") + dosage field ("5mg") → name+dose
//      column renders "Warfarin 5mg" (not "Warfarin 5mg 5mg").
//   5. Side effects, when present, render as a trailing element below
//      the list (preserved behavior from the paragraph form).
//   6. Empty medications array → component returns null (preserved).
//   7. Bare mode keeps the no-chrome contract from Phase 27 F4.
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

import { MedicationsNarrative } from '../../components/journal/MedicationsNarrative';

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

function render(meds: any[]): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(MedicationsNarrative as any, { medications: meds, bare: true }),
    );
  });
  return root!;
}

describe('Phase 27.5b F4 — MedicationsNarrative list restructure', () => {
  it('contract 1: each medication renders in its own row View — N meds = N row Views', () => {
    const meds = [
      { name: 'Lisinopril', dosage: '10mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00' },
      { name: 'Aspirin', dosage: '81mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:05:00' },
      { name: 'Metformin', dosage: '1000mg', status: 'pending',
        scheduledTime: '20:00' },
    ];
    const tree = render(meds);
    // Each row carries a testID `med-row-N` (left/right children carry
    // distinct `med-row-left-N` / `med-row-right-N` testIDs, so the
    // row regex must anchor on the integer suffix to avoid matching
    // the children).
    const rows = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      /^med-row-\d+$/.test(n.props.testID),
    );
    expect(rows.length).toBe(3);
  });

  it('contract 2: each row has a left name+dose Text and a right status/time Text', () => {
    const meds = [
      { name: 'Warfarin', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00' },
    ];
    const tree = render(meds);
    const row = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-'),
    )[0];
    expect(row).toBeDefined();
    const leftText = findAll(row, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-left-'),
    )[0];
    const rightText = findAll(row, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-right-'),
    )[0];
    expect(leftText).toBeDefined();
    expect(rightText).toBeDefined();
    expect(flattenText(leftText)).toContain('Warfarin');
    expect(flattenText(leftText)).toContain('5mg');
    expect(flattenText(rightText).toLowerCase()).toMatch(/8:00|am|pm/);
  });

  it('contract 3a: completed status — right column shows taken time', () => {
    const meds = [
      { name: 'Lisinopril', dosage: '10mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00' },
    ];
    const tree = render(meds);
    const right = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-right-'),
    )[0];
    expect(right).toBeDefined();
    const txt = flattenText(right).toLowerCase();
    expect(txt).toMatch(/8:00|am|pm/);
    // No "not yet" / "missed" / "skipped" for completed rows.
    expect(txt).not.toMatch(/not yet|missed|skipped/);
  });

  it('contract 3b: pending status — right column surfaces scheduled time + "not yet"', () => {
    const meds = [
      { name: 'Metformin', dosage: '1000mg', status: 'pending',
        scheduledTime: '20:00' },
    ];
    const tree = render(meds);
    const right = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-right-'),
    )[0];
    const txt = flattenText(right).toLowerCase();
    // Accept either 12h (8:00 pm) or 24h (20:00) formats — the
    // pre-existing formatTime helper returns raw HH:MM when there's
    // no date component to parse against, which is the case for
    // pending instances that only carry a scheduledTime string.
    expect(txt).toMatch(/8:00\s*pm|20:00/);
    expect(txt).toMatch(/not yet/);
  });

  it('contract 3c: skipped status — right column shows "skipped"', () => {
    const meds = [
      { name: 'Aspirin', dosage: '81mg', status: 'skipped',
        scheduledTime: '08:00' },
    ];
    const tree = render(meds);
    const right = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-right-'),
    )[0];
    expect(flattenText(right).toLowerCase()).toContain('skipped');
  });

  it('contract 3d: missed status — right column shows "missed"', () => {
    const meds = [
      { name: 'Atorvastatin', dosage: '20mg', status: 'missed',
        scheduledTime: '20:00' },
    ];
    const tree = render(meds);
    const right = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-right-'),
    )[0];
    expect(flattenText(right).toLowerCase()).toContain('missed');
  });

  it('contract 4: Tuning 1 dose-stutter dedupe carries forward into list shape', () => {
    const meds = [
      { name: 'Warfarin 5mg', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00' },
    ];
    const tree = render(meds);
    const left = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('med-row-left-'),
    )[0];
    const leftText = flattenText(left);
    // Must contain "Warfarin 5mg" exactly once.
    expect(leftText).toMatch(/Warfarin 5mg/);
    // Must NOT contain the stutter "5mg 5mg" anywhere.
    expect(leftText).not.toMatch(/5mg\s+5mg/);
  });

  it('contract 5: side effects render as a trailing element below the list', () => {
    const meds = [
      { name: 'Warfarin', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00',
        sideEffects: ['nausea', 'mild fatigue'] },
    ];
    const tree = render(meds);
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toLowerCase()).toContain('side effect');
    expect(allText.toLowerCase()).toContain('nausea');
  });

  it('contract 6: empty medications array → component returns null (preserved)', () => {
    const tree = render([]);
    expect(tree.toJSON()).toBeNull();
  });

  it('contract 7: bare mode keeps the no-chrome contract from Phase 27 F4', () => {
    const meds = [
      { name: 'Warfarin', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-15T08:00:00' },
    ];
    const tree = render(meds); // render() always passes bare: true
    const json = tree.toJSON();
    const root = Array.isArray(json) ? json[0] : json;
    const style = (root as any)?.props?.style;
    const flat = !style ? {} : (Array.isArray(style) ? Object.assign({}, ...style) : style);
    expect(flat.borderWidth).toBeUndefined();
    expect(flat.backgroundColor).toBeUndefined();
  });
});
