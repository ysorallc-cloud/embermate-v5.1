// ============================================================================
// AdherenceRing — geometry contract (Insights signature object).
//
// The ring's proportions ARE the signature (Design-Lock §4). This pins the
// exact SVG geometry from embermate-insights-hero and the dashoffset math so
// a future refactor can't silently drift the arc: 148 box, r=60, stroke 9,
// C = 2π·60, progress dashoffset = C·(1−pct), sage arc on a faint track.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#9ccfa6',
      hairlineInset: 'rgba(255,255,255,0.06)',
      textPrimary: '#fff',
      textSecondary: '#949e94',
      textTertiary: '#5e685f',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-svg', () => {
  const PT = (n: string) => n;
  return { __esModule: true, default: PT('Svg'), Circle: PT('Circle') };
});

import {
  AdherenceRing,
  RING_SIZE,
  RING_RADIUS,
  RING_STROKE,
  RING_CIRCUMFERENCE,
} from '../../components/insights/AdherenceRing';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) return kids.flatMap(flattenChildren);
  return [kids];
}
function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) out.push(...findAll(k, predicate));
  return out;
}
function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const circles = (tree: any) => findAll(tree, (n) => n.type === 'Circle');

describe('AdherenceRing — geometry constants (exact to the mockup SVG)', () => {
  it('pins the box, radius, stroke, and derived circumference', () => {
    expect(RING_SIZE).toBe(148);
    expect(RING_RADIUS).toBe(60);
    expect(RING_STROKE).toBe(9);
    expect(RING_CIRCUMFERENCE).toBeCloseTo(376.99, 1);
  });

  it('renders a track circle + a progress circle, both r=60 stroke=9 centered at 74', () => {
    const tree = (AdherenceRing as any)({ pct: 94 });
    const cs = circles(tree);
    expect(cs.length).toBe(2);
    for (const c of cs) {
      expect(c.props.r).toBe(60);
      expect(c.props.strokeWidth).toBe(9);
      expect(c.props.cx).toBe(74);
      expect(c.props.cy).toBe(74);
      expect(c.props.fill).toBe('none');
    }
  });
});

describe('AdherenceRing — progress arc math + colors', () => {
  const progress = (tree: any) =>
    circles(tree).find((c) => c.props.strokeLinecap === 'round');

  it('sage arc on a faint track', () => {
    const tree = (AdherenceRing as any)({ pct: 94 });
    const cs = circles(tree);
    const track = cs.find((c) => c.props.strokeLinecap !== 'round');
    const prog = progress(tree);
    expect(track.props.stroke).toBe('rgba(255,255,255,0.06)');
    expect(prog.props.stroke).toBe('#9ccfa6');
  });

  it('progress uses round cap + rotate(-90 74 74) so it starts at 12 o’clock clockwise', () => {
    const prog = progress((AdherenceRing as any)({ pct: 94 }));
    expect(prog.props.strokeLinecap).toBe('round');
    expect(prog.props.transform).toBe('rotate(-90 74 74)');
    expect(prog.props.strokeDasharray).toBeCloseTo(376.99, 1);
  });

  it('dashoffset = C·(1−pct): 94% ≈ 22.6, 100% = 0, 0% = full C', () => {
    const at = (pct: number) => progress((AdherenceRing as any)({ pct })).props.strokeDashoffset;
    expect(at(94)).toBeCloseTo(RING_CIRCUMFERENCE * 0.06, 1);
    expect(at(100)).toBeCloseTo(0, 5);
    expect(at(0)).toBeCloseTo(RING_CIRCUMFERENCE, 5);
  });

  it('clamps out-of-range pct and rounds the centered %', () => {
    expect(flattenText((AdherenceRing as any)({ pct: 140 }))).toContain('100%');
    expect(flattenText((AdherenceRing as any)({ pct: -5 }))).toContain('0%');
    expect(flattenText((AdherenceRing as any)({ pct: 93.6 }))).toContain('94%');
  });
});

describe('AdherenceRing — centered labels', () => {
  it('renders the % + ADHERENCE label + optional window label', () => {
    const text = flattenText((AdherenceRing as any)({ pct: 94, windowLabel: 'PAST 14 DAYS' }));
    expect(text).toContain('94%');
    expect(text).toContain('ADHERENCE');
    expect(text).toContain('PAST 14 DAYS');
  });
});
