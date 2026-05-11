// ============================================================================
// Phase 15.9 — PatternStack: collapse the EmberMate noticed pattern stack.
//
// Pre-15.9 the Insights screen rendered the "EmberMate noticed"
// section as three inline cards (built directly in understand.tsx,
// not the shared InsightCard component) stacked vertically with
// per-card expand/collapse driven by an expandedCorrelation
// useState. The stack dominated vertical real estate even when
// the user wasn't engaged with the patterns.
//
// 15.9 wraps the stack in a single outer collapse. When collapsed
// (default on mount) PatternStack renders a tappable summary
// header — "EmberMate noticed" eyebrow, "{N} patterns worth
// mentioning" line, dimension chips derived from each pattern's
// title, and a chevron. When expanded it renders the same header
// plus the three inner cards, each of which keeps its existing
// per-card expand behavior.
//
// Pinned contracts:
//   1. Collapsed default: summary header renders with count line
//      and dimension chips; inner Evidence/Recommendation bodies
//      are NOT in the tree.
//   2. Tap header → expands. Inner card content reaches the tree.
//   3. Tap header again → collapses. Inner content gone again.
//   4. Empty patterns → renders nothing (null) — preserves the
//      pre-15.9 short-circuit behavior.
//   5. Dimension chips are derived from the pattern titles via
//      the existing keyword set (Sleep / Mood / Meals / BP / Meds
//      / Water). No `dimension` field exists on CorrelationCard —
//      a parallel source would drift from the inner pill labels.
//   6. Fresh mount = collapsed: re-mounting the component returns
//      to the default collapsed state. Pin so a future "remember
//      across navigation" change has to come with intent.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  surface: '#2c2e27',
  surfaceHighlight: 'rgba(95,184,138,0.08)',
  glass: '#363830',
  glassBorder: 'rgba(255,240,215,0.08)',
  hairlineInset: 'rgba(255,240,215,0.06)',
  accent: '#5fb88a',
  accentBorder: 'rgba(95,184,138,0.35)',
  redBright: '#ef4444',
  amberBright: '#f59e0b',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  const Animated = {
    Value: class { _v: number; constructor(v: number) { this._v = v; } interpolate() { return '0deg'; } },
    timing: () => ({ start: () => {} }),
    Text: PT('AnimatedText'),
    View: PT('AnimatedView'),
  };
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Animated,
  };
});

import { PatternStack } from '../PatternStack';
import type { CorrelationCard } from '../../../utils/understandInsights';

const samplePatterns: CorrelationCard[] = [
  {
    id: 'p1',
    title: 'Sleep quality tracks evening hydration',
    insight: 'Glasses of water after 5pm correlated with sleep score.',
    confidence: 'strong',
    dataPoints: 12,
    coefficient: 0.81,
    suggestion: 'Keep evening water above 2 glasses.',
  },
  {
    id: 'p2',
    title: 'Mood dips on low-meal days',
    insight: 'Energy ratings dropped when meals logged < 2.',
    confidence: 'emerging',
    dataPoints: 9,
    coefficient: 0.6,
    suggestion: 'Aim for 3 meals/day this week.',
  },
  {
    id: 'p3',
    title: 'BP elevated on medication-missed days',
    insight: 'Systolic readings ran higher after skipped doses.',
    confidence: 'strong',
    dataPoints: 14,
    coefficient: 0.74,
    suggestion: 'Reinforce evening reminder.',
  },
];

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

function render(props: { patterns: CorrelationCard[] }): TestRenderer.ReactTestRenderer {
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PatternStack, props));
  });
  return renderer!;
}

function tapHeader(tree: TestRenderer.ReactTestRenderer): void {
  const header = findAll(tree.root, (n: any) =>
    n.props?.testID === 'pattern-stack-header',
  )[0];
  expect(header).toBeDefined();
  act(() => {
    header.props.onPress();
  });
}

