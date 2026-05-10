// ============================================================================
// StatRings — behavioural test for the flat 4-up grid.
//
// v6.7 visual-consistency Phase 2 replaced the SVG progress rings with flat
// 28pt category indicator circles. Per-tile border-color + ring-color
// assertions live in statRingsFlattened.test.tsx; this file pins the
// surface-level behaviour (4 cells, label set, value format).
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles },
}));

// Phase 15.4 — StatRings now imports navigate (water ring routes to
// /log-water on tap). Mock the wrapper to keep expo-router out of
// the test runtime.
jest.mock('../../lib/navigate', () => ({
  navigate: jest.fn(),
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
      glass: '#363830',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      warning: '#e5b04a',
      coral: '#e89a7a',
      textSecondary: '#c4c1b3',
      textPrimary: '#FFFFFF',
    },
    resolvedTheme: 'dark',
  }),
}));

import React from 'react';
import { StatRings } from '../../components/now/StatRings';
import type { TodayStats } from '../../utils/nowHelpers';

const stats: TodayStats = {
  meds: { completed: 1, total: 2 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 3, total: 3 },
  meals: { completed: 3, total: 3 },
} as TodayStats;

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

  it('renders four cells (one per category)', () => {
    const columns = React.Children.toArray(tree.props.children);
    expect(columns).toHaveLength(4);
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

  it('shows "—" for an empty category (total === 0)', () => {
    const emptyStats = {
      ...stats,
      vitals: { completed: 0, total: 0 },
    } as TodayStats;
    const t: any = (StatRings as any)({ stats: emptyStats });
    expect(flattenText(t)).toContain('—');
  });
});
