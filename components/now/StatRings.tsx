// ============================================================================
// STAT RINGS — flat 4-up grid for the active care buckets.
//
// Visual contract (preserved from earlier phases):
//   • Each tile is a 36pt circle with a 1px solid neutral (c.border) ring against
//     a recessed glassDim well. Phase 3.6.1 + 3.7.2 spell this out.
//   • Hairline grouping (top + bottom 0.5px on the row container) per
//     Phase 3.8.1.
//   • Page-edge contract owns horizontal containment; no padding on the
//     row itself.
//
// Phase 5.13.3 — render is now driven by enabledBuckets, not by a fixed
// four-item list. Templates that disable meds/vitals (General Wellness,
// Mental Health Support) or enable sleep/activity now show the right
// tiles. We keep MAX_TILES = 4 so the 320pt iPhone-SE width math from
// statRingsVisibility holds. Optional consumers (the existing component
// tests) that omit enabledBuckets still get the legacy four — meds,
// vitals, wellness, meals — so older surfaces don't break.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Sizing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { MAX_TRACKED_DIMENSIONS } from '../../constants/carePlanLimits';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import type { BucketType } from '../../types/carePlanConfig';

// Phase 3.7.2 — bumped 28 → 36. At 28pt with a 1px border, the ring
// occupied ~3.6% of the tile diameter, below the perceptual threshold
// for "definite shape." 36pt with a recessed glassDim well + 1px solid
// edge gives the ring three visual cues (shape + depth + edge) and
// still fits four tiles inside the smallest target iPhone width.
const TILE_SIZE = 36;

// Phase 15.5 — cap lifted from a local MAX_TILES=4 to
// MAX_TRACKED_DIMENSIONS=6 (single source of truth in
// constants/carePlanLimits.ts). Post-Phase 11.9 sample-data enables
// 6 buckets; pre-15.5 the local 4-cap sliced hydration off the row.
//
// Width math at iPhone SE 320pt:
//   6 × 36 (TILE_SIZE) + 5 × 8 (gap) = 256pt
//   + 14 × 2 (page edge) = 284pt
//   → fits 320pt with 36pt of headroom.
//
// The legacy 4-tile width-math test (statRingsVisibility.test.tsx)
// stays as a regression-pin: 4 tiles still fit on iPhone SE; cap=6
// is the new ceiling, not a forced count.

type CategoryKey =
  | 'meds'
  | 'vitals'
  | 'wellness'
  | 'meals'
  | 'water'
  | 'sleep'
  | 'activity';

interface CategoryDef {
  key: CategoryKey;
  emoji: string;
  label: string;
  /** Which key on TodayStats this tile reads. Most map 1:1 with the bucket. */
  statKey: keyof TodayStats;
}

// Per-bucket display metadata. The key here is the CarePlanConfig bucket
// type; statKey lets us read the matching slice off TodayStats.
const CATEGORY_REGISTRY: Record<CategoryKey, CategoryDef> = {
  meds: { key: 'meds', emoji: '💊', label: 'MEDS', statKey: 'meds' },
  vitals: { key: 'vitals', emoji: '📊', label: 'VITALS', statKey: 'vitals' },
  wellness: { key: 'wellness', emoji: '🌅', label: 'WELLNESS', statKey: 'wellness' },
  meals: { key: 'meals', emoji: '🍽️', label: 'MEALS', statKey: 'meals' },
  water: { key: 'water', emoji: '💧', label: 'WATER', statKey: 'water' },
  sleep: { key: 'sleep', emoji: '😴', label: 'SLEEP', statKey: 'sleep' },
  activity: { key: 'activity', emoji: '🚶', label: 'ACTIVITY', statKey: 'activity' },
};

// Stable ordering. When the user has more than MAX_TRACKED_DIMENSIONS
// buckets enabled, we keep this order and slice — meds/vitals lead
// because they are the most clinically important when present.
const PRIORITY_ORDER: CategoryKey[] = [
  'meds',
  'vitals',
  'wellness',
  'meals',
  'water',
  'sleep',
  'activity',
];

// Legacy fallback for callers that don't pass enabledBuckets (existing
// component tests, in particular). Matches the pre-5.13.3 default tile
// set so those tests keep passing.
const LEGACY_FALLBACK: CategoryKey[] = ['meds', 'vitals', 'wellness', 'meals'];

// Ring track — the neutral `border` token (crisp 1px edge, same neutral
// across all categories so the row stays unified; the emoji inside carries
// the per-category meaning). Migrated from a solid neutral literal + its dead
// per-category color map to the c.border token at the tile.

export interface StatRingsProps {
  stats: TodayStats;
  /**
   * Active buckets from CarePlanConfig. When supplied, the row renders
   * only the tiles whose buckets the user enabled (capped at
   * MAX_TRACKED_DIMENSIONS, ordered by PRIORITY_ORDER). When omitted,
   * falls back to the legacy four — meds, vitals, wellness, meals —
   * so older callers and tests that pre-date Phase 5.13.3 don't break.
   */
  enabledBuckets?: BucketType[];
}

const RENDERABLE_KEYS = new Set<CategoryKey>(PRIORITY_ORDER);

function isCategoryKey(b: BucketType): b is CategoryKey {
  return RENDERABLE_KEYS.has(b as CategoryKey);
}

