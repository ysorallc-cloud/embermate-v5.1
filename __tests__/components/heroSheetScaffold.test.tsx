// ============================================================================
// HeroSheet — F4 foundation-scaffold contract.
//
// Pins the Design-Lock §3 figure-ground structure: a hero plane painted with
// the two-stop hero gradient, ONE faint glow, and a content sheet that rises
// OVER the hero (negative marginTop = overlap), with a grab handle, sitting on
// the sheet figure-ground tier. Guards against a refactor that flattens the
// hero/sheet split or drops the seam affordance.
// ============================================================================

import React from 'react';

const HERO1 = '#1c241e';
const HERO2 = '#161d18';
const HERO_GLOW = 'rgba(156, 207, 166, 0.10)';
const SHEET = '#19211b';
const BG = '#141a16';
const LINE = 'rgba(255,255,255,0.06)';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: BG,
      sheet: SHEET,
      heroGradientStart: HERO1,
      heroGradientEnd: HERO2,
      heroGlow: HERO_GLOW,
      glassBorder: LINE,
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

import { HeroSheet } from '../../components/common/HeroSheet';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}
function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}
function styleOf(node: any): Record<string, any> {
  const s = node?.props?.style;
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean));
  return s;
}
function textOf(node: any): string {
  const out: string[] = [];
  (function walk(n: any) {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n?.props?.children !== undefined) walk(n.props.children);
  })(node);
  return out.join('');
}

function render(props: any = {}) {
  return HeroSheet({
    hero: React.createElement('View', null, React.createElement('Text', null, 'HELLO HERO')),
    children: React.createElement('View', null, React.createElement('Text', null, 'SHEET BODY')),
    testID: 'hs',
    ...props,
  } as any) as any;
}

describe('HeroSheet — F4 hero→sheet scaffold contract', () => {
  it('hero plane is a two-stop hero gradient (not the page bg, not multi-radial)', () => {
    const tree = render();
    const grad = findAll(tree, (n) => n?.props?.testID === 'hs-hero');
    expect(grad).toHaveLength(1);
    expect(grad[0].props.colors).toEqual([HERO1, HERO2]);
  });

  it('hero carries exactly one faint glow', () => {
    const tree = render();
    const glows = findAll(tree, (n) => styleOf(n).backgroundColor === HERO_GLOW);
    expect(glows).toHaveLength(1);
  });

  it('sheet rises over the hero (negative overlap) and sits on the sheet tier', () => {
    const tree = render({ sheetOverlap: 22 });
    const sheet = findAll(tree, (n) => n?.props?.testID === 'hs-sheet');
    expect(sheet).toHaveLength(1);
    const s = styleOf(sheet[0]);
    expect(s.marginTop).toBe(-22);
    expect(s.backgroundColor).toBe(SHEET);
    expect(s.borderTopLeftRadius).toBeGreaterThan(0);
  });

  it('sheet has a grab handle (the seam affordance)', () => {
    const tree = render();
    // 36×4 pill on the line color
    const handles = findAll(tree, (n) => {
      const s = styleOf(n);
      return s.width === 36 && s.height === 4 && s.backgroundColor === LINE;
    });
    expect(handles).toHaveLength(1);
  });

  it('renders both hero and sheet content', () => {
    const all = textOf(render());
    expect(all).toContain('HELLO HERO');
    expect(all).toContain('SHEET BODY');
  });

  it('scroll={false} drops the ScrollView but keeps hero + sheet', () => {
    const tree = render({ scroll: false });
    expect(findAll(tree, (n) => n?.type === 'ScrollView')).toHaveLength(0);
    expect(findAll(tree, (n) => n?.props?.testID === 'hs-hero')).toHaveLength(1);
    expect(findAll(tree, (n) => n?.props?.testID === 'hs-sheet')).toHaveLength(1);
  });
});
