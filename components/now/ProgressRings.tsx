// ============================================================================
// TODAY'S PROGRESS — Flat centered inline text row
// No cards, no icons, just: ● Label N/N per category, colored by status
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { CATEGORY_CONFIG } from '../../constants/categoryLabels';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import { isOverdue } from '../../utils/nowHelpers';
import type { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// CONSTANTS
// ============================================================================

const CORE_BUCKETS: BucketType[] = ['meds', 'vitals', 'wellness', 'meals'];
const CORE_SET = new Set<string>(CORE_BUCKETS);

// Bucket → itemType mapping (for overdue detection via instances)
const BUCKET_TO_ITEM_TYPE: Record<string, string> = {
  meds: 'medication',
  vitals: 'vitals',
  meals: 'nutrition',
  water: 'hydration',
  sleep: 'sleep',
  activity: 'activity',
  wellness: 'wellness',
  errands: 'errand',
  shifts: 'shift',
  self_care: 'self_care',
  appointments: 'appointment',
};

// ============================================================================
// HELPERS
// ============================================================================

function isCategoryOverdue(itemType: string, instances: any[]): boolean {
  return instances.some(
    i => i.itemType === itemType &&
         (i.status === 'pending' || !i.status) &&
         isOverdue(i.scheduledTime)
  );
}

// ============================================================================
// PROPS
// ============================================================================

interface ProgressRingsProps {
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  nextUp?: any | null;
  instances?: any[];
  selectedCategory?: BucketType | null;
  onRingPress?: (bucket: BucketType) => void;
  onManagePress?: () => void;
  patientName?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProgressRings({
  todayStats,
  enabledBuckets,
  instances = [],
}: ProgressRingsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Build the list of categories to show
  // Core 4 always, optional only if they have items
  const categories = useMemo(() => {
    const result: { bucket: BucketType; itemType: string; statKey: keyof TodayStats }[] = [];

    // Core 4 always
    for (const b of CORE_BUCKETS) {
      result.push({
        bucket: b,
        itemType: BUCKET_TO_ITEM_TYPE[b],
        statKey: b === 'meals' ? 'meals' : b as keyof TodayStats,
      });
    }

    // Optional: non-core enabled buckets with items > 0
    for (const b of enabledBuckets) {
      if (CORE_SET.has(b)) continue;
      const statKey = b as keyof TodayStats;
      const stat: StatData = todayStats[statKey] ?? { completed: 0, total: 0 };
      if (stat.total > 0) {
        result.push({
          bucket: b,
          itemType: BUCKET_TO_ITEM_TYPE[b] || b,
          statKey,
        });
      }
    }

    return result;
  }, [enabledBuckets, todayStats]);

  return (
    <View style={styles.row}>
      {categories.map(({ bucket, itemType, statKey }) => {
        const stat: StatData = todayStats[statKey] ?? { completed: 0, total: 0 };
        const config = CATEGORY_CONFIG[itemType];
        if (!config) return null;

        const categoryColor = config.color;
        const overdue = isCategoryOverdue(itemType, instances);
        const isComplete = stat.total > 0 && stat.completed === stat.total;
        const isInProgress = stat.completed > 0 && !isComplete;

        // Determine text + dot color
        let dotColor = categoryColor;
        let textColor = categoryColor;
        let textOpacity = 1;

        if (overdue) {
          dotColor = '#F87171'; // red
          textColor = '#F87171';
        } else if (isComplete) {
          textOpacity = 0.5;
        } else if (isInProgress) {
          textOpacity = 0.6;
        }

        const fraction = stat.total > 0 ? `${stat.completed}/${stat.total}` : '\u2014';

        return (
          <View
            key={bucket}
            style={styles.item}
            accessibilityLabel={`${config.chipLabel} ${stat.completed} of ${stat.total}`}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.label, { color: textColor, opacity: textOpacity }]}>
              {config.chipLabel} {fraction}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
