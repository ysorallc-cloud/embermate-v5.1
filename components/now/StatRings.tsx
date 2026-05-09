// ============================================================================
// STAT RINGS — flat 4-up grid for the active care buckets.
//
// Visual contract (preserved from earlier phases):
//   • Each tile is a 36pt circle with a 1px solid #3a3b35 ring against
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
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Sizing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import type { BucketType } from '../../types/carePlanConfig';

// Phase 3.7.2 — bumped 28 → 36. At 28pt with a 1px border, the ring
// occupied ~3.6% of the tile diameter, below the perceptual threshold
// for "definite shape." 36pt with a recessed glassDim well + 1px solid
// edge gives the ring three visual cues (shape + depth + edge) and
// still fits four tiles inside the smallest target iPhone width.
const TILE_SIZE = 36;

// Width math (from statRingsVisibility.test.tsx): 4 × 36 + 3 × 8 = 168pt
// content. Page edge 14 × 2 = 28pt. Total 196pt fits comfortably in 320pt
// (iPhone SE). Capping the rendered tiles at four preserves that.
const MAX_TILES = 4;

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

// Stable ordering. When the user has more than MAX_TILES buckets enabled,
// we keep this order and slice — meds/vitals lead because they are the
// most clinically important when present.
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

// Phase 3.6.1 — solid ring at #3a3b35 (~L* 3 above page bg). The prior
// rgba(255,240,215,0.18) read too faint on the lifted warm-charcoal
// page; an alpha overlay at 18% lacked enough contrast to register as
// a deliberate UI element. Solid color + crisp 1px edge fixes that
// without making the rings shout. Same neutral across all categories
// so the row stays unified (the emoji inside carries the per-category
// meaning).
const NEUTRAL_RING = '#3a3b35';
const RING_COLOR: Record<CategoryKey, string> = {
  meds: NEUTRAL_RING,
  vitals: NEUTRAL_RING,
  wellness: NEUTRAL_RING,
  meals: NEUTRAL_RING,
  water: NEUTRAL_RING,
  sleep: NEUTRAL_RING,
  activity: NEUTRAL_RING,
};

export interface StatRingsProps {
  stats: TodayStats;
  /**
   * Active buckets from CarePlanConfig. When supplied, the row renders
   * only the tiles whose buckets the user enabled (capped at MAX_TILES,
   * ordered by PRIORITY_ORDER). When omitted, falls back to the legacy
   * four — meds, vitals, wellness, meals — so older callers and tests
   * that pre-date Phase 5.13.3 don't break.
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
    const source: CategoryKey[] = enabledBuckets
      ? enabledBuckets.filter(isCategoryKey)
      : LEGACY_FALLBACK;
    const allowed = new Set<CategoryKey>(source);
    return PRIORITY_ORDER
      .filter((k) => allowed.has(k))
      .slice(0, MAX_TILES)
      .map((k) => CATEGORY_REGISTRY[k]);
  }, [enabledBuckets]);

  if (categoriesToRender.length === 0) return null;

  return (
    <View style={s.container}>
      {categoriesToRender.map((cat) => {
        const stat: StatData = (stats as any)[cat.statKey] ?? { completed: 0, total: 0 };
        const isEmpty = stat.total === 0;
        return (
          <View
            key={cat.key}
            style={s.column}
            accessibilityLabel={
              isEmpty
                ? `${cat.label}, none scheduled`
                : `${cat.label}, ${stat.completed} of ${stat.total} completed`
            }
          >
            <View
              testID={`stat-tile-${cat.key}`}
              style={[s.tile, { borderColor: RING_COLOR[cat.key] }]}
            >
              <Text style={s.emoji}>{cat.emoji}</Text>
            </View>
            <Text testID={`stat-label-${cat.key}`} style={s.label}>{cat.label}</Text>
            <Text style={s.value}>
              {isEmpty ? '—' : `${stat.completed} of ${stat.total}`}
            </Text>
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
    letterSpacing: 0.5,
    color: c.textSecondary,
  },
  value: {
    fontSize: 11,
    fontWeight: '400',
    color: c.textPrimary,
  },
});
