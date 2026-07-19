// ============================================================================
// MealsNarrative — meal note/description surfacing (Bug 2).
//
// A meal logged WITH a note ("ate half the eggs") showed only "All meals logged
// today." with no context. careSummaryBuilder now carries MealsDetail.description
// (from the meals log); this pins that the narrative RENDERS it — in both the
// all-completed summary and the per-meal (partial) branch.
// ============================================================================

import React from 'react';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#fff', textSecondary: '#c4c1b3', amber: '#e5b04a',
      glassHover: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.08)',
    },
  }),
}));
jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return { View: PT('View'), Text: PT('Text'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s } };
});

import { MealsNarrative } from '../../components/journal/MealsNarrative';

function textOf(node: any): string {
  const out: string[] = [];
  (function walk(n: any) {
    if (n == null || n === false) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n?.props?.children !== undefined) walk(n.props.children);
  })(node);
  return out.join('');
}

const future = new Date(Date.now() + 3 * 3600000).toISOString();

describe('MealsNarrative — meal note surfacing', () => {
  it('shows the note in the all-completed summary', () => {
    const meals: MealsDetail = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'completed', description: 'ate half the eggs' },
        { name: 'Lunch', status: 'completed' },
      ],
    };
    const text = textOf(MealsNarrative({ meals, bare: true } as any));
    expect(text).toContain('All meals logged');
    expect(text).toContain('ate half the eggs'); // RED before fix: dropped
  });

  it('shows the note on the per-meal (partial) row', () => {
    const meals: MealsDetail = {
      total: 2,
      meals: [
        { name: 'Breakfast', status: 'completed', description: 'only cereal, no appetite' },
        { name: 'Lunch', status: 'pending', scheduledTime: future },
      ],
    };
    const text = textOf(MealsNarrative({ meals, bare: true } as any));
    expect(text).toContain('Breakfast');
    expect(text).toContain('only cereal, no appetite');
  });

  it('no note → clean copy, no trailing separator', () => {
    const meals: MealsDetail = {
      total: 1,
      meals: [{ name: 'Breakfast', status: 'completed' }],
    };
    const text = textOf(MealsNarrative({ meals, bare: true } as any));
    expect(text).toContain('Breakfast');
    expect(text).not.toContain(':');   // no dangling "Breakfast: " when no note
    expect(text).not.toContain(' — ');
  });
});
