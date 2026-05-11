// ============================================================================
// Phase 11.9.5 — StatRings regression: orbs render under the post-11.9
// enabledBuckets shape.
//
// Phase 11.9.1 enabled sleep + water in sample-data CarePlanConfig.
// Phase 11.9.2 added the hydration sync case. Post-11.9
// getEnabledBuckets returns 6 keys instead of pre-11.9's 4:
//   ['meds', 'vitals', 'meals', 'water', 'sleep', 'wellness']
//
// Device-check after 11.9 surfaced that the four orbs (MEDS / VITALS
// / WELLNESS / MEALS) had vanished from Now. This is the regression
// pin — exercises StatRings with the post-11.9 buckets and asserts
// the four expected labels still render. If the test fails, the
// component's rendering logic has drifted; if it passes, the bug is
// elsewhere in the render tree (parent gating, todayStats wiring, etc.).
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
      glassDim: '#2c2e27',
      glassBorder: 'rgba(255, 240, 215, 0.08)',
      accent: '#5fb88a',
      textSecondary: '#c4c1b3',
      textPrimary: '#FFFFFF',
    },
    resolvedTheme: 'dark',
  }),
}));

import { StatRings } from '../../components/now/StatRings';
import type { TodayStats } from '../../utils/nowHelpers';
import type { BucketType } from '../../types/carePlanConfig';

const stats: TodayStats = {
  meds: { completed: 5, total: 5 },
  vitals: { completed: 1, total: 1 },
  wellness: { completed: 1, total: 3 },
  meals: { completed: 1, total: 3 },
  water: { completed: 4, total: 8 },
  sleep: { completed: 0, total: 1 },
} as TodayStats;

function flattenText(children: any): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (typeof children === 'object' && children.props) return flattenText(children.props.children);
  return '';
}

describe('Phase 11.9.5 — StatRings post-11.9 enabledBuckets regression', () => {
  // Exact shape getEnabledBuckets returns post-11.9 sample-data init.
  // Order follows BUCKET_TYPES in types/carePlanConfig.ts:28.
  const POST_11_9_BUCKETS: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'wellness'];

  it('contract 1: renders a non-null root with the post-11.9 buckets', () => {
    const tree: any = (StatRings as any)({ stats, enabledBuckets: POST_11_9_BUCKETS });
    expect(tree).not.toBeNull();
    expect(tree?.type).toBe('View');
  });

  it('contract 2: renders all four expected labels (MEDS / VITALS / WELLNESS / MEALS)', () => {
    const tree: any = (StatRings as any)({ stats, enabledBuckets: POST_11_9_BUCKETS });
    const text = flattenText(tree);
    expect(text).toContain('MEDS');
    expect(text).toContain('VITALS');
    expect(text).toContain('WELLNESS');
    expect(text).toContain('MEALS');
  });

  it('contract 3: renders all 6 columns (MAX_TRACKED_DIMENSIONS=6 post-15.5)', () => {
    // Phase 15.5 lifted the cap from MAX_TILES=4 to
    // MAX_TRACKED_DIMENSIONS=6. The post-11.9 6-bucket sample-data
    // set now renders all six (including the hydration ring that
    // 15.4 wired). This contract was originally a 4-column
    // assertion under the old cap; updated for the new ceiling.
    const tree: any = (StatRings as any)({ stats, enabledBuckets: POST_11_9_BUCKETS });
    const React = jest.requireActual('react');
    const columns = React.Children.toArray(tree.props.children);
    expect(columns).toHaveLength(6);
  });

  it('contract 4: values render in "N of N" format from the stats prop', () => {
    const tree: any = (StatRings as any)({ stats, enabledBuckets: POST_11_9_BUCKETS });
    const text = flattenText(tree);
    expect(text).toContain('5 of 5');
    expect(text).toContain('1 of 1');
    expect(text).toContain('1 of 3');
  });

  it('contract 5: empty enabledBuckets array falls back to LEGACY_FALLBACK (loading-state regression fix)', () => {
    // Phase 11.9.5 fix — when enabledBuckets arrives as [] during the
    // brief moment between mount and useCarePlanConfig's first
    // resolved load, StatRings used to return null because the
    // ternary `enabledBuckets ? filter : LEGACY_FALLBACK` treated []
    // as truthy → empty filter result → no tiles rendered. Pre-11.9
    // the loading window was short enough this stayed invisible;
    // 11.9's migration + re-seed work made the window long enough
    // to flash on device. Post-fix: empty array also falls back to
    // the legacy four orbs (MEDS / VITALS / WELLNESS / MEALS) so
    // there's no flash-to-nothing while the config loads.
    const tree: any = (StatRings as any)({ stats, enabledBuckets: [] });
    expect(tree).not.toBeNull();
    const text = flattenText(tree);
    expect(text).toContain('MEDS');
    expect(text).toContain('VITALS');
    expect(text).toContain('WELLNESS');
    expect(text).toContain('MEALS');
  });

  it('contract 6: undefined enabledBuckets uses the LEGACY_FALLBACK path', () => {
    // The legacy callers (existing tests) omit enabledBuckets and
    // expect the four-orb render via LEGACY_FALLBACK.
    const tree: any = (StatRings as any)({ stats });
    expect(tree).not.toBeNull();
    const text = flattenText(tree);
    expect(text).toContain('MEDS');
    expect(text).toContain('VITALS');
    expect(text).toContain('WELLNESS');
    expect(text).toContain('MEALS');
  });
});
