// ============================================================================
// FlatTimelineFeed — band-header SHELF hierarchy (2026-07-02).
//
// Device testing showed the band headers (MORNING / AFTERNOON / EVENING)
// shared visual weight with their child rows — the only separating cue was a
// ~2px text-left delta, too weak to read as hierarchy. The "shelf" treatment
// fixes this STRUCTURALLY:
//
//   • The band label is isolated on its shelf row by a trailing 1px hairline
//     rule (bandRule) that runs from the end of the label/time to the right
//     edge (or to the status text).
//   • Child item rows indent a FULL STEP under the shelf — itemBody text moves
//     from marginLeft 14 → 60 (~44px past the band label), not a token nudge.
//   • The spine node stays fixed on the spine (absolute left:26/center 32) for
//     BOTH bands and items — only the TEXT indents.
//   • Band label typography is UNCHANGED (TypeScale.micro) — a non-regression
//     requirement, the fix must not shrink/de-emphasize the label.
//
// A hierarchy defect has no runtime "repro" — code can verify STRUCTURE, not
// whether a human eye perceives hierarchy. This test pins the structural
// invariants; Amber's device eye-test verifies the perception.
// ============================================================================

import React from 'react';

const ACCENT = '#9ccfa6';
const CORAL = '#e3a684';
const NEUTRAL = '#5e685f';
const GOLD = '#d6ab5e';
const ZONE = '#19211b';
const HAIRLINE = 'rgba(255,255,255,0.06)';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: ACCENT, coral: CORAL, textTertiary: NEUTRAL, gold: GOLD,
      zonePanel: ZONE, background: '#141a16', textPrimary: '#edf0ea',
      textMuted: '#8b958c', hairlineInset: HAIRLINE,
      coralFaint: 'rgba(227,166,132,0.06)', coralBorder: 'rgba(227,166,132,0.20)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return { View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s } };
});

import { FlatTimelineFeed, TimelineNode } from '../../components/now/FlatTimelineFeed';

// ── tree-walk helpers (mirrors flatTimelineSpineNodes.test.tsx) ──────────────
function flatten(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) return kids.flatMap(flatten);
  return [kids];
}
function findAll(node: any, pred: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (pred(node)) out.push(node);
  for (const k of flatten(node.props?.children)) out.push(...findAll(k, pred));
  return out;
}
function styleOf(n: any): Record<string, any> {
  const s = n?.props?.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
}
// DFS order of every testID encountered — used to prove document order
// (band appears BEFORE its child rows).
function testIdSequence(node: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (n.props?.testID) out.push(n.props.testID);
    for (const k of flatten(n.props?.children)) walk(k);
  };
  walk(node);
  return out;
}
// The text content of a node subtree (Text children flattened to a string).
function textOf(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);
  return flatten(node.props?.children).map(textOf).join('');
}

// Two DONE items (deterministic regardless of wall-clock — done rows do not
// re-derive an overdue status): one morning (8am), one evening (7pm). This
// yields rows: [band-morning, flat-row-m1, band-evening, flat-row-e1] with no
// COMING UP divider (that needs a pending row after a past done/overdue).
const morning = new Date(); morning.setHours(8, 0, 0, 0);
const evening = new Date(); evening.setHours(19, 0, 0, 0);

const tree: any = FlatTimelineFeed({
  allPending: [],
  completed: [
    { id: 'm1', itemName: 'Warfarin', itemType: 'med', windowLabel: 'morning', status: 'completed', scheduledTime: morning.toISOString() },
    { id: 'e1', itemName: 'Metformin', itemType: 'med', windowLabel: 'evening', status: 'completed', scheduledTime: evening.toISOString() },
  ],
  onItemPress: () => {},
} as any) as any;

