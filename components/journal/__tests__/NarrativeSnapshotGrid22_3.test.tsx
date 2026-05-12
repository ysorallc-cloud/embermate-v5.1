// ============================================================================
// Phase 22.3 — WHAT HAPPENED rendered as a labeled two-column grid.
//
// Pre-22.3 NarrativeSnapshot's recap branch rendered each
// TodayRecapSection as one <Text style={recapLine}> containing
// "<Text style={recapLabel}>Medications: </Text>{text}" — a single
// text node with a bold label inline and a trailing colon. The
// post-22.2 sage eyebrow signaled "this is a section" but the
// internal format read as ambiguous prose-with-bold-labels.
//
// 22.3 restructures the render as a labeled two-column grid:
//
//   Medications    3 of 5 taken · 2 still pending
//   Vitals (8a)    BP 132/82 · HR 76 · Glucose 135
//                  Wt 194 · O2 97% · Temp 98.6°
//   Wellness       1 check pending
//   Meals          Breakfast missed · Lunch missed · Dinner pending
//
// Layout rules pinned:
//   • Each row is TWO separate Text nodes (label + value), not one
//     concatenated string.
//   • Label column has a fixed width so all values align.
//   • Value column wraps to a second line aligned to the value
//     column start (not the row start). Achieved by RN's flex/wrap
//     defaults on the value <Text>.
//   • No colon after labels — was prose punctuation that the
//     two-column format makes redundant.
//   • No row-level middots — middots stay WITHIN value strings as
//     inline separators only.
//
// SCOPE — DISPLAY LAYER ONLY. The narrative builder pipeline stays
// unchanged. `todayRecapBuilder.ts` continues to emit the same
// { label, text, itemType } shape; only the JSX template rendering
// it changes. The Visit Prep PDF, HandoffSheet, and other narrative
// consumers are untouched.
//
// Time-of-reading parenthesis ("Vitals (8a)") is emitted by the
// BUILDER (todayRecapBuilder.ts:170) — deferred to Phase 17 per
// spec, not addressed in 22.3.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
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

const getHandoffToneMock = jest.fn();
const buildTodayRecapMock = jest.fn();
const buildDayNarrativeMock = jest.fn();

jest.mock('../../../storage/handoffToneRepo', () => ({
  getHandoffTone: (...a: any[]) => getHandoffToneMock(...a),
}));
jest.mock('../../../utils/todayRecapBuilder', () => ({
  buildTodayRecap: (...a: any[]) => buildTodayRecapMock(...a),
}));
jest.mock('../../../utils/narrativeSummaryBuilder', () => ({
  buildDayNarrative: (...a: any[]) => buildDayNarrativeMock(...a),
}));

import { NarrativeSnapshot } from '../NarrativeSnapshot';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

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

async function render(): Promise<TestRenderer.ReactTestRenderer> {
  let r: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(NarrativeSnapshot, {
        dateKey: '2026-05-11',
        isToday: true,
      }),
    );
  });
  return r!;
}

