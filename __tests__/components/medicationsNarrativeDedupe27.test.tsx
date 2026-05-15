// ============================================================================
// Phase 27 Tuning 1 — MedicationsNarrative deduplicates name + dosage.
//
// Simulator regression: every medication row rendered with a stuttered
// dose ("Warfarin 5mg 5mg taken at 4:30 PM."). Audit traced the cause
// to the sample data shape: medication records carry the dose inside
// `name` ("Warfarin 5mg") AND in a separate `dosage` field ("5mg").
// MedicationsNarrative then concatenated both unconditionally:
//   <Text>{name}</Text>{dosage ? ' ' + dosage : ''} taken at {time}.
//
// Fix at the render layer per the user's directive — when `name`
// already ends with `dosage` (with any whitespace between), skip the
// separate dosage append. The data shape stays untouched (production
// medications may or may not have the dose baked into the name; the
// render must handle both).
//
// Apply to every status branch:
//   • allCompleted shortcut (the "all medications taken today." prose)
//   • completed loop (individual "X taken at..." lines)
//   • pending loop (individual "X scheduled for..." lines)
//   • skipped + missed loop (the "X — skipped." lines)
//
// Pinned contracts:
//   1. name="Warfarin 5mg" + dosage="5mg" → "Warfarin 5mg" appears
//      exactly once in the rendered prose (no "5mg 5mg" substring).
//   2. name="Warfarin" + dosage="5mg" → "Warfarin 5mg" appears (the
//      legitimate non-stutter case still works).
//   3. name="Warfarin 5mg" + dosage="" → "Warfarin 5mg" appears once.
//   4. Dedupe applies to all four status branches (completed, pending,
//      skipped, missed). Pinned by walking each fixture.
//   5. Whitespace-only differences between name-suffix and dosage do
//      not break the dedupe (e.g. trailing space in name).
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

function renderProse(meds: any[]): string {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(MedicationsNarrative as any, { medications: meds, bare: true }),
    );
  });
  return findAll(root!.root, (n) => n.type === 'Text')
    .map(flattenText)
    .join(' | ');
}

describe('Phase 27 Tuning 1 — MedicationsNarrative dose dedupe', () => {
  it('contract 1: name already has dosage embedded — dosage not appended again', () => {
    const meds = [
      { name: 'Warfarin 5mg', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T16:30:00' },
    ];
    const prose = renderProse(meds);
    // "5mg 5mg" must NOT appear anywhere — that was the simulator
    // stutter pattern.
    expect(prose).not.toMatch(/5mg\s+5mg/);
    // The canonical form renders exactly once.
    expect(prose).toMatch(/Warfarin 5mg/);
  });

  it('contract 2: name without dosage — dosage IS appended (no false-negative dedupe)', () => {
    const meds = [
      { name: 'Acetaminophen', dosage: '500mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
    ];
    const prose = renderProse(meds);
    expect(prose).toMatch(/Acetaminophen 500mg/);
  });

  it('contract 3: name already has dose, empty dosage field — renders the name as-is', () => {
    const meds = [
      { name: 'Warfarin 5mg', dosage: '', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
    ];
    const prose = renderProse(meds);
    expect(prose).toMatch(/Warfarin 5mg/);
    expect(prose).not.toMatch(/5mg\s+5mg/);
  });

  it('contract 4: dedupe applies to all status branches', () => {
    // Mix of statuses so all four render branches fire (completed,
    // pending, skipped, missed). Each entry has name with dose
    // embedded plus a separate dosage field — any branch that
    // forgets to dedupe will produce a "Xmg Xmg" substring.
    const meds = [
      { name: 'Warfarin 5mg',  dosage: '5mg',  status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
      { name: 'Lisinopril 20mg', dosage: '20mg', status: 'pending',
        scheduledTime: '20:00' },
      { name: 'Aspirin 81mg', dosage: '81mg', status: 'skipped',
        scheduledTime: '12:00' },
      { name: 'Metformin 1000mg', dosage: '1000mg', status: 'missed',
        scheduledTime: '14:00' },
    ];
    const prose = renderProse(meds);
    // No "{X}mg {X}mg" stutter for any of the four numbers.
    expect(prose).not.toMatch(/5mg\s+5mg/);
    expect(prose).not.toMatch(/20mg\s+20mg/);
    expect(prose).not.toMatch(/81mg\s+81mg/);
    expect(prose).not.toMatch(/1000mg\s+1000mg/);
  });

  it('contract 5: trailing whitespace in name does not break the dedupe', () => {
    const meds = [
      { name: 'Warfarin 5mg ', dosage: '5mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
    ];
    const prose = renderProse(meds);
    expect(prose).not.toMatch(/5mg\s+5mg/);
  });

  it('contract 6 (reframed Phase 27.5b F4): dedupe applies to the all-completed list shape', () => {
    // Pre-27.5b the all-completed branch produced a shortcut prose
    // sentence ("All medications taken today. {details}.") with a
    // comma-joined details string. Phase 27.5b F4 replaced the entire
    // paragraph render with a per-row list — there's no longer a
    // shortcut "All medications taken today" header phrase, just one
    // row per medication.
    //
    // The contract still defends the Tuning 1 dedupe in the
    // all-completed configuration: each row's left column carries
    // "{name} {dose}" with no stutter even when both meds have the
    // dose embedded in name + a separate dosage field.
    const meds = [
      { name: 'Warfarin 5mg',  dosage: '5mg',  status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
      { name: 'Aspirin 81mg',  dosage: '81mg', status: 'completed',
        scheduledTime: '08:00', takenAt: '2026-05-14T08:00:00' },
    ];
    const prose = renderProse(meds);
    expect(prose).not.toMatch(/5mg\s+5mg/);
    expect(prose).not.toMatch(/81mg\s+81mg/);
    // Both medication names render exactly once each in the list.
    expect(prose).toMatch(/Warfarin 5mg/);
    expect(prose).toMatch(/Aspirin 81mg/);
  });
});
