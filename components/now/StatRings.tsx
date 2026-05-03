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
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';

const TILE_SIZE = 28;

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

// 35% opacity rings per category — distinct enough to read on the warm
// page bg, soft enough to not compete with the schedule below.
// v6.7 May 1 sizing pass — Phase 3a flipped per-category accents to a
// single neutral warm-cream ring. The emoji inside carries category
// meaning; the ring is just a hairline indicator. Same color across all
// four tiles keeps the row reading as a unified group rather than four
// competing accents.
const NEUTRAL_RING = 'rgba(255, 240, 215, 0.18)';
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
    // Phase 4a + 3.5 — page-rhythm. Spacing.md above (separates the row
    // from the hero header), Spacing.md below (separates from the
    // schedule card), 14pt horizontal so the four tiles' outer gutters
    // match the page-edge contract from Phase 3. Phase 3.5 lifted
    // Spacing.md from 16 → 20 so these gaps now breathe.
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: 14,
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
    borderWidth: 0.5,
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