const SAMPLE_RECAP = {
  hasData: true,
  subtitle: '',
  sections: [
    { itemType: 'medication', label: 'Medications',
      text: '3/5 medications taken · 2 still pending' },
    { itemType: 'vitals',     label: 'Vitals (1:40p)',
      text: 'BP 132/82 · HR 76 · Glucose 135 · Wt 194 · O2 97% · Temp 98.6°' },
    { itemType: 'wellness',   label: 'Wellness',
      text: '1 check pending' },
    { itemType: 'nutrition',  label: 'Meals',
      text: 'Breakfast missed · Lunch missed · Dinner pending' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  getHandoffToneMock.mockResolvedValue(null);
  buildTodayRecapMock.mockResolvedValue(SAMPLE_RECAP);
  buildDayNarrativeMock.mockResolvedValue({ hasData: false, summary: '' });
});

describe('Phase 22.3 — WHAT HAPPENED labeled two-column grid', () => {
  it('contract 1: renders each section as a labeled row with separate label and value text nodes', async () => {
    const tree = await render();
    // Each section gets a row with its testID "today-recap-{itemType}".
    // Inside that row, there must be at least one Text holding the
    // label and a separate Text holding the value — not a single
    // concatenated text node.
    for (const section of SAMPLE_RECAP.sections) {
      const row = findAll(tree.root, (n: any) =>
        n.props?.testID === `today-recap-${section.itemType}`,
      )[0];
      expect(row).toBeDefined();

      const labelNode = findAll(row, (n: any) =>
        n.props?.testID === `today-recap-label-${section.itemType}`,
      )[0];
      const valueNode = findAll(row, (n: any) =>
        n.props?.testID === `today-recap-value-${section.itemType}`,
      )[0];
      expect(labelNode).toBeDefined();
      expect(valueNode).toBeDefined();

      expect(flattenText(labelNode)).toContain(section.label);
      expect(flattenText(valueNode)).toContain(section.text);
    }
  });

  it('contract 2: the label column has a fixed width on the label Text style', async () => {
    const tree = await render();
    const labelNode = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-label-medication',
    )[0];
    expect(labelNode).toBeDefined();
    // Style array or single style object — flatten and inspect.
    const style = labelNode.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    // 90-100pt range per spec, sized to fit "Vitals 1:40p" on iPhone
    // SE. Pin a fixed width is set (not 0/auto) and within the
    // sensible band.
    expect(typeof flat.width).toBe('number');
    expect(flat.width).toBeGreaterThanOrEqual(80);
    expect(flat.width).toBeLessThanOrEqual(120);
  });

  it('contract 3: the value Text wraps via flex-1 (second line aligns to value column)', async () => {
    // The value Text must have `flex: 1` (or `flexShrink: 1` with
    // `flexBasis: 0`) so RN line-wraps inside the column rather than
    // overflowing or wrapping back to the row start. The two-column
    // layout depends on the row being `flexDirection: 'row'` and the
    // value Text consuming the remaining horizontal space.
    const tree = await render();
    const valueNode = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-value-vitals',
    )[0];
    expect(valueNode).toBeDefined();
    const style = valueNode.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.flex === 1 || (flat.flexShrink === 1 && flat.flexBasis === 0)).toBe(true);
  });

  it('contract 4: row container is flexDirection: row (places label and value side-by-side)', async () => {
    const tree = await render();
    const row = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-medication',
    )[0];
    expect(row).toBeDefined();
    const style = row.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.flexDirection).toBe('row');
  });

  it('contract 5: no trailing colon after the label (was prose punctuation)', async () => {
    const tree = await render();
    const labelNode = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-label-medication',
    )[0];
    const labelText = flattenText(labelNode);
    expect(labelText).not.toMatch(/:\s*$/);
  });

  it('contract 6: no middots act as row separators (middots stay inside value strings)', async () => {
    // Pre-22.3 the row already used a label+value pattern, not a
    // bullet-and-middot row separator. Pin the absence explicitly so
    // a future refactor that adds row-level decoration has to come
    // through intent. Middots WITHIN the value string (BP · HR ·
    // Glucose) are inline separators and stay.
    const tree = await render();
    const row = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-medication',
    )[0];
    expect(row).toBeDefined();
    // Look for any direct text child of the row that is just a
    // middot — that would be a row-level separator.
    const directMiddot = findAll(row, (n: any) =>
      typeof n.props?.children === 'string' && n.props.children.trim() === '·',
    );
    expect(directMiddot.length).toBe(0);
  });

  it('contract 7: time-of-reading parens preserved (builder owns format; Phase 17 reframes)', async () => {
    // Spec: parens ("Vitals (8a)") come from the BUILDER, not the
    // render. 22.3 explicitly defers the parens-stripping change to
    // Phase 17. The label is passed through verbatim.
    const tree = await render();
    const labelNode = findAll(tree.root, (n: any) =>
      n.props?.testID === 'today-recap-label-vitals',
    )[0];
    expect(flattenText(labelNode)).toBe('Vitals (1:40p)');
  });

  it('contract 8: scope guard — the render layer does not import builder aggregation engines beyond the existing { buildTodayRecap, buildDayNarrative } pair', async () => {
    // Pure render-layer fix. The render must NOT pull in any
    // additional log-aggregation paths to construct the grid (those
    // belong upstream in the builders). The existing two builder
    // imports stay; nothing new is added.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../NarrativeSnapshot.tsx'), 'utf8',
    );
    // Whitelisted imports — only these aggregation paths are allowed.
    // Anything else is a regression.
    expect(src).toMatch(/from\s+['"][^'"]*todayRecapBuilder['"]/);
    expect(src).toMatch(/from\s+['"][^'"]*narrativeSummaryBuilder['"]/);
    // Blacklist: no new aggregation paths sneaked into the render.
    expect(src).not.toMatch(/from\s+['"][^'"]*medicationStorage['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*vitalsStorage['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*carePlanRepo['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*insightEngine['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*understandInsights['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*careSummaryBuilder['"]/);
  });

  it('contract 9: tone-only path (caregiver-authored) still renders as single Text, not as grid', async () => {
    // The grid format applies to the auto-recap branch. When a
    // caregiver has authored a tone, that string renders verbatim
    // as one Text node (italic Georgia) — the grid layout is for
    // the structured recap, not free-form caregiver prose.
    getHandoffToneMock.mockResolvedValue('Quiet day. Dad seemed restful.');
    const tree = await render();
    // No today-recap-label-* nodes when tone is present.
    const labels = findAll(tree.root, (n: any) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('today-recap-label-'),
    );
    expect(labels.length).toBe(0);
    // The tone string renders verbatim.
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Quiet day. Dad seemed restful.');
  });
});
