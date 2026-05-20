// ============================================================================
// Phase 28 F3 — InsightsReadCard contract.
//
// THE READ is Section 1 of the Insights three-card restructure. It
// consolidates the pre-28 "This week's pulse" prose section and the
// PatternStack "EmberMate noticed" surface into a single sage-encoded
// card with:
//   • a one-line gestalt prose opener (Georgia italic; sourced from
//     generateOneLineGestalt, no new copy)
//   • a 2×2 metric grid (Adherence / Sleep / Hydration / Meals); each
//     tile renders '—' when the metric is unavailable for the period
//   • a pattern callout — "{N} patterns worth discussing with a
//     provider:" — followed by up to 3 inline pattern lines with
//     per-line expand revealing evidence + suggestion (Phase 28 D2
//     Option A: preserves substantive suggestion text)
//   • an inline footnote "For informational purposes only · Not a
//     diagnosis"
//
// Pinned contracts:
//   1. Eyebrow text is "THE READ · {N} DAYS" formatted from timeRange.
//   2. The card consumes JournalSection with tint='sage'.
//   3. Gestalt prose renders the generateOneLineGestalt output when
//      non-empty; omitted otherwise.
//   4. Metric grid renders 4 tiles in fixed order
//      [Adherence, Sleep, Hydration, Meals]; missing values show '—'.
//   5. With patterns present, callout renders with "{N} pattern{s}
//      worth discussing with a provider:" and at most 3 pattern lines.
//   6. Pattern line tap toggles expanded body containing evidence
//      list + suggestion (when suggestion present on the card).
//   7. Footnote "For informational purposes only · Not a diagnosis"
//      always renders inside the card.
//   8. Without any signal (empty gestalt, all metric tiles '—', no
//      patterns), the card returns null (parent does not need to
//      gate; the card decides whether it has content to surface).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  accent: '#5fb88a',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  amber: '#e5b04a',
  amberFaint: 'rgba(229, 176, 74, 0.06)',
  glassStrong: 'rgba(255, 245, 220, 0.18)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  green: '#5fb88a',
  redBright: '#ef4444',
  amberBright: '#e5b04a',
};

