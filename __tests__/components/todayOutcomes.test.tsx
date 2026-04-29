// ============================================================================
// TodayOutcomes — three-row card answering "what happened today".
// Replaces the old stats grid + Heads up section on the Journal tab.
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
      glassBorder: 'rgba(255,255,255,0.06)',
      error: '#e6776e',
      warning: '#e5b04a',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
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

import { TodayOutcomes } from '../../components/journal/TodayOutcomes';
import type { DailyOutcomes } from '../../utils/text/types';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const empty: DailyOutcomes = {
  logged: { count: 0 },
  missed: { count: 0, names: [] },
  pending: { count: 0, names: [] },
};

describe('TodayOutcomes — empty state', () => {
  it('renders the empty-state line when all counts are zero', () => {
    const tree = TodayOutcomes({ outcomes: empty });
    expect(flattenText(tree)).toContain('Nothing logged yet today');
  });

  it('does NOT render row labels when empty', () => {
    const tree = TodayOutcomes({ outcomes: empty });
    const text = flattenText(tree);
    // The empty-state line contains the word "logged" — but the row labels
    // would never appear without a count. Verify no row containers exist.
    expect(text).not.toMatch(/\bmissed\b|\bpending\b/);
    // A row would also produce an accessibilityLabel like "0 missed: …";
    // check the tree doesn't carry any.
    const rowLabels = findAll(tree, (n) =>
      typeof n.props?.accessibilityLabel === 'string' &&
      /\d+ (missed|pending|logged):/.test(n.props.accessibilityLabel),
    );
    expect(rowLabels).toEqual([]);
  });
});

describe('TodayOutcomes — row gating', () => {
  it('renders only the not-logged row when other counts are zero', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('not logged');
    expect(text).not.toContain('still to do');
  });

  it('renders only the still-to-do row when other counts are zero', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 0, names: [] },
        pending: { count: 2, names: ['Evening meds', 'BP check'] },
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('still to do');
    expect(text).not.toContain('not logged');
  });

  it('renders only the logged row when other counts are zero', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 4, summary: '3 meals, 1 morning check-in' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('logged');
    expect(text).toContain('3 meals, 1 morning check-in');
    expect(text).not.toContain('not logged');
    expect(text).not.toContain('still to do');
  });

  it('renders all three rows when all counts are non-zero', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 3, summary: '2 meds, 1 meal' },
        missed: { count: 1, names: ['Amlodipine'] },
        pending: { count: 2, names: ['Evening meds', 'BP check'] },
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('not logged');
    expect(text).toContain('still to do');
    expect(text).toContain('logged');
  });
});

describe('TodayOutcomes — detail lines', () => {
  it('missed row lists names comma-separated', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
      },
    });
    expect(flattenText(tree)).toContain('Acetaminophen, Amlodipine');
  });

  it('pending row lists names comma-separated', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 0, names: [] },
        pending: { count: 2, names: ['Evening meds', 'BP check'] },
      },
    });
    expect(flattenText(tree)).toContain('Evening meds, BP check');
  });

  it('logged row uses the categorical summary, not enumerated names', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 4, summary: '3 meals, 1 morning check-in' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
    });
    const text = flattenText(tree);
    expect(text).toContain('3 meals, 1 morning check-in');
  });
});

describe('TodayOutcomes — accessibility labels', () => {
  it('not-logged row label includes count + names (warm tone)', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
        pending: { count: 0, names: [] },
      },
    });
    const labelled = findAll(tree, (n) => n.props?.accessibilityLabel?.includes('not logged'));
    expect(labelled.length).toBeGreaterThan(0);
    expect(labelled[0].props.accessibilityLabel).toBe('2 not logged: Acetaminophen, Amlodipine');
  });

  it('still-to-do row label includes count + names (warm tone)', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 0 },
        missed: { count: 0, names: [] },
        pending: { count: 1, names: ['Evening wellness check'] },
      },
    });
    const labelled = findAll(tree, (n) => n.props?.accessibilityLabel?.includes('still to do'));
    expect(labelled[0].props.accessibilityLabel).toBe('1 still to do: Evening wellness check');
  });

  it('logged row label includes count + summary', () => {
    const tree = TodayOutcomes({
      outcomes: {
        logged: { count: 4, summary: '3 meals, 1 morning check-in' },
        missed: { count: 0, names: [] },
        pending: { count: 0, names: [] },
      },
    });
    const labelled = findAll(tree, (n) => n.props?.accessibilityLabel?.includes('logged'));
    expect(labelled[0].props.accessibilityLabel).toBe('4 logged: 3 meals, 1 morning check-in');
  });
});
