// ============================================================================
// Phase 15.5 — StatRings caps at MAX_TRACKED_DIMENSIONS (6).
//
// Pre-15.5 the cap was a local MAX_TILES=4 in StatRings.tsx.
// Phase 11.9 enabled sleep + water in sample-data, producing a
// 6-bucket enabledBuckets set. The old cap sliced water (5th by
// PRIORITY_ORDER) off the row, leaving the hydration ring 15.4
// shipped invisible on real device data. 15.5 lifts the cap to 6
// (MAX_TRACKED_DIMENSIONS) so hydration renders.
//
// Pinned contracts:
//   1. 8 enabled buckets → exactly 6 rings render.
//   2. The 6 rendered match the first 6 of PRIORITY_ORDER.
//   3. Fewer-than-6 enabled buckets → all render (no padding-up).
//   4. The post-11.9 6-bucket sample-data set renders the hydration
//      ring (the visible-on-device regression 15.4 surfaced).
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

// Phase 15.4 — StatRings imports navigate for the water-ring tap.
// Keep expo-router out of the test runtime.
jest.mock('../../../lib/navigate', () => ({
  navigate: jest.fn(),
}));

import { StatRings } from '../StatRings';
import { MAX_TRACKED_DIMENSIONS } from '../../../constants/carePlanLimits';
import type { TodayStats } from '../../../utils/nowHelpers';
import type { BucketType } from '../../../types/carePlanConfig';

const stats: TodayStats = {
  meds: { completed: 1, total: 1 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 1, total: 1 },
  meals: { completed: 1, total: 1 },
  water: { completed: 4, total: 8 },
  sleep: { completed: 1, total: 1 },
  activity: { completed: 1, total: 1 },
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

function renderedRingKeys(tree: TestRenderer.ReactTestRenderer): string[] {
  // Each tile carries testID="stat-tile-<key>". Collect in render
  // order so the test can assert positional priority too.
  const tiles = findAll(tree.root, (n) =>
    typeof n.props?.testID === 'string'
    && /^stat-tile-/.test(n.props.testID),
  );
  return tiles.map((t) => String(t.props.testID).replace(/^stat-tile-/, ''));
}

describe('Phase 15.5 — StatRings cap at MAX_TRACKED_DIMENSIONS (6)', () => {
  it('contract 1: 8 valid bucket types → renders exactly 6 rings', () => {
    // PRIORITY_ORDER inside StatRings has 7 CategoryKeys (meds /
    // vitals / wellness / meals / water / sleep / activity). Pass
    // all 7 plus a non-CategoryKey bucket ('appointments' — valid
    // BucketType but not renderable as a tile) for the "8 valid"
    // shape from the spec. The slice should still produce 6.
    const buckets: BucketType[] = [
      'meds', 'vitals', 'meals', 'water',
      'sleep', 'activity', 'wellness',
      // 'appointments' is a valid BucketType but not a tile-rendering
      // category — it's filtered by isCategoryKey before the slice,
      // so the 7 CategoryKeys above are what reach the cap.
      'appointments',
    ];
    const tree = render({ stats, enabledBuckets: buckets });
    const keys = renderedRingKeys(tree);
    expect(keys.length).toBe(MAX_TRACKED_DIMENSIONS);
    expect(keys.length).toBe(6);
  });

  it('contract 2: the 6 rendered match the first 6 of PRIORITY_ORDER', () => {
    // PRIORITY_ORDER from StatRings.tsx:73 — meds, vitals, wellness,
    // meals, water, sleep, activity. First 6 = meds/vitals/wellness/
    // meals/water/sleep.
    const buckets: BucketType[] = [
      'activity', 'sleep', 'water', 'meals', 'wellness', 'vitals', 'meds',
    ];
    const tree = render({ stats, enabledBuckets: buckets });
    const keys = renderedRingKeys(tree);
    expect(keys).toEqual(['meds', 'vitals', 'wellness', 'meals', 'water', 'sleep']);
  });

  it('contract 3: fewer-than-6 enabled buckets → all render (no padding-up)', () => {
    // Regression: the 4-bucket case (pre-15.5 cap, still common in
    // minimal templates) renders exactly 4.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'wellness'];
    const tree = render({ stats, enabledBuckets: buckets });
    const keys = renderedRingKeys(tree);
    expect(keys).toEqual(['meds', 'vitals', 'wellness', 'meals']);
  });

  it('contract 4: post-11.9 6-bucket sample-data set renders the hydration ring', () => {
    // The exact set getEnabledBuckets returns after Phase 11.9.1's
    // config override. Order follows BUCKET_TYPES in
    // types/carePlanConfig.ts; PRIORITY_ORDER reorders to put
    // wellness ahead of meals/water/sleep.
    const buckets: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'wellness'];
    const tree = render({ stats, enabledBuckets: buckets });
    const keys = renderedRingKeys(tree);
    // Water must be present (the 15.4 fix is now visible on device).
    expect(keys).toContain('water');
    // All six should render — none get sliced off.
    expect(keys.length).toBe(6);
  });
});
