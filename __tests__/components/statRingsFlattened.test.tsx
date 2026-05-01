// ============================================================================
// StatRings — visual-consistency Phase 2.
// Flat grid (no outer glass card wrap), 28pt category circles with 0.5px
// colored ring per category at 35% opacity, eyebrow labels on textSecondary.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    colors: {
      background: '#141612',
      glass: '#2a2c25',
      glassBorder: 'rgba(255, 240, 215, 0.08)',
      hairlineInset: 'rgba(255, 240, 215, 0.06)',
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      warning: '#e5b04a',
      coral: '#e89a7a',
      textPrimary: '#fff',
      textSecondary: '#c4c1b3',
      textTertiary: '#8a8a82',
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

jest.mock('react-native-svg', () => {
  const PT = (n: string) => n;
  return { __esModule: true, default: PT('Svg'), Circle: PT('SvgCircle') };
});

import { StatRings } from '../../components/now/StatRings';

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

const stats = {
  meds:     { completed: 1, total: 3 },
  vitals:   { completed: 0, total: 2 },
  wellness: { completed: 1, total: 1 },
  meals:    { completed: 2, total: 3 },
};

describe('StatRings — flattened (no outer glass card)', () => {
  it('the root container does NOT use glass / cardSurface as backgroundColor', () => {
    const tree = (StatRings as any)({ stats });
    // Walk all rendered Views; none should set backgroundColor to the
    // glass token. The grid sits directly on the page bg.
    const violators = findAll(tree, (n) => {
      if (n.type !== 'View') return false;
      const styleProp = n.props?.style;
      const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
      for (const s of styles) {
        if (s && typeof s === 'object' && s.backgroundColor === '#2a2c25') {
          return true;
        }
      }
      return false;
    });
    expect(violators.length).toBe(0);
  });

  it('the root container sets gap: 8 (flat grid)', () => {
    const tree = (StatRings as any)({ stats });
    expect(tree).not.toBeNull();
    const styleProp = tree.props.style;
    const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = Object.assign({}, ...styles.filter(Boolean));
    expect(merged.gap).toBe(8);
  });
});

describe('StatRings — neutral ring (May 1 sizing pass — Phase 3a)', () => {
  // Per-category accents were intentionally flipped to a single neutral
  // warm-cream ring. The emoji inside the tile carries category meaning;
  // the ring is just an indicator that doesn't compete with the schedule.
  const colorProbe = (testID: string) => {
    const tree = (StatRings as any)({ stats });
    const tile = findAll(tree, (n) => n.props?.testID === testID)[0];
    expect(tile).toBeDefined();
    const styleProp = tile.props.style;
    const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = Object.assign({}, ...styles.filter(Boolean));
    return merged;
  };

  const NEUTRAL = 'rgba(255, 240, 215, 0.18)';

  it('meds tile uses the neutral warm-cream ring', () => {
    expect(colorProbe('stat-tile-meds').borderColor).toBe(NEUTRAL);
  });

  it('vitals tile uses the neutral warm-cream ring', () => {
    expect(colorProbe('stat-tile-vitals').borderColor).toBe(NEUTRAL);
  });

  it('wellness tile uses the neutral warm-cream ring', () => {
    expect(colorProbe('stat-tile-wellness').borderColor).toBe(NEUTRAL);
  });

  it('meals tile uses the neutral warm-cream ring', () => {
    expect(colorProbe('stat-tile-meals').borderColor).toBe(NEUTRAL);
  });

  it('every tile sets a 0.5px border', () => {
    for (const id of ['stat-tile-meds', 'stat-tile-vitals', 'stat-tile-wellness', 'stat-tile-meals']) {
      expect(colorProbe(id).borderWidth).toBe(0.5);
    }
  });
});

describe('StatRings — eyebrow labels use textSecondary', () => {
  it('label color is textSecondary (#c4c1b3, the locked AA-clean eyebrow)', () => {
    const tree = (StatRings as any)({ stats });
    const labels = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^stat-label-/.test(n.props.testID),
    );
    expect(labels.length).toBe(4);
    for (const l of labels) {
      const styleProp = l.props.style;
      const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
      const merged = Object.assign({}, ...styles.filter(Boolean));
      expect(merged.color).toBe('#c4c1b3');
    }
  });
});
