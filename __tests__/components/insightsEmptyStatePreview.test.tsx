// ============================================================================
// InsightsEmptyStatePreview — renders both empty-state cards on the Insights
// tab when fewer than 14 days of data exist (Prompt 7 Phase 3).
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.07)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      textMuted: '#9aa0a6',
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

describe('InsightsEmptyStatePreview — visibility gating', () => {
  it('returns null when 14+ days of data exist', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 14, patientName: 'Mom' });
    expect(tree).toBeNull();
  });

  it('renders both cards when fewer than 14 days exist', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const patternsCard = findAll(tree, (n) => n.props?.testID === 'insights-patterns-coming-card')[0];
    const watchingCard = findAll(tree, (n) => n.props?.testID === 'insights-watching-card')[0];
    expect(patternsCard).toBeDefined();
    expect(watchingCard).toBeDefined();
  });
});

describe('InsightsEmptyStatePreview — Patterns coming card', () => {
  it('shows "[N] more days" with N = 14 - days', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('10 more days');
  });

  it('correctly handles day 0', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 0, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('14 more days');
  });

  it('correctly handles day 13 (1 more day)', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 13, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('1 more day');
  });

  it('eyebrow is "PATTERNS COMING"', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree)).toContain('PATTERNS COMING');
  });

  it('subtitle explains 2 weeks of tracking before patterns emerge', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree)).toContain('about 2 weeks of tracking');
  });
});

describe('InsightsEmptyStatePreview — What we\'ll be watching card', () => {
  it('eyebrow is "WHAT WE\'LL BE WATCHING FOR"', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree)).toContain("WHAT WE'LL BE WATCHING FOR");
  });

  it('uses the patient name in the subtitle', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree)).toContain("Once Mom's data is steady.");
  });

  it('falls back to generic copy when patientName is "Patient" / fallback', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Patient' });
    expect(flattenText(tree)).toContain('Once data is steady.');
    expect(flattenText(tree)).not.toContain('Patient');
  });

  it('renders four pattern preview rows in order (verbatim copy)', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const text = flattenText(tree);
    expect(text).toContain('Whether sleep quality affects her BP readings');
    expect(text).toContain('skipped doses cluster on certain days');
    expect(text).toContain('Whether hydration affects her energy');
    expect(text).toContain('Mood patterns through the week');
  });

  it('shows the correct when-tags (~2 wks, ~2 wks, ~3 wks, ~4 wks)', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const tags = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^insights-watching-when-\d$/.test(n.props.testID),
    );
    expect(tags.length).toBe(4);
    const labels = tags.map((t) => flattenText(t.props.children));
    expect(labels).toEqual(['~2 wks', '~2 wks', '~3 wks', '~4 wks']);
  });

  it('footer reassures that patterns appear as the user goes', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree)).toContain('These appear as you go.');
    expect(flattenText(tree)).toContain('No need to wait for them.');
  });
});

describe('InsightsEmptyStatePreview — framing rules', () => {
  it('does NOT use "coming soon!"', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    expect(flattenText(tree).toLowerCase()).not.toContain('coming soon!');
  });

  it('does NOT mention version numbers or quarters', () => {
    const tree = (InsightsEmptyStatePreview as any)({ daysOfData: 4, patientName: 'Mom' });
    const text = flattenText(tree).toLowerCase();
    expect(text).not.toMatch(/\bv7\b|version 7|7\.0|q1|q2|q3|q4/);
  });
});
