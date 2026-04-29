// ============================================================================
// StatRings — four SVG progress rings (meds / vitals / wellness / meals)
// Behavioral test: renders the component and inspects the returned React tree.
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: any) => styles },
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Circle: 'Circle',
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useMemo: (fn: () => any) => fn(),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#111111',
      accent: '#5fb88a',
      textMuted: 'rgba(255, 255, 255, 0.48)',
      textPrimary: '#FFFFFF',
    },
    resolvedTheme: 'dark',
  }),
}));

import React from 'react';
import { StatRings } from '../../components/now/StatRings';
import type { TodayStats } from '../../utils/nowHelpers';

const RING_RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const stats: TodayStats = {
  meds: { completed: 1, total: 2 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 3, total: 3 },
  meals: { completed: 3, total: 3 },
} as TodayStats;

// Walk a React element subtree and collect every element whose `type` matches.
// Works on the lazy/raw element tree returned when we invoke the component as
// a plain function (no renderer needed).
function findAll(node: any, predicate: (el: any) => boolean, out: any[] = []): any[] {
  if (node == null || node === false) return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  if (node.type !== undefined && predicate(node)) out.push(node);
  if (node.props && node.props.children !== undefined) {
    findAll(node.props.children, predicate, out);
  }
  return out;
}

function flattenText(children: any): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (typeof children === 'object' && children.props) return flattenText(children.props.children);
  return '';
}

describe('StatRings', () => {
  const tree: any = (StatRings as any)({ stats });

  it('renders a single non-null root container', () => {
    expect(tree).not.toBeNull();
    expect(tree.type).toBe('View');
  });

  it('renders four ring cells (one per category)', () => {
    const columns = React.Children.toArray(tree.props.children);
    expect(columns).toHaveLength(4);
  });

  it('each cell renders an SVG containing Circle children', () => {
    const svgs = findAll(tree, (el) => el.type === 'Svg');
    expect(svgs).toHaveLength(4);
    for (const svg of svgs) {
      const circles = findAll(svg, (el) => el.type === 'Circle');
      // Each ring renders at least the background track (1 circle); rings with
      // total > 0 add a progress arc (2 circles total).
      expect(circles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('meds ring (1/2) has strokeDashoffset ≈ CIRCUMFERENCE / 2', () => {
    // Per-cell SVG → progress Circle is the one carrying strokeDashoffset.
    const svgs = findAll(tree, (el) => el.type === 'Svg');
    const medsCircles = findAll(svgs[0], (el) => el.type === 'Circle');
    const progress = medsCircles.find((c) => c.props.strokeDashoffset !== undefined);
    expect(progress).toBeTruthy();
    expect(Math.abs(progress.props.strokeDashoffset - CIRCUMFERENCE / 2)).toBeLessThan(0.01);
  });

  it('vitals / wellness / meals rings (fully complete) have strokeDashoffset 0', () => {
    const svgs = findAll(tree, (el) => el.type === 'Svg');
    for (const idx of [1, 2, 3]) {
      const circles = findAll(svgs[idx], (el) => el.type === 'Circle');
      const progress = circles.find((c) => c.props.strokeDashoffset !== undefined);
      expect(progress).toBeTruthy();
      expect(progress.props.strokeDashoffset).toBe(0);
    }
  });

  it('renders labels MEDS, VITALS, WELLNESS, MEALS', () => {
    const text = flattenText(tree);
    expect(text).toContain('MEDS');
    expect(text).toContain('VITALS');
    expect(text).toContain('WELLNESS');
    expect(text).toContain('MEALS');
  });

  it('value text uses "N of N" format', () => {
    const text = flattenText(tree);
    expect(text).toContain('1 of 2'); // meds
    expect(text).toContain('1 of 1'); // vitals
    expect(text).toContain('3 of 3'); // wellness + meals
  });
});