jest.mock('../../contexts/ThemeContext', () => ({
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

import { InsightsReadCard } from '../../components/insights/InsightsReadCard';
import type { UnderstandPageData } from '../../utils/understandInsights';

function makeData(overrides: Partial<UnderstandPageData> = {}): UnderstandPageData {
  return {
    timeRange: 14,
    framing: { label: '', subtitle: '', description: '' },
    standOutInsights: [],
    positiveObservations: [],
    correlationCards: [],
    hasEnoughData: true,
    daysOfData: 14,
    adherenceRate: 0,
    dosesLogged: 0,
    dosesScheduled: 0,
    avgMealsPerDay: 0,
    avgHydrationPerDay: 0,
    avgSleepHours: 0,
    avgWellnessPerDay: 0,
    lunchSkipRate: 0,
    ...overrides,
  };
}

const FULL_DATA = makeData({
  daysOfData: 14,
  dosesScheduled: 50,
  adherenceRate: 92,
  avgMealsPerDay: 2.5,
  avgSleepHours: 7.5,
  avgHydrationPerDay: 5.0,
  standOutInsights: [{ id: 'p1', text: 'x', confidence: 'strong', relatedTo: 'record' }],
});

const TWO_PATTERNS = [
  {
    id: 'sleep-mood',
    title: 'Sleep & Mood',
    insight: 'Better sleep correlates with improved mood the following day.',
    confidence: 'strong' as const,
    dataPoints: 14,
    coefficient: 0.72,
    suggestion: 'If approved by your care team, you could try consistent bedtimes for a week.',
  },
  {
    id: 'hyd-energy',
    title: 'Hydration & Energy',
    insight: 'Days with higher water intake show better energy levels.',
    confidence: 'emerging' as const,
    dataPoints: 10,
    coefficient: -0.45,
    suggestion: 'Track water intake more closely when fatigue is high.',
  },
];

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(InsightsReadCard as any, props));
  });
  return root!;
}

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flatText(n: TestRenderer.ReactTestInstance): string {
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

describe('Phase 28 F3 — InsightsReadCard', () => {
  it('contract 1: eyebrow reads "THE READ · {N} DAYS"', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: [] });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).toContain('THE READ');
    expect(allText.toUpperCase()).toContain('14 DAYS');
  });

  it('contract 2: card chrome routes through JournalSection sage tint (3px accent border + accentFaint bg)', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: [] });
    const json = tree.toJSON() as any;
    const node = Array.isArray(json) ? json[0] : json;
    const style = !node?.props?.style ? {} : (Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#5fb88a');
    expect(style.backgroundColor).toBe('rgba(95, 184, 138, 0.06)');
  });

  it('contract 3: gestalt prose renders when generateOneLineGestalt returns non-empty', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: [] });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText).toMatch(/adherence/i);
    expect(allText).toMatch(/92%/);
  });

  it('contract 4: metric grid has 4 tiles in order [Adherence, Sleep, Hydration, Meals]; missing values show "—"', () => {
    // Sleep + Hydration present; Meals missing
    const partial = makeData({
      daysOfData: 14,
      dosesScheduled: 0,           // adherence unavailable → '—'
      avgSleepHours: 7.0,
      avgHydrationPerDay: 6.0,
      avgMealsPerDay: 0,           // meals unavailable → '—'
    });
    const tree = render({ timeRange: 14, pageData: partial, patterns: [] });
    const tiles = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^read-metric-\d+$/.test(n.props.testID),
    );
    expect(tiles).toHaveLength(4);
    // Order check by label
    expect(flatText(tiles[0])).toMatch(/Adherence/i);
    expect(flatText(tiles[1])).toMatch(/Sleep/i);
    expect(flatText(tiles[2])).toMatch(/Hydration/i);
    expect(flatText(tiles[3])).toMatch(/Meals/i);
    // Adherence + Meals values are '—'
    expect(flatText(tiles[0])).toContain('—');
    expect(flatText(tiles[3])).toContain('—');
    // Sleep + Hydration have numeric values
    expect(flatText(tiles[1])).toMatch(/7\.0/);
    expect(flatText(tiles[2])).toMatch(/6\.0/);
  });

  it('contract 4b: card-level "Daily averages" label renders above the metric grid + Sleep unit reads "h/night"', () => {
    // Phase 28 Batch B — averages labeling (Item 1, locked Option 3 hybrid).
    // Pre-fix the 4 tiles read ambiguously as totals: Adherence/Sleep/
    // Hydration carried no per-unit suffix; only Meals had "/day". The
    // card-level "Daily averages" label above the grid covers
    // Adherence/Hydration/Meals; Sleep gets the "h/night" suffix
    // because its denominator is tracked-nights (β special-case per
    // MEALS Commit B Lock 1), not range days.
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: [] });
    const allTextNodes = findAll(tree.root, (n) => n.type === 'Text');
    const allText = allTextNodes.map(flatText).join(' | ');
    expect(allText).toMatch(/Daily averages/i);
    // Sleep tile shows the per-night suffix.
    const sleepTile = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && n.props.testID === 'read-metric-1',
    )[0];
    expect(sleepTile).toBeDefined();
    expect(flatText(sleepTile)).toContain('h/night');
  });

  it('contract 5: pattern callout renders with N count and pattern lines', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: TWO_PATTERNS });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText).toMatch(/2\s+patterns?\s+worth discussing with a provider/i);
    // Pattern titles appear
    expect(allText).toContain('Sleep & Mood');
    expect(allText).toContain('Hydration & Energy');
    // Pattern lines exist as tappable testIDs
    const lines = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^read-pattern-\d+$/.test(n.props.testID),
    );
    expect(lines).toHaveLength(2);
  });

  it('contract 5b: pattern callout caps at 3 lines even with more input', () => {
    const fivePatterns = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      title: `Pattern ${i}`,
      insight: `Insight ${i}`,
      confidence: 'strong' as const,
      dataPoints: 14,
      coefficient: 0.5,
    }));
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: fivePatterns });
    const lines = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^read-pattern-\d+$/.test(n.props.testID),
    );
    expect(lines).toHaveLength(3);
  });

  it('contract 6: tapping a pattern line toggles the expanded body with evidence + suggestion', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: TWO_PATTERNS });
    const expandedBefore = findAll(tree.root, (n) =>
      n.props?.testID === 'read-pattern-expanded-0',
    );
    expect(expandedBefore).toHaveLength(0);
    // Tap pattern 0
    const pattern0 = findAll(tree.root, (n) => n.props?.testID === 'read-pattern-0')[0];
    act(() => { pattern0.props.onPress(); });
    const expandedAfter = findAll(tree.root, (n) =>
      n.props?.testID === 'read-pattern-expanded-0',
    );
    expect(expandedAfter).toHaveLength(1);
    const expandedText = flatText(expandedAfter[0]);
    // Suggestion text from the fixture surfaces
    expect(expandedText).toContain('consistent bedtimes');
    // Evidence framing surfaces (uses dataPoints count)
    expect(expandedText).toMatch(/14\s*days/);
  });

  it('contract 7: footnote renders inside the card', () => {
    const tree = render({ timeRange: 14, pageData: FULL_DATA, patterns: [] });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText).toMatch(/For informational purposes only.*Not a diagnosis/);
  });

  it('contract 8: returns null when card has no signal to surface', () => {
    // Below-7-day data — gestalt empty, all metrics zero, no patterns
    const empty = makeData({
      daysOfData: 5,
      dosesScheduled: 0,
      avgSleepHours: 0,
      avgHydrationPerDay: 0,
      avgMealsPerDay: 0,
    });
    const tree = render({ timeRange: 14, pageData: empty, patterns: [] });
    expect(tree.toJSON()).toBeNull();
  });
});
