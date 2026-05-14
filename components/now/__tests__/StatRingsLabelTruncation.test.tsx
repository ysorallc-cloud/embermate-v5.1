// ============================================================================
// Phase 23.1 Fix 5 — StatRings labels do not truncate on iPhone SE.
//
// Pre-fix the row used numberOfLines={1} + ellipsizeMode="tail" with a
// 0.5 letterSpacing on a 9pt label. At MAX_TRACKED_DIMENSIONS=6 on iPhone
// SE 320pt the per-column width drops to ~42pt; 8-character labels
// (WELLNESS, ACTIVITY) overflowed that bound and tail-ellipsised to
// "WELLNE…" / "ACTIVI…".
//
// Post-fix:
//   • numberOfLines lifted 1 → 2 so the longest labels wrap rather than
//     clip.
//   • adjustsFontSizeToFit + minimumFontScale=0.85 lets iOS shrink the
//     glyphs as a softer first-pass fix before the wrap kicks in.
//   • letterSpacing dropped 0.5 → 0.2.
// Other labels (MEDS=4, VITALS=6, MEALS=5, WATER=5, SLEEP=5) keep
// rendering one-line — they have plenty of room.
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

jest.mock('../../../lib/navigate', () => ({
  navigate: jest.fn(),
}));

import { StatRings } from '../StatRings';
import type { TodayStats } from '../../../utils/nowHelpers';
import type { BucketType } from '../../../types/carePlanConfig';

const stats: TodayStats = {
  meds: { completed: 1, total: 2 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 0, total: 1 },
  meals: { completed: 1, total: 3 },
  water: { completed: 4, total: 8 },
  sleep: { completed: 1, total: 1 },
  activity: { completed: 0, total: 1 },
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

describe('Phase 23.1 Fix 5 — StatRings label truncation on iPhone SE', () => {
  it('the WELLNESS label renders fully (no tail-ellipsis on the longest realistic label)', () => {
    const buckets: BucketType[] = ['meds', 'vitals', 'wellness', 'meals', 'water', 'sleep'];
    const tree = render({ stats, enabledBuckets: buckets });
    const wellnessLabel = findAll(
      tree.root,
      (n) => n.props?.testID === 'stat-label-wellness',
    )[0];
    expect(wellnessLabel).toBeDefined();
    // The wrap-graceful approach lifts numberOfLines from 1 → 2 so the
    // glyphs are never clipped. ellipsizeMode="tail" should not be set
    // on the label, since wrap (not ellipsis) is the failure mode.
    expect(wellnessLabel.props.numberOfLines).toBeGreaterThanOrEqual(2);
    expect(wellnessLabel.props.ellipsizeMode).not.toBe('tail');
    // The full label text reaches the renderer untouched.
    expect(wellnessLabel.props.children).toBe('WELLNESS');
  });

  it('ACTIVITY label (also 8 chars) renders fully under the same contract', () => {
    const buckets: BucketType[] = ['meds', 'vitals', 'wellness', 'meals', 'water', 'activity'];
    const tree = render({ stats, enabledBuckets: buckets });
    const activityLabel = findAll(
      tree.root,
      (n) => n.props?.testID === 'stat-label-activity',
    )[0];
    expect(activityLabel).toBeDefined();
    expect(activityLabel.props.numberOfLines).toBeGreaterThanOrEqual(2);
    expect(activityLabel.props.children).toBe('ACTIVITY');
  });

  it('shorter labels (MEDS / VITALS / MEALS / WATER / SLEEP) keep rendering — Phase 15.5 cap math is preserved', () => {
    const buckets: BucketType[] = ['meds', 'vitals', 'wellness', 'meals', 'water', 'sleep'];
    const tree = render({ stats, enabledBuckets: buckets });
    for (const key of ['meds', 'vitals', 'meals', 'water', 'sleep']) {
      const label = findAll(
        tree.root,
        (n) => n.props?.testID === `stat-label-${key}`,
      )[0];
      expect(label).toBeDefined();
    }
  });
});
