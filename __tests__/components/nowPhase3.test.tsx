// ============================================================================
// Now tab — May 1 sizing pass Phase 3.
//
// 3a — Stat tile rings: all 4 use the same neutral border colour. No
//      category accent (sage / lavender / amber / coral) on the ring.
// 3b — Schedule active row: no card-in-card fill. Active row's outer View
//      does NOT set backgroundColor; the Start affordance is a text-link,
//      not a filled button. Active and inactive paddingVertical match.
// ============================================================================

import React from 'react';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  accent: '#5fb88a',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
  caregiverAccent: '#aa8adc',
  warning: '#e5b04a',
  criticalAlert: '#e6776e',
  coral: '#e89a7a',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textHalf: 'rgba(255, 255, 255, 0.42)',
  textMuted: '#9aa0a6',
};

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-svg', () => {
  const PT = (n: string) => n;
  return { __esModule: true, default: PT('Svg'), Circle: PT('SvgCircle') };
});

// Phase 15.4 — StatRings now imports navigate (water ring routes to
// /log-water on tap). Mock the wrapper to keep expo-router out of
// the test runtime.
jest.mock('../../lib/navigate', () => ({
  navigate: jest.fn(),
}));

import { StatRings } from '../../components/now/StatRings';
import { ScheduleCard } from '../../components/now/ScheduleCard';

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

const styleOf = (node: any) => {
  const styleProp = node.props.style;
  const styles = Array.isArray(styleProp) ? styleProp : [styleProp];
  return Object.assign({}, ...styles.filter(Boolean));
};

const stats = {
  meds:     { completed: 1, total: 3 },
  vitals:   { completed: 0, total: 2 },
  wellness: { completed: 1, total: 1 },
  meals:    { completed: 2, total: 3 },
};

// ── 3a — Stat tile rings ────────────────────────────────────────────────
describe('StatRings — neutral rings (no per-category accent)', () => {
  it('all 4 ring borders use the same color value', () => {
    const tree = (StatRings as any)({ stats });
    const tiles = ['meds', 'vitals', 'wellness', 'meals'].map((k) =>
      findAll(tree, (n) => n.props?.testID === `stat-tile-${k}`)[0],
    );
    expect(tiles.length).toBe(4);
    const colors = tiles.map((t) => styleOf(t).borderColor);
    const unique = new Set(colors);
    expect(unique.size).toBe(1);
  });

  it('no ring uses any category-accent token', () => {
    const tree = (StatRings as any)({ stats });
    const tiles = ['meds', 'vitals', 'wellness', 'meals'].map((k) =>
      findAll(tree, (n) => n.props?.testID === `stat-tile-${k}`)[0],
    );
    const banned = [
      themeColors.accent,         // sage
      themeColors.caregiverAccent, // lavender
      themeColors.warning,         // amber
      themeColors.criticalAlert,   // sage red
      themeColors.coral,           // coral
    ];
    for (const tile of tiles) {
      const bg = styleOf(tile).borderColor || '';
      for (const b of banned) {
        // Reject both #hex and rgb(a)( r, g, b ) form variants.
        expect(bg.toLowerCase()).not.toContain(b.replace('#', '').toLowerCase());
      }
    }
  });

  it('the neutral ring is the solid #3a3b35 (Phase 3.6.1 — was warm-cream rgba)', () => {
    // Phase 3.6.1 replaced the 18% rgba alpha with a solid color so
    // the rings read as deliberate UI on the lifted page bg.
    const tree = (StatRings as any)({ stats });
    const tile = findAll(tree, (n) => n.props?.testID === 'stat-tile-meds')[0];
    const bg = styleOf(tile).borderColor;
    expect(bg).toBe('#3a3b35');
    expect(bg).not.toMatch(/rgba/i);
  });
});

// ── 3b — Schedule active row ─────────────────────────────────────────────
describe('ScheduleCard — calm active row (no card-in-card)', () => {
  const baseWindows = [
    { window: 'morning', name: 'Morning', status: 'pending', remaining: 3, isActive: true },
    { window: 'afternoon', name: 'Afternoon', status: 'pending', remaining: 1, isActive: false },
    { window: 'evening', name: 'Evening', status: 'pending', remaining: 2, isActive: false },
  ] as any;

  it('the active row container does NOT set backgroundColor', () => {
    const tree = (ScheduleCard as any)({
      windows: baseWindows,
      onStart: jest.fn(),
      onRowPress: jest.fn(),
    });
    // First row is the active "Morning". Find it via accessibilityLabel.
    const rows = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /Morning,/.test(n.props.accessibilityLabel),
    );
    expect(rows.length).toBe(1);
    const merged = styleOf(rows[0]);
    expect(merged.backgroundColor).toBeUndefined();
  });

  it('Start affordance is a text-link, not a filled button (no backgroundColor: accent)', () => {
    const tree = (ScheduleCard as any)({
      windows: baseWindows,
      onStart: jest.fn(),
      onRowPress: jest.fn(),
    });
    const startBtn = findAll(tree, (n) =>
      typeof n.props?.accessibilityLabel === 'string' &&
      /Start Morning routine/.test(n.props.accessibilityLabel),
    )[0];
    expect(startBtn).toBeDefined();
    const merged = styleOf(startBtn);
    expect(merged.backgroundColor).toBeUndefined();
    expect(merged.backgroundColor).not.toBe('#5fb88a');
  });

  it('active and inactive rows have equal paddingVertical (target ~6)', () => {
    const tree = (ScheduleCard as any)({
      windows: baseWindows,
      onStart: jest.fn(),
      onRowPress: jest.fn(),
    });
    const rows = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.accessibilityLabel === 'string' &&
      /^(Morning|Afternoon|Evening),/.test(n.props.accessibilityLabel),
    );
    expect(rows.length).toBe(3);
    const paddings = rows.map((r) => styleOf(r).paddingVertical);
    const unique = new Set(paddings);
    expect(unique.size).toBe(1);
    expect(paddings[0]).toBeLessThanOrEqual(8);
  });
});