describe('Phase 15.9 — PatternStack', () => {
  describe('contract 1: collapsed default — summary header only', () => {
    it('renders the "EmberMate noticed" eyebrow', () => {
      // Phase 15.12 — eyebrow swept onto SectionEyebrow, which
      // uppercases text at the render layer. Match
      // case-insensitively so the contract survives both spellings.
      const tree = render({ patterns: samplePatterns });
      const text = flattenText(tree.toJSON());
      expect(text.toLowerCase()).toContain('embermate noticed');
    });

    it('renders "{N} patterns worth mentioning" with N from the array length', () => {
      const tree = render({ patterns: samplePatterns });
      const text = flattenText(tree.toJSON());
      expect(text).toContain('3 patterns worth mentioning');
    });

    it('uses singular "1 pattern worth mentioning" when only one pattern', () => {
      const tree = render({ patterns: [samplePatterns[0]] });
      const text = flattenText(tree.toJSON());
      expect(text).toContain('1 pattern worth mentioning');
      expect(text).not.toContain('1 patterns');
    });

    it('renders dimension chips derived from titles (Sleep / Water / Mood / Meals / BP / Meds)', () => {
      const tree = render({ patterns: samplePatterns });
      const text = flattenText(tree.toJSON());
      // sample[0] title: "Sleep quality tracks evening hydration"
      //   → Sleep + Water
      // sample[1] title: "Mood dips on low-meal days"
      //   → Mood + Meals
      // sample[2] title: "BP elevated on medication-missed days"
      //   → BP + Meds
      expect(text).toContain('Sleep');
      expect(text).toContain('Water');
      expect(text).toContain('Mood');
      expect(text).toContain('Meals');
      expect(text).toContain('BP');
      expect(text).toContain('Meds');
    });

    it('does NOT render inner Evidence/Recommendation content when collapsed', () => {
      const tree = render({ patterns: samplePatterns });
      const text = flattenText(tree.toJSON());
      expect(text).not.toContain('Evidence');
      expect(text).not.toContain('Based on 12 days');
      expect(text).not.toContain('Keep evening water above 2 glasses');
    });
  });

  describe('contract 2: tap header → expand', () => {
    it('reveals the sublabel + the three inner card titles after tap', () => {
      const tree = render({ patterns: samplePatterns });
      tapHeader(tree);
      const text = flattenText(tree.toJSON());
      expect(text).toContain('Patterns worth mentioning at the next appointment');
      expect(text).toContain('Sleep quality tracks evening hydration');
      expect(text).toContain('Mood dips on low-meal days');
      expect(text).toContain('BP elevated on medication-missed days');
    });

    it('the first inner card is expanded by default after the outer expand', () => {
      // Preserves the pre-15.9 initial state where expandedCorrelation
      // was useState(0) — first card pre-open when the section came
      // into view. Now that the section starts collapsed, the same
      // initial selection applies the moment the user expands.
      const tree = render({ patterns: samplePatterns });
      tapHeader(tree);
      const text = flattenText(tree.toJSON());
      // sample[0]'s Recommendation copy + dataPoints line should be in
      // the tree because card #0 is the default-open inner card.
      expect(text).toContain('Based on 12 days of tracking data');
      expect(text).toContain('Keep evening water above 2 glasses');
    });
  });

  describe('contract 3: tap header again → collapse back', () => {
    it('removes the inner card titles + sublabel from the tree', () => {
      const tree = render({ patterns: samplePatterns });
      tapHeader(tree);
      tapHeader(tree);
      const text = flattenText(tree.toJSON());
      expect(text).not.toContain('Patterns worth mentioning at the next appointment');
      expect(text).not.toContain('Sleep quality tracks evening hydration');
      expect(text).not.toContain('Based on 12 days');
    });
  });

  describe('contract 4: empty patterns → renders nothing', () => {
    it('returns null when patterns array is empty', () => {
      const tree = render({ patterns: [] });
      expect(tree.toJSON()).toBeNull();
    });
  });

  describe('contract 5: chip labels match the inner pill keyword set (single derivation source)', () => {
    it('"hydration" keyword in title maps to the "Water" label (not "Hydration")', () => {
      // Pinned because the user spec example said "Sleep · Hydration ·
      // Mood" but the existing keyword matcher in understand.tsx
      // produces "Water" for hydration-themed titles (matches the
      // inner-card metric-pill labels). Single source of truth — chip
      // labels MUST match what the inner cards would show, otherwise
      // outer and inner copy can drift.
      const tree = render({ patterns: [{
        id: 'h-only',
        title: 'Hydration patterns this week',
        insight: 'Lower water on weekends.',
        confidence: 'emerging',
        dataPoints: 7,
        coefficient: 0.5,
      } as CorrelationCard] });
      const text = flattenText(tree.toJSON());
      expect(text).toContain('Water');
      expect(text).not.toMatch(/\bHydration\b(?! patterns)/);
    });

    it('chips are de-duplicated across the union of all pattern titles', () => {
      // Two patterns both mentioning "sleep" should produce ONE "Sleep"
      // chip, not two. The collapsed header summarizes the stack,
      // not each card.
      const tree = render({ patterns: [
        { id: 'a', title: 'Sleep quality this week', insight: '', confidence: 'emerging', dataPoints: 5, coefficient: 0.5 } as CorrelationCard,
        { id: 'b', title: 'Sleep on low-water days', insight: '', confidence: 'emerging', dataPoints: 5, coefficient: 0.5 } as CorrelationCard,
      ] });
      const text = flattenText(tree.toJSON());
      const sleepCount = (text.match(/\bSleep\b/g) || []).length;
      expect(sleepCount).toBe(1);
    });
  });

  describe('contract 6: fresh mount returns to collapsed default', () => {
    it('a re-mounted PatternStack does not remember a previous expand', () => {
      // The user's spec watch-for: "session-scoped state, not
      // persistent." Mount, expand, unmount, mount again — second
      // mount should be back to collapsed.
      const treeA = render({ patterns: samplePatterns });
      tapHeader(treeA);
      const textA = flattenText(treeA.toJSON());
      expect(textA).toContain('Sleep quality tracks evening hydration');
      treeA.unmount();

      const treeB = render({ patterns: samplePatterns });
      const textB = flattenText(treeB.toJSON());
      // Inner card titles only render when expanded — their absence
      // confirms the fresh mount is collapsed.
      expect(textB).not.toContain('Sleep quality tracks evening hydration');
      expect(textB).toContain('3 patterns worth mentioning');
    });
  });
});
