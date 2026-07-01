// ============================================================================
// InsightsHero — branch render: ring+read (ready) vs calm hero (pre-data).
//
// Guards the empty-ring decision at the composition layer: when readiness is
// not ready, the ring must NOT render — the hero stays calm (title + subtitle)
// and the honest pre-data state lives in the sheet (InsightsEmptyStatePreview).
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

const colors = {
  accent: '#9ccfa6',
  coral: '#e89a7a',
  hairlineInset: 'rgba(255,255,255,0.06)',
  textPrimary: '#fff',
  textSecondary: '#949e94',
  textTertiary: '#5e685f',
};
jest.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ colors }) }));

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

import { InsightsHero } from '../../components/insights/InsightsHero';
import { getRingReadiness } from '../../utils/insightsHero';

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
const byTestID = (tree: any, id: string) => findAll(tree, (n) => n.props?.testID === id);

const ADH = { rate: 94, taken: 40, total: 43, windowDays: 14 };

describe('InsightsHero — ready (enough logged history)', () => {
  const tree = (InsightsHero as any)({
    title: 'Insights',
    subtitle: 'A calm read on the fortnight',
    readiness: getRingReadiness({ daysLogged: 12 }, { total: 43 }),
    adherence: ADH,
  });

  it('renders the adherence ring + read-line, NOT the pre-data state', () => {
    expect(byTestID(tree, 'insights-adherence-ring').length).toBe(1);
    expect(byTestID(tree, 'insights-read-line').length).toBe(1);
    expect(byTestID(tree, 'insights-patterns-coming').length).toBe(0);
  });

  it('ring shows the canonical rate + window; read shows the coral missed count', () => {
    // Shallow render: assert on the child element props (children aren't invoked).
    const ring = byTestID(tree, 'insights-adherence-ring')[0];
    expect(ring.props.pct).toBe(94);
    expect(ring.props.windowLabel).toBe('PAST 14 DAYS');
    const read = byTestID(tree, 'insights-read-line')[0];
    const coral = read.props.segments.find((s: any) => s.tone === 'coral');
    expect(coral.text).toBe('3 doses missed');
  });

  it('renders the title', () => {
    expect(flattenText(tree)).toContain('Insights');
  });
});

describe('InsightsHero — pre-data (thin history) → NO ring', () => {
  const tree = (InsightsHero as any)({
    title: 'Insights',
    subtitle: 'Building the picture',
    readiness: getRingReadiness({ daysLogged: 2 }, { total: 6 }),
    adherence: { rate: 0, taken: 0, total: 6, windowDays: 14 },
  });

  it('renders NO ring and NO read-line — the empty-ring decision', () => {
    expect(byTestID(tree, 'insights-adherence-ring').length).toBe(0);
    expect(byTestID(tree, 'insights-read-line').length).toBe(0);
  });

  it('keeps the hero calm — title + subtitle still render', () => {
    expect(flattenText(tree)).toContain('Insights');
    expect(flattenText(tree)).toContain('Building the picture');
  });
});
