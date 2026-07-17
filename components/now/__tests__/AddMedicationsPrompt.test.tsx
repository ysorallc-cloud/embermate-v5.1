// ============================================================================
// AddMedicationsPrompt — empty-meds discoverability contract.
//
// Reproduces the gap: onboarding's "Medications" checkbox enables the meds
// bucket but enters no drug names (config.meds.medications = []), so the Now
// schedule shows no meds with no explanation. This affordance guides the
// caregiver to the existing Care Plan med-add route. It must surface ONLY in
// the enabled-but-empty state.
//
// Contract:
//   • medsEnabled && medicationCount === 0  → shown (the gap).
//   • medsEnabled && medicationCount > 0     → null (meds exist — job done).
//   • !medsEnabled                           → null (not tracking meds).
//   • tapping it navigates to the existing /medication-form?source=careplan.
//   • patient name, when present, warms the CTA copy.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#f4ddb8',
  textSecondary: '#c4c1b3',
  accent: '#8faa7a',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    Pressable: PT('Pressable'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (p: any) => null,
}));

const mockNavigate = jest.fn();
jest.mock('../../../lib/navigate', () => ({
  navigate: (...args: any[]) => mockNavigate(...args),
}));

import { AddMedicationsPrompt } from '../AddMedicationsPrompt';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(AddMedicationsPrompt as any, props));
  });
  return root!;
}

/** Concatenate all string children of a node's subtree for text matching. */
function textOf(root: TestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  findAll(root, (n) => {
    const c = n.props?.children;
    if (typeof c === 'string') parts.push(c);
    return false;
  });
  return parts.join(' ');
}

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('AddMedicationsPrompt — empty-meds discoverability', () => {
  it('THE GAP: meds enabled but empty → the affordance is present', () => {
    const tree = render({ medsEnabled: true, medicationCount: 0 });
    const prompt = findAll(tree.root, (n) => n.props?.testID === 'add-medications-prompt');
    expect(prompt.length).toBeGreaterThanOrEqual(1);
  });

  it('meds exist → the affordance disappears', () => {
    const tree = render({ medsEnabled: true, medicationCount: 2 });
    expect(tree.toJSON()).toBeNull();
  });

  it('meds not enabled → the affordance does not show', () => {
    const tree = render({ medsEnabled: false, medicationCount: 0 });
    expect(tree.toJSON()).toBeNull();
  });

  it('tapping it routes to the existing Care Plan med-add flow (no data change)', () => {
    const tree = render({ medsEnabled: true, medicationCount: 0 });
    const prompt = findAll(tree.root, (n) => n.props?.testID === 'add-medications-prompt')[0];
    expect(prompt).toBeDefined();
    act(() => {
      prompt.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/medication-form?source=careplan');
  });

  it('patient name warms the CTA copy when known', () => {
    const tree = render({ medsEnabled: true, medicationCount: 0, patientName: 'Mom' });
    expect(textOf(tree.root)).toContain('Add Mom');
  });

  it('falls back to a generic CTA when no patient name', () => {
    const tree = render({ medsEnabled: true, medicationCount: 0 });
    expect(textOf(tree.root)).toContain('Add medications');
  });
});
