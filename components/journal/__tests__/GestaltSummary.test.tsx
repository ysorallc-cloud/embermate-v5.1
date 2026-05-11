// ============================================================================
// Phase 22.1 — GestaltSummary component contracts.
//
// Renders a single witness-voice paragraph anchoring the journal day,
// styled with a lavender left-border accent on a subtle background
// tint (visit-prep semantic color). Sits directly under the identity
// strip and above the day picker on the Journal page.
//
// Source of the paragraph text: the existing narrative pipeline that
// also drives the legacy mood line on Journal —
//   1. caregiver-authored handoffTone (verbatim), OR
//   2. auto narrative summary from the careSummaryBuilder, OR
//   3. "No record from this day." graceful fallback.
//
// Decision (per 22.1 audit): rather than introducing a new
// template-with-slots aggregator, reuse the existing narrative pipeline
// output and apply the new visual treatment. The existing builder is
// already witness-voice; double-writing slot logic would duplicate
// aggregation. The component takes the resolved summary string as a
// prop — it does NOT fetch, NOT aggregate, NOT call any log engines.
//
// Pinned contracts:
//   1. Renders the supplied summary text.
//   2. Renders the graceful-fallback string when summary is null /
//      empty.
//   3. Does NOT import log-aggregation engines (regression-prevention
//      pin matching Phase 16.2 pattern).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170,138,220,0.08)',
  caregiverAccentStrong: 'rgba(170,138,220,0.4)',
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

import { GestaltSummary } from '../GestaltSummary';

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

function render(props: { summary: string | null }): TestRenderer.ReactTestRenderer {
  let r: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    r = TestRenderer.create(React.createElement(GestaltSummary, props));
  });
  return r!;
}

describe('Phase 22.1 — GestaltSummary', () => {
  it('contract 1: renders a template-filled summary using current day state', () => {
    // "Template-filled" here means: the parent passes in the resolved
    // narrative string (which the existing pipeline assembles from
    // day state). The component renders that string verbatim.
    const tree = render({
      summary: "All meds taken. BP read morning and evening. Sleep was rough.",
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('All meds taken.');
    expect(text).toContain('BP read morning and evening.');
    expect(text).toContain('Sleep was rough.');
  });

  it('contract 2a: renders the graceful fallback when summary is null', () => {
    const tree = render({ summary: null });
    const text = flattenText(tree.toJSON());
    // The fallback matches the legacy mood-line empty-state copy.
    expect(text).toContain('No record from this day.');
  });

  it('contract 2b: renders the graceful fallback when summary is an empty/whitespace string', () => {
    const tree = render({ summary: '   ' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('No record from this day.');
  });

  it('contract 3: does NOT import log-aggregation engines (architectural pin)', () => {
    // Audit pattern matches Phase 16.2's CaregiverNotesBlock check.
    // GestaltSummary is a presentation component — the parent owns
    // narrative aggregation. Importing aggregators here would
    // double-process data and couple the component to engines that
    // belong upstream.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../GestaltSummary.tsx'), 'utf8',
    );
    expect(src).not.toMatch(/from\s+['"][^'"]*careSummaryBuilder/);
    expect(src).not.toMatch(/from\s+['"][^'"]*understandInsights/);
    expect(src).not.toMatch(/from\s+['"][^'"]*insightEngine/);
    expect(src).not.toMatch(/from\s+['"][^'"]*medicationStorage/);
    expect(src).not.toMatch(/from\s+['"][^'"]*reflectionStorage/);
    expect(src).not.toMatch(/from\s+['"][^'"]*symptomChangeDetection/);
    expect(src).not.toMatch(/from\s+['"][^'"]*functionalIssueExtraction/);
    expect(src).not.toMatch(/from\s+['"][^'"]*carePlanRepo/);
  });

  it('contract 4: applies the lavender (caregiverAccent) visual treatment', () => {
    // Spec calls for "lavender left-border accent" matching the
    // visit-prep semantic. Pin the use of caregiverAccent / Strong
    // / Bg color tokens at the source level so a future drift to
    // a different accent color comes through intent.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../GestaltSummary.tsx'), 'utf8',
    );
    expect(src).toMatch(/caregiverAccent/);
  });
});
