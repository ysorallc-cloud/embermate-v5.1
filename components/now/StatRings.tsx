// ============================================================================
// STAT RINGS — flat 4-up grid for the core care buckets.
//
// v6.7 visual-consistency Phase 2: the stat tiles are no longer wrapped in
// a glass card (which created nested-card visual weight). Each tile is a
// 28pt circle with a 0.5px category-color ring at 35% opacity, sitting
// directly on the page background. Progress is conveyed by the count text
// below ("1 of 3"); the tile itself is a category indicator, not a ring.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Sizing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';

// Phase 3.7.2 — bumped 28 → 36. At 28pt with a 1px border, the ring
// occupied ~3.6% of the tile diameter, below the perceptual threshold
// for "definite shape." 36pt with a recessed glassDim well + 1px solid
// edge gives the ring three visual cues (shape + depth + edge) and
// still fits four tiles inside the smallest target iPhone width.
const TILE_SIZE = 36;

type CategoryKey = 'meds' | 'vitals' | 'wellness' | 'meals';

interface CategoryDef {
  key: CategoryKey;
  emoji: string;
  label: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'meds', emoji: '💊', label: 'MEDS' },
  { key: 'vitals', emoji: '📊', label: 'VITALS' },
  { key: 'wellness', emoji: '🌅', label: 'WELLNESS' },
  { key: 'meals', emoji: '🍽️', label: 'MEALS' },
];

// Phase 3.6.1 — solid ring at #3a3b35 (~L* 3 above page bg). The prior
// rgba(255,240,215,0.18) read too faint on the lifted warm-charcoal
// page; an alpha overlay at 18% lacked enough contrast to register as
// a deliberate UI element. Solid color + crisp 1px edge fixes that
// without making the rings shout. Same neutral across all four
// categories so the row stays unified (the emoji inside carries the
// per-category meaning).
const NEUTRAL_RING = '#3a3b35';
const RING_COLOR: Record<CategoryKey, string> = {
  meds: NEUTRAL_RING,
  vitals: NEUTRAL_RING,
  wellness: NEUTRAL_RING,
  meals: NEUTRAL_RING,
};

export interface StatRingsProps {
  stats: TodayStats;
}

export function StatRings({ stats }: StatRingsProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      {CATEGORIES.map((cat) => {
        const stat: StatData = (stats as any)[cat.key] ?? { completed: 0, total: 0 };
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
