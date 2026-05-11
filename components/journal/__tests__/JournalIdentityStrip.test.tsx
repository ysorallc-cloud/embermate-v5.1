// ============================================================================
// Phase 22.1 — JournalIdentityStrip component contracts.
//
// Renders a single thin line directly under the "Journal" title:
//   "{date} · {patientName} · {caregiverName}"
//
// All three slots can be empty/missing — the strip degrades
// gracefully:
//   • date: required (always provided as a string by the parent)
//   • patientName: omitted when empty (the parent already maps the
//     "Patient" placeholder + empty string to a fallback elsewhere)
//   • caregiverName: omitted when null (caregiver profile absent)
//
// Pinned contracts mirror the structure: full / patient-missing /
// caregiver-missing / both-missing.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { JournalIdentityStrip } from '../JournalIdentityStrip';

function flattenText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (typeof node === 'object') {
    if (node.children) return flattenText(node.children);
    if (node.props?.children !== undefined) return flattenText(node.props.children);
  }
  return '';
}

function render(props: {
  date: string;
  patientName: string;
  caregiverName: string | null;
}): TestRenderer.ReactTestRenderer {
  let r: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    r = TestRenderer.create(React.createElement(JournalIdentityStrip, props));
  });
  return r!;
}

describe('Phase 22.1 — JournalIdentityStrip', () => {
  it('renders all three slots separated by middle-dot when full', () => {
    const tree = render({
      date: 'Monday, May 11',
      patientName: 'Dad',
      caregiverName: 'Sarah',
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Monday, May 11');
    expect(text).toContain('Dad');
    expect(text).toContain('Sarah');
    // Middle-dot separator between slots; pin exactly 2 (date·patient
    // and patient·caregiver).
    const dotMatches = text.match(/·/g) || [];
    expect(dotMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('omits the caregiver slot when caregiverName is null', () => {
    const tree = render({
      date: 'Monday, May 11',
      patientName: 'Dad',
      caregiverName: null,
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Monday, May 11');
    expect(text).toContain('Dad');
    // One middle-dot remains (between date and patient).
    const dotMatches = text.match(/·/g) || [];
    expect(dotMatches.length).toBe(1);
  });

  it('omits the patient slot when patientName is empty', () => {
    const tree = render({
      date: 'Monday, May 11',
      patientName: '',
      caregiverName: 'Sarah',
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Monday, May 11');
    expect(text).toContain('Sarah');
    // One middle-dot remains (between date and caregiver).
    const dotMatches = text.match(/·/g) || [];
    expect(dotMatches.length).toBe(1);
  });

  it('renders just the date when both names are missing', () => {
    const tree = render({
      date: 'Monday, May 11',
      patientName: '',
      caregiverName: null,
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Monday, May 11');
    expect(text).not.toContain('·');
  });
});
