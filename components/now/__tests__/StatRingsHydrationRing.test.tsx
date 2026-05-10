// ============================================================================
// Phase 15.4 — StatRings hydration ring + tap-to-/log-water.
//
// 15.4 retires HydrationTodayRow (the standalone "X cups · +1" row
// that lived between StatRings and the schedule). Hydration becomes
// a fifth ring on the StatRings row. The standalone row's two
// affordances split:
//
//   • Tap on the row body → navigated to /log-water.
//     Lifts to: tap on the water ring → /log-water.
//
//   • +1 cup quick-action.
//     Deferred to v1.1 (filed: "extend StatRings API to support
//     per-ring inline quick-actions, primary use case = hydration
//     +1"). For v1.0 the ring routes to /log-water and the user
//     adds the cup there.
//
// Pinned contracts:
//   1. Ring renders when enabledBuckets includes 'water'. The
//      label is WATER, the stat reads cupsToday/goal from the stats
//      prop. Already covered by the existing StatRings 'water'
//      registry entry; this contract regression-pins it.
//   2. Tapping the water ring navigates to /log-water. New wiring
//      for 15.4 — pre-fix the tile was a plain View with no onPress.
//   3. Other rings (meds, vitals, wellness, meals) do NOT navigate
//      anywhere on tap. Out of scope for 15.4; only water gets the
//      route. They stay non-interactive Views.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassDim: '#2c2e27',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  accent: '#5fb88a',
  textSecondary: '#c4c1b3',
  textPrimary: '#fff',
};

jest.mock('../../../contexts/ThemeContext', () => ({
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

const mockNavigate = jest.fn();
jest.mock('../../../lib/navigate', () => ({
  navigate: (...args: any[]) => mockNavigate(...args),
}));

import { StatRings } from '../StatRings';
import type { TodayStats } from '../../../utils/nowHelpers';
import type { BucketType } from '../../../types/carePlanConfig';

const stats: TodayStats = {
  meds: { completed: 5, total: 5 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 1, total: 3 },
  meals: { completed: 1, total: 3 },
  water: { completed: 4, total: 8 },
} as TodayStats;

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(StatRings as any, props));
  });
  return root!;
}

beforeEach(() => {
  mockNavigate.mockReset();
});

describe('Phase 15.4 — StatRings hydration ring', () => {
  it('contract 1: renders a hydration ring when enabledBuckets includes "water"', () => {
    // PRIORITY_ORDER puts water at position 5 (after meds/vitals/
    // wellness/meals). With these 5 buckets enabled, water lands
    // inside the MAX_TILES cap of 6 (or whatever 15.5 sets it to).
    // Phase 15.4 isolated fixture — uses 4 buckets so water makes
    // the MAX_TILES cap (currently 4). Phase 15.5 will lift the cap
    // to 6 (MAX_TRACKED_DIMENSIONS), at which point the post-11.9
    // 6-bucket sample-data set will also render water on device.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'water'];
    const tree = render({ stats, enabledBuckets: buckets });
    // Water tile testID is 'stat-tile-water'.
    const waterTile = findAll(tree.root, (n) => n.props?.testID === 'stat-tile-water');
    expect(waterTile.length).toBe(1);
    // Water label.
    const waterLabel = findAll(tree.root, (n) => n.props?.testID === 'stat-label-water');
    expect(waterLabel.length).toBe(1);
  });

  it('contract 1: water ring renders cupsToday/goal from the stats prop', () => {
    // Phase 15.4 isolated fixture — uses 4 buckets so water makes
    // the MAX_TILES cap (currently 4). Phase 15.5 will lift the cap
    // to 6 (MAX_TRACKED_DIMENSIONS), at which point the post-11.9
    // 6-bucket sample-data set will also render water on device.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'water'];
    const tree = render({ stats, enabledBuckets: buckets });
    // Walk every Text descendant inside the water column to find
    // the value text "4 of 8".
    const waterTile = findAll(tree.root, (n) => n.props?.testID === 'stat-tile-water')[0];
    expect(waterTile).toBeDefined();
    // The column wraps the tile + label + value. Walk up to the
    // column root, then collect Text nodes.
    const column = waterTile.parent;
    expect(column).toBeDefined();
    const texts: string[] = [];
    function walk(node: any) {
      if (node == null) return;
      if (typeof node === 'string' || typeof node === 'number') {
        texts.push(String(node));
        return;
      }
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.children !== undefined) walk(node.children);
      if (node.props?.children !== undefined) walk(node.props.children);
    }
    walk(column);
    const joined = texts.join(' ');
    expect(joined).toMatch(/4 of 8/);
  });

  it('contract 2: tapping the water ring navigates to /log-water', () => {
    // Phase 15.4 isolated fixture — uses 4 buckets so water makes
    // the MAX_TILES cap (currently 4). Phase 15.5 will lift the cap
    // to 6 (MAX_TRACKED_DIMENSIONS), at which point the post-11.9
    // 6-bucket sample-data set will also render water on device.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'water'];
    const tree = render({ stats, enabledBuckets: buckets });
    // The water column must be a TouchableOpacity (or a wrapper that
    // forwards onPress). Find the water column root by walking up
    // from the tile testID until we hit a node with onPress.
    const waterTile = findAll(tree.root, (n) => n.props?.testID === 'stat-tile-water')[0];
    expect(waterTile).toBeDefined();
    let cursor: TestRenderer.ReactTestInstance | null = waterTile;
    let touchable: TestRenderer.ReactTestInstance | null = null;
    while (cursor) {
      if (typeof cursor.props?.onPress === 'function') {
        touchable = cursor;
        break;
      }
      cursor = cursor.parent ?? null;
    }
    expect(touchable).not.toBeNull();
    touchable!.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('/log-water');
  });

  it('contract 3: tapping a non-water ring does NOT navigate', () => {
    // Only water gets the route in v1.0. Other rings stay
    // non-interactive Views (no onPress on their column).
    // Phase 15.4 isolated fixture — uses 4 buckets so water makes
    // the MAX_TILES cap (currently 4). Phase 15.5 will lift the cap
    // to 6 (MAX_TRACKED_DIMENSIONS), at which point the post-11.9
    // 6-bucket sample-data set will also render water on device.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'water'];
    const tree = render({ stats, enabledBuckets: buckets });
    // Iterate the non-water rings actually rendered by this fixture.
    for (const k of ['meds', 'vitals', 'meals'] as const) {
      const tile = findAll(tree.root, (n) => n.props?.testID === `stat-tile-${k}`)[0];
      expect(tile).toBeDefined();
      // Walk up — no ancestor inside the column should carry onPress.
      let cursor: TestRenderer.ReactTestInstance | null = tile;
      let depth = 0;
      while (cursor && depth < 4) {
        if (typeof cursor.props?.onPress === 'function') {
          throw new Error(`Non-water ring ${k} unexpectedly has onPress wired`);
        }
        cursor = cursor.parent ?? null;
        depth++;
      }
    }
    // Sanity: navigate was not called from this render path.
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