export function StatRings({ stats, enabledBuckets }: StatRingsProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const categoriesToRender = useMemo<CategoryDef[]>(() => {
    // Phase 11.9.5 — empty-array → defaults fallback.
    //
    // Phase 11.9 enabled sleep + water buckets in sample-data
    // config, which surfaced a regression: when enabledBuckets
    // arrives as [] during the brief moment between mount and
    // useCarePlanConfig's first resolved load, StatRings rendered
    // nothing. Pre-fix the ternary `enabledBuckets ? filter :
    // LEGACY_FALLBACK` treated [] as truthy → empty filter result
    // → no tiles. Pre-11.9 the loading window was short enough
    // this stayed invisible; 11.9's added migration + 14-day
    // re-seed work made it long enough to flash on device.
    //
    // The defaults-fallback now handles both undefined and []
    // because both represent "no validated config yet, render the
    // standard four orbs." If a user genuinely disables all
    // buckets via Care Plan UI, falling back to standard orbs for
    // that edge case is forgivable — caregivers expect to see
    // SOMETHING above Today's Schedule, and a flash to nothing
    // reads as "the app is broken" rather than "everything is
    // disabled."
    const source: CategoryKey[] =
      enabledBuckets && enabledBuckets.length > 0
        ? enabledBuckets.filter(isCategoryKey)
        : LEGACY_FALLBACK;
    const allowed = new Set<CategoryKey>(source);
    return PRIORITY_ORDER
      .filter((k) => allowed.has(k))
      .slice(0, MAX_TRACKED_DIMENSIONS)
      .map((k) => CATEGORY_REGISTRY[k]);
  }, [enabledBuckets]);

  if (categoriesToRender.length === 0) return null;

  return (
    <View style={s.container}>
      {categoriesToRender.map((cat) => {
        const stat: StatData = (stats as any)[cat.statKey] ?? { completed: 0, total: 0 };
        const isEmpty = stat.total === 0;
        const a11yLabel = isEmpty
          ? `${cat.label}, none scheduled`
          : `${cat.label}, ${stat.completed} of ${stat.total} completed`;

        // Phase 15.4 — water ring carries the standalone HydrationTodayRow's
        // tap-to-/log-water affordance. Other rings stay non-interactive
        // Views; per-ring inline quick-actions (e.g. inline +1 cup) are
        // filed for v1.1 ("extend StatRings API to support per-ring
        // inline quick-actions, primary use case = hydration +1").
        const isWater = cat.key === 'water';
        const tile = (
          <>
            <View
              testID={`stat-tile-${cat.key}`}
              style={[s.tile, { borderColor: colors.border }]}
            >
              <Text style={s.emoji}>{cat.emoji}</Text>
            </View>
            {/* Phase 23.1 Fix 5 — labels allow 2-line wrap and use
                adjustsFontSizeToFit so 8-character names (WELLNESS,
                ACTIVITY) don't truncate to "WELLNE…" on iPhone SE.
                Pre-fix the row used numberOfLines={1} + tail-ellipsis,
                which clipped the long labels at the ~42pt column width
                the 6-tile MAX_TRACKED_DIMENSIONS math produces. The
                value Text (e.g. "12 of 12") keeps its 1-line ellipsis
                — the count there is short enough to fit and a wrapping
                count would read as broken. */}
            <Text
              testID={`stat-label-${cat.key}`}
              style={s.label}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {cat.label}
            </Text>
            <Text style={s.value} numberOfLines={1} ellipsizeMode="tail">
              {isEmpty ? '—' : `${stat.completed} of ${stat.total}`}
            </Text>
          </>
        );

        if (isWater) {
          return (
            <TouchableOpacity
              key={cat.key}
              style={s.column}
              accessibilityLabel={a11yLabel}
              accessibilityRole="button"
              onPress={() => navigate('/log-water')}
              activeOpacity={0.7}
            >
              {tile}
            </TouchableOpacity>
          );
        }

        return (
          <View
            key={cat.key}
            style={s.column}
            accessibilityLabel={a11yLabel}
          >
            {tile}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    // Phase 3.8.1 — hairline grouping. Top + bottom 0.5px rules contain
    // the four orbs as a "today at a glance" section without adding
    // another card to the Now stack (schedule card + end-of-shift card
    // already occupy the page). Side borders intentionally absent —
    // the page-edge contract from Phase 3 (paddingHorizontal: 14 on
    // the screen ScrollView) handles horizontal containment, so the
    // hairlines extend full page-width naturally. Phase 2 originally
    // removed the wrapper to avoid card-in-card weight against the
    // pre-Phase-0 near-black bg; the lift restored that risk, so we
    // add grouping back in lighter form.
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
    paddingVertical: Sizing.cardInternalPadding,
    // Phase 4a + 3.5 — page-rhythm. Spacing.md above (separates the row
    // from the hero header), Spacing.md below (separates from the
    // schedule card). Horizontal padding intentionally absent (see
    // hairline rationale above).
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_SIZE / 2,
    // Phase 3.6.1 — bumped 0.5 → 1 for crisp definition that reads as
    // deliberate UI rather than a rendering artifact.
    borderWidth: 1,
    // Phase 3.7.2 — recessed-well effect. glassDim sits ~5 L* above the
    // page bg; the emoji reads as sitting INSIDE the well rather than
    // floating on the surface. Third visual cue beyond shape + edge.
    backgroundColor: c.glassDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    // Phase 23.1 Fix 5 — letterSpacing 0.5 → 0.2. The wider tracking
    // pushed WELLNESS / ACTIVITY (8-char labels) past the ~42pt column
    // bound on iPhone SE. The 0.2 value keeps a subtle small-caps feel
    // without consuming the width 8-char labels need to fit on one line.
    letterSpacing: 0.2,
    color: c.textSecondary,
    textAlign: 'center',
  },
  value: {
    fontSize: 11,
    fontWeight: '400',
    color: c.textPrimary,
  },
});
