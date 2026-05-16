// ============================================================================
// Phase 28 F4 — InsightsDataCard contract.
//
// THE DATA is Section 2 of the Insights three-card restructure. It
// consolidates the pre-28 standalone Vitals dashboard + Medication
// adherence sections into a single neutral-encoded card with the
// Missing Data section DEMOTED to a single footer line at the bottom
// (replacing the verbose row-per-gap stack).
//
// Pinned contracts:
//   1. Eyebrow text "THE DATA · LAST {N} DAYS" formatted from timeRange.
//   2. Card chrome routes through JournalSection tint='neutral'.
//   3. Sub-eyebrow "VITALS" + vital tiles render when vitalTiles is
//      non-empty; both omitted otherwise.
//   4. Sub-eyebrow "MEDICATION ADHERENCE" + adherence content render
//      when adherence has a non-zero total; omitted otherwise.
//   5. Missing-data footer line renders inside a top-bordered region
//      when dataGaps non-empty; omitted otherwise. Single-gap copy
//      reads "{N} days of {metric} missing this period →"; multi-gap
//      copy summarizes count.
//   6. Card returns null when there's no signal to surface (empty
//      vitals AND no adherence AND no gaps).
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
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  textMuted: '#9aa0a6',
  surface: '#1f201c',
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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

// Sparkline ships svg — mock it as a plain View-shape so the test
// renderer doesn't have to spin up react-native-svg.
jest.mock('../../components/insights/Sparkline', () => ({
  Sparkline: () => null,
}));

import { InsightsDataCard } from '../../components/insights/InsightsDataCard';

const VITAL_TILES = [
  {
    label: 'Blood pressure',
    value: '125/82',
    unit: 'mmHg',
    trendVal: 'stable',
    trendDir: 'stable' as const,
    color: '#5fb88a',
    sparkPoints: '0,10 10,8 20,9 30,8 40,7',
  },
  {
    label: 'Heart rate',
    value: '72',
    unit: 'bpm',
    trendVal: '↓ 4',
    trendDir: 'down' as const,
    color: '#5fb88a',
    sparkPoints: '0,10 10,9 20,9 30,8 40,7',
  },
];

const ADHERENCE = {
  rate: 92,
  taken: 46,
  total: 50,
  doseStatuses: Array.from({ length: 50 }, (_, i) => i < 46 ? 'taken' : 'missed') as Array<'taken' | 'missed'>,
  missedDates: ['Apr 12', 'Apr 18'],
};

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(InsightsDataCard as any, props));
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

describe('Phase 28 F4 — InsightsDataCard', () => {
  it('contract 1: eyebrow reads "THE DATA · LAST {N} DAYS"', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: ADHERENCE,
      dataGaps: [],
    });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).toContain('THE DATA');
    expect(allText.toUpperCase()).toContain('LAST 14 DAYS');
  });

  it('contract 2: outer card chrome is JournalSection neutral (3px textTertiary border + glassFaint bg)', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: ADHERENCE,
      dataGaps: [],
    });
    const json = tree.toJSON() as any;
    const node = Array.isArray(json) ? json[0] : json;
    const style = !node?.props?.style ? {} : (Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#9aa0a6');
    expect(style.backgroundColor).toBe('rgba(255, 245, 220, 0.03)');
  });

  it('contract 3: VITALS sub-eyebrow + vital tiles render when vitalTiles non-empty', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: null,
      dataGaps: [],
    });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).toContain('VITALS');
    expect(allText).toContain('Blood pressure');
    expect(allText).toContain('Heart rate');
    const tiles = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && /^data-vital-tile-\d+$/.test(n.props.testID),
    );
    expect(tiles).toHaveLength(2);
  });

  it('contract 3b: VITALS sub-eyebrow omitted when vitalTiles is empty', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: [],
      adherence: ADHERENCE,
      dataGaps: [],
    });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).not.toContain('VITALS');
  });

  it('contract 4: MEDICATION ADHERENCE sub-eyebrow + adherence content render when total > 0', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: [],
      adherence: ADHERENCE,
      dataGaps: [],
    });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).toContain('MEDICATION ADHERENCE');
    expect(allText).toContain('92');                                     // rate
    expect(allText).toContain('46');                                     // taken
    expect(allText).toContain('50');                                     // total
  });

  it('contract 4b: MEDICATION ADHERENCE omitted when adherence is null or zero total', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: null,
      dataGaps: [],
    });
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText.toUpperCase()).not.toContain('MEDICATION ADHERENCE');
  });

  it('contract 5: single data gap renders inline footer line with metric name + days', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: ADHERENCE,
      dataGaps: [{ icon: '💧', metric: 'Hydration', daysMissing: 14, impact: 'x' }],
    });
    const footer = findAll(tree.root, (n) => n.props?.testID === 'data-card-gap-footer')[0];
    expect(footer).toBeDefined();
    const footerText = flatText(footer);
    expect(footerText).toMatch(/14 days of hydration missing this period/i);
  });

  it('contract 5b: multiple data gaps render summary footer line', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: ADHERENCE,
      dataGaps: [
        { icon: '💧', metric: 'Hydration', daysMissing: 14, impact: 'x' },
        { icon: '💤', metric: 'Sleep', daysMissing: 14, impact: 'y' },
        { icon: '🌙', metric: 'Evening wellness', daysMissing: 6, impact: 'z' },
      ],
    });
    const footer = findAll(tree.root, (n) => n.props?.testID === 'data-card-gap-footer')[0];
    expect(footer).toBeDefined();
    const footerText = flatText(footer);
    expect(footerText).toMatch(/3 metrics with gaps this period/i);
  });

  it('contract 5c: footer omitted when dataGaps is empty', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: VITAL_TILES,
      adherence: ADHERENCE,
      dataGaps: [],
    });
    const footer = findAll(tree.root, (n) => n.props?.testID === 'data-card-gap-footer');
    expect(footer).toHaveLength(0);
  });

  it('contract 6: returns null when no signal (no vitals, no adherence, no gaps)', () => {
    const tree = render({
      timeRange: 14,
      vitalTiles: [],
      adherence: null,
      dataGaps: [],
    });
    expect(tree.toJSON()).toBeNull();
  });
});
