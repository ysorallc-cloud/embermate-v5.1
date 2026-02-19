// ============================================================================
// PROGRESS RINGS - Care Plan Progress Dashboard
// Large circular rings per category with urgency-aware status labels.
// Tappable to filter the timeline section by category.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../theme/theme-tokens';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import { getUrgencyStatus, getCategoryUrgencyStatus, type UrgencyStatus } from '../../utils/nowUrgency';
import type { UrgencyTier, UrgencyTone } from '../../utils/urgency';
import type { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET → RING MAPPING
// ============================================================================

interface RingItem {
  bucket: BucketType;
  icon: string;
  label: string;
  statKey: keyof TodayStats;
  itemType: string;
}

const BUCKET_RING_MAP: Record<string, Omit<RingItem, 'bucket'>> = {
  meds:      { icon: '\uD83D\uDC8A', label: 'Meds',     statKey: 'meds',     itemType: 'medication' },
  vitals:    { icon: '\uD83D\uDCCA', label: 'Vitals',   statKey: 'vitals',   itemType: 'vitals' },
  meals:     { icon: '\uD83C\uDF7D\uFE0F', label: 'Meals',    statKey: 'meals',    itemType: 'nutrition' },
  water:     { icon: '\uD83D\uDCA7', label: 'Water',    statKey: 'water',    itemType: 'hydration' },
  sleep:     { icon: '\uD83D\uDE34', label: 'Sleep',    statKey: 'sleep',    itemType: 'sleep' },
  activity:  { icon: '\uD83D\uDEB6', label: 'Activity', statKey: 'activity', itemType: 'activity' },
  wellness:  { icon: '\uD83C\uDF05', label: 'Wellness', statKey: 'wellness', itemType: 'wellness' },
};

const DEFAULT_BUCKETS: BucketType[] = ['meds', 'vitals', 'meals', 'wellness'];

// ============================================================================
// PROPS
// ============================================================================

interface ProgressRingsProps {
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  nextUp: any | null;
  instances: any[];
  selectedCategory?: BucketType | null;
  onRingPress?: (bucket: BucketType) => void;
  patientName?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getProgressPercent(completed: number, total: number) {
  return total > 0 ? (completed / total) * 100 : 0;
}

function getProgressStatus(completed: number, total: number): 'complete' | 'partial' | 'missing' | 'inactive' {
  if (total === 0) return 'inactive';
  if (completed === total) return 'complete';
  if (completed > 0) return 'partial';
  return 'missing';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProgressRings({
  todayStats,
  enabledBuckets,
  nextUp,
  instances,
  selectedCategory,
  onRingPress,
}: ProgressRingsProps) {
  // Build dynamic items from enabled buckets
  const ringItems: RingItem[] = useMemo(() => {
    const buckets = enabledBuckets.length > 0 ? enabledBuckets : DEFAULT_BUCKETS;
    return buckets
      .filter(b => BUCKET_RING_MAP[b])
      .map(b => ({ bucket: b, ...BUCKET_RING_MAP[b] }));
  }, [enabledBuckets]);

  // Track how many critical tiles we've rendered (for above-fold cap)
  let criticalTileCount = 0;

  const renderProgressRing = (item: RingItem) => {
    const stat: StatData = todayStats[item.statKey] ?? { completed: 0, total: 0 };
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(stat.completed, stat.total);
    const isSelected = selectedCategory === item.bucket;

    const radius = 24;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - percent / 100);

    // Compute if Next Up is critical (for above-fold constraint)
    let nextUpIsCritical = false;
    if (nextUp) {
      const nextUpUrgency = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);
      nextUpIsCritical = nextUpUrgency.tier === 'critical';
    }

    // Get urgency status using Calm Urgency system
    const urgencyResult = item.itemType
      ? getCategoryUrgencyStatus(instances, item.itemType, stat, {
          hasCriticalNextUp: nextUpIsCritical,
          criticalTileCount,
        })
      : { status: 'NOT_APPLICABLE' as UrgencyStatus, tier: 'info' as UrgencyTier, tone: 'neutral' as UrgencyTone, label: '', isCritical: false };

    if (urgencyResult.isCritical) {
      criticalTileCount++;
    }

    // Determine stroke color
    const getStrokeColor = () => {
      if (status === 'complete') return Colors.green;
      if (urgencyResult.tone === 'danger') return Colors.red;
      if (urgencyResult.tone === 'warn') return Colors.amber;
      if (status === 'partial') return '#3B82F6';
      return 'rgba(255, 255, 255, 0.25)';
    };

    const strokeColor = getStrokeColor();

    // Determine display text based on status and urgency tier
    let statText = '';
    let statusLabel = '';
    let statusStyle = `stat_${status}` as keyof typeof styles;

    switch (status) {
      case 'complete':
        statText = `${stat.completed}/${stat.total}`;
        statusLabel = 'complete';
        break;
      case 'partial':
      case 'missing':
        statText = `${stat.completed}/${stat.total}`;
        if (urgencyResult.tier === 'critical') {
          statusLabel = 'late';
          statusStyle = 'stat_overdue' as keyof typeof styles;
        } else if (urgencyResult.tier === 'attention' && urgencyResult.status === 'OVERDUE') {
          statusLabel = 'due earlier';
          statusStyle = 'stat_due_soon' as keyof typeof styles;
        } else if (urgencyResult.tier === 'attention') {
          statusLabel = 'still to do';
          statusStyle = 'stat_due_soon' as keyof typeof styles;
        } else if (urgencyResult.tier === 'info') {
          statusLabel = 'later today';
          statusStyle = 'stat_later' as keyof typeof styles;
        } else {
          statusLabel = status === 'partial' ? 'in progress' : 'available';
        }
        break;
      case 'inactive':
        statText = '\u2014';
        statusLabel = 'not tracked';
        break;
    }

    // Urgency-based tile border/background
    const getTileUrgencyStyle = () => {
      if (status === 'complete') return null;
      if (urgencyResult.tone === 'danger') return styles.checkinItemOverdue;
      if (urgencyResult.tone === 'warn') return styles.checkinItemDueSoon;
      return null;
    };

    const svgSize = (radius + strokeWidth) * 2;
    const center = svgSize / 2;

    return (
      <TouchableOpacity
        key={item.bucket}
        style={[
          styles.checkinItem,
          status === 'inactive' && styles.checkinItemInactive,
          getTileUrgencyStyle(),
          isSelected && styles.checkinItemSelected,
        ]}
        onPress={() => onRingPress?.(item.bucket)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.label}. ${statText} ${statusLabel}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <View style={[styles.ringContainer, { width: svgSize, height: svgSize }]}>
          <Svg width={svgSize} height={svgSize} style={styles.progressRing}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {percent > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                fill="none"
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            )}
          </Svg>
          <Text style={styles.ringIcon}>{item.icon}</Text>
        </View>
        <Text style={styles.checkinLabel}>{item.label}</Text>
        <Text style={[styles.checkinStat, styles[statusStyle] || styles.stat_missing]}>
          {statText}
        </Text>
        <Text style={[styles.checkinStatusLabel, styles[statusStyle] || styles.stat_missing]}>
          {statusLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>CARE PLAN PROGRESS</Text>
      <View style={styles.progressGrid}>
        {ringItems.map(item => renderProgressRing(item))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  progressSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  checkinItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  checkinItemInactive: {
    opacity: 0.6,
  },
  checkinItemOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  checkinItemDueSoon: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
  },
  checkinItemSelected: {
    borderColor: 'rgba(20, 184, 166, 0.6)',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
  },
  ringContainer: {
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringIcon: {
    fontSize: 24,
    position: 'absolute',
  },
  checkinLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  checkinStat: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkinStatusLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  stat_complete: {
    color: '#10B981',
  },
  stat_partial: {
    color: '#F59E0B',
  },
  stat_missing: {
    color: '#F59E0B',
  },
  stat_inactive: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
  stat_overdue: {
    color: '#EF4444',
  },
  stat_due_soon: {
    color: '#F59E0B',
  },
  stat_later: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
