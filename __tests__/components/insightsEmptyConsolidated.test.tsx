// ============================================================================
// Insights empty state — visual-consistency Phase 4.
// Two cards only: a single consolidated card (Patterns coming + What we'll be
// watching merged with a hairline divider) and a small "Start logging from
// Now" tip card. The legacy "No data yet" / "Building your picture" banners
// are gone.
// ============================================================================

import React from 'react';

const themeColors = {
  background: '#141612',
  glass: '#2a2c25',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  accent: '#5fb88a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textMuted: '#9aa0a6',
};

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { InsightsEmptyStatePreview } from '../../components/understand/InsightsEmptyStatePreview';

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

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (typeof children === 'object') {
    let acc = '';
    if (typeof children.type === 'function') {
      try { acc += flattenText(children.type(children.props || {})); } catch (_) { /* swallow */ }
    }
    if (children.props?.children !== undefined) acc += flattenText(children.props.children);
    return acc;
  }
  return '';
}

describe('InsightsEmptyStatePreview — consolidated structure', () => {
  it('renders exactly 2 cards: consolidated patterns + tip', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 0, patientName: 'Mom' });
    const consolidated = findAll(tree, (n) => n.props?.testID === 'insights-consolidated-card')[0];
    const tip = findAll(tree, (n) => n.props?.testID === 'insights-tip-card')[0];
    expect(consolidated).toBeDefined();
    expect(tip).toBeDefined();
    // No leftover separate "Patterns coming" card and "What we'll be watching" card.
    const patternsCard = findAll(tree, (n) => n.props?.testID === 'insights-patterns-coming-card')[0];
    const watchingCard = findAll(tree, (n) => n.props?.testID === 'insights-watching-card')[0];
    expect(patternsCard).toBeUndefined();
    expect(watchingCard).toBeUndefined();
  });

  it('does NOT include the legacy "No data yet" copy anywhere', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 0, patientName: 'Mom' });
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toContain('no data yet');
  });

  it('consolidated card contains all 4 watch-for rows', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const tags = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^insights-watching-when-\d$/.test(n.props.testID),
    );
    expect(tags.length).toBe(4);
  });

  it('consolidated card shows the patterns-coming countdown line', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('10 more days');
  });

  it('consolidated card shows the watching subtitle with patient name', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain("Once Mom's data is steady.");
  });

  it('returns null when 14+ days of data exist (real Insights takes over)', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 14, patientName: 'Mom' });
    expect(tree).toBeNull();
  });
});

describe('InsightsEmptyStatePreview — tip card', () => {
  it('tip card surfaces "Start logging from Now"', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 0, patientName: 'Mom' });
    const tip = findAll(tree, (n) => n.props?.testID === 'insights-tip-card')[0];
    expect(tip).toBeDefined();
    const text = flattenText(tip);
    expect(text).toContain('Start logging from Now');
    expect(text.toLowerCase()).toContain('meds, vitals, or mood');
  });

  it('tip card has a border and no fill (per spec — redirect, not placeholder)', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 0, patientName: 'Mom' });
    const tip = findAll(tree, (n) => n.props?.testID === 'insights-tip-card')[0];
    const styleProp = tip.props.style;
    const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = Object.assign({}, ...styles.filter(Boolean));
    expect(merged.borderWidth).toBeGreaterThan(0);
    // No fill — backgroundColor should be transparent / absent.
    const bg = merged.backgroundColor;
    expect(bg === undefined || bg === 'transparent').toBe(true);
  });
});
