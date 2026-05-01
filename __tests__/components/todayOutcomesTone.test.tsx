// ============================================================================
// TodayOutcomes — caregiver-warm row labels (Phase 4 of the tone pass).
// "missed" → "not logged", "pending" → "still to do", "logged" stays.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830',
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
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const mixed: DailyOutcomes = {
  logged: { count: 3, summary: '2 meds, 1 meal' },
  missed: { count: 2, names: ['Acetaminophen', 'Amlodipine'] },
  pending: { count: 1, names: ['Evening wellness check'] },
};

describe('TodayOutcomes — warm row labels', () => {
  it('the not-logged row uses "not logged" (not "missed")', () => {
    const tree = TodayOutcomes({ outcomes: mixed });
    const text = flattenText(tree);
    expect(text).toContain('not logged');
    expect(text).not.toMatch(/\bmissed\b/);
  });

  it('the still-to-do row uses "still to do" (not "pending")', () => {
    const tree = TodayOutcomes({ outcomes: mixed });
    const text = flattenText(tree);
    expect(text).toContain('still to do');
    expect(text).not.toMatch(/\bpending\b/);
  });

  it('the logged row label stays as "logged" (already neutral)', () => {
    const tree = TodayOutcomes({ outcomes: mixed });
    const text = flattenText(tree);
    expect(text).toContain('logged');
  });

  it('accessibility labels match the visible warm copy', () => {
    const tree = TodayOutcomes({ outcomes: mixed });
    const labels = findAll(tree, (n) =>
      typeof n.props?.accessibilityLabel === 'string',
    ).map((n) => n.props.accessibilityLabel);
    const joined = labels.join(' | ');
    expect(joined).toMatch(/not logged/);
    expect(joined).toMatch(/still to do/);
    expect(joined).toMatch(/logged/);
    expect(joined).not.toMatch(/\bmissed\b/);
    expect(joined).not.toMatch(/\bpending\b/);
  });
});

describe('TodayOutcomes — colour semantics unchanged by the copy update', () => {
  function rowFor(tree: any, label: string): any {
    return findAll(tree, (n) =>
      typeof n.props?.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.includes(label),
    )[0];
  }

  it('not-logged row still uses error (red) on the count', () => {
    const tree = TodayOutcomes({ outcomes: mixed });
    const row = rowFor(tree, 'not logged');
    expect(row).toBeDefined();
    const counts = findAll(row, (n) => {
      const s = Object.assign({}, ...(Array.isArray(n.props?.style) ? n.props.style : [n.props?.style || {}]));
      return s.color === '#e6776e';
    });
    expect(counts.length).toBeGreaterThan(0);
  });
});