describe('FlatTimelineFeed — band shelf is a distinct element from item rows', () => {
  it('band header and item rows are separate structural nodes (distinct testIDs)', () => {
    const bandMorning = findAll(tree, (n) => n?.props?.testID === 'band-morning');
    const itemM1 = findAll(tree, (n) => n?.props?.testID === 'flat-row-m1');
    expect(bandMorning.length).toBe(1);
    expect(itemM1.length).toBe(1);
    // Distinct nodes — the item row is NOT a descendant that IS the band row.
    expect(bandMorning[0]).not.toBe(itemM1[0]);
    // And the item row is not nested *inside* the band row (siblings in body).
    const itemInsideBand = findAll(bandMorning[0], (n) => n?.props?.testID === 'flat-row-m1');
    expect(itemInsideBand.length).toBe(0);
  });

  it('band label text content is UNCHANGED (MORNING / EVENING)', () => {
    const bandMorning = findAll(tree, (n) => n?.props?.testID === 'band-morning')[0];
    const bandEvening = findAll(tree, (n) => n?.props?.testID === 'band-evening')[0];
    expect(textOf(bandMorning)).toContain('MORNING');
    expect(textOf(bandEvening)).toContain('EVENING');
  });

  it('item rows appear AFTER their band shelf in document order', () => {
    const seq = testIdSequence(tree);
    expect(seq.indexOf('band-morning')).toBeGreaterThanOrEqual(0);
    expect(seq.indexOf('flat-row-m1')).toBeGreaterThan(seq.indexOf('band-morning'));
    // The evening shelf comes after the morning band's child row.
    expect(seq.indexOf('band-evening')).toBeGreaterThan(seq.indexOf('flat-row-m1'));
    expect(seq.indexOf('flat-row-e1')).toBeGreaterThan(seq.indexOf('band-evening'));
  });
});

describe('FlatTimelineFeed — shelf isolation cues', () => {
  it('a 1px hairline rule sits inside each band shelf row', () => {
    const rule = findAll(tree, (n) => n?.props?.testID === 'band-rule-morning');
    expect(rule.length).toBe(1);
    const s = styleOf(rule[0]);
    expect(s.height).toBe(1);
    expect(s.backgroundColor).toBe(HAIRLINE);
    // The rule flexes to fill the trailing space to the row edge/status.
    expect(s.flex).toBe(1);
    // The rule lives inside the band shelf, not loose in the body.
    const band = findAll(tree, (n) => n?.props?.testID === 'band-morning')[0];
    expect(findAll(band, (n) => n?.props?.testID === 'band-rule-morning').length).toBe(1);
  });

  it('band label typography is UNCHANGED — TypeScale.micro (9/1.8/700)', () => {
    // Non-regression: the fix must not shrink or de-emphasize the label.
    const band = findAll(tree, (n) => n?.props?.testID === 'band-morning')[0];
    const label = findAll(band, (n) => n?.type === 'Text' && textOf(n) === 'MORNING')[0];
    const s = styleOf(label);
    expect(s.fontSize).toBe(9);
    expect(s.letterSpacing).toBe(1.8);
    expect(s.fontWeight).toBe('700');
  });
});

describe('FlatTimelineFeed — child rows indent a full step under the shelf', () => {
  it('itemBody text indents a full step (~44px), not a token nudge', () => {
    // The item text column (itemBody) is the View that holds the item title.
    const row = findAll(tree, (n) => n?.props?.testID === 'flat-row-m1')[0];
    const title = findAll(row, (n) => n?.type === 'Text' && textOf(n) === 'Warfarin')[0];
    // itemBody is the parent View wrapping the title — find the View in the
    // row whose style carries a marginLeft (only itemBody does).
    const bodies = findAll(row, (n) => n?.type === 'View' && styleOf(n).marginLeft !== undefined);
    expect(bodies.length).toBe(1);
    const marginLeft = styleOf(bodies[0]).marginLeft;
    // A full step is one icon-width + gap (~44px). The pre-fix value was 14
    // (which aligned item text with the band label). Assert it is now a real
    // step, not a nudge.
    expect(marginLeft).toBeGreaterThanOrEqual(44 + 14 - 8); // >= ~50, comfortably past a nudge
    expect(marginLeft).toBe(60);
    // Sanity: the title actually lives inside that body.
    expect(findAll(bodies[0], (n) => n === title).length).toBe(1);
  });

  it('the spine node stays a separate element from the indented text', () => {
    // The presentational TimelineNode is absolutely positioned by the module
    // constant NODE_BASE (left:26, center 32 — on the spine). It is rendered
    // as a sibling of itemBody, so indenting itemBody (marginLeft 60) cannot
    // move the node — the timeline spine is preserved by construction.
    const row = findAll(tree, (n) => n?.props?.testID === 'flat-row-m1')[0];
    const node = findAll(row, (n) => n?.type === TimelineNode)[0];
    expect(node).toBeTruthy();
    // The node is NOT the indented text body — distinct sibling elements.
    const body = findAll(row, (n) => n?.type === 'View' && styleOf(n).marginLeft !== undefined)[0];
    expect(node).not.toBe(body);
    expect(findAll(node, (n) => n === body).length).toBe(0);
  });
});
