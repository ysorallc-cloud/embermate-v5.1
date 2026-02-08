// ============================================================================
// PROGRESS RINGS - Care Plan Progress Dashboard
// Provides fast reassurance: "Are we generally okay?"
// CALM URGENCY: Pass nextUp for above-fold constraint
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../theme/theme-tokens';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import { getUrgencyStatus, getCategoryUrgencyStatus, type UrgencyStatus } from '../../utils/nowUrgency';
import type { UrgencyTier, UrgencyTone } from '../../utils/urgency';
import type { BucketType } from '../../types/carePlanConfig';

interface ProgressRingsProps {
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  nextUp: any | null;
  instances: any[];
  onTileTap: (type: 'meds' | 'vitals' | 'mood' | 'meals') => void;
}

export function ProgressRings({ todayStats, enabledBuckets, nextUp, instances, onTileTap }: ProgressRingsProps) {
  // Track how many critical tiles we've rendered (for above-fold cap)
  let criticalTileCount = 0;

  const renderProgressRing = (
    icon: string,
    label: string,
    stat: StatData,
    onPress: () => void,
    itemType?: string,
  ) => {
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(stat.completed, stat.total);
    const dashoffset = calculateStrokeDashoffset(percent);
    const circumference = 2 * Math.PI * 21;

    // Compute if Next Up is critical (for above-fold constraint)
    let nextUpIsCritical = false;
    if (nextUp) {
      const nextUpUrgency = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);
      nextUpIsCritical = nextUpUrgency.tier === 'critical';
    }

    // Get urgency status using Calm Urgency system with above-fold constraint
    const urgencyResult = itemType
      ? getCategoryUrgencyStatus(instances, itemType, stat, {
          hasCriticalNextUp: nextUpIsCritical,
          criticalTileCount,
        })
      : { status: 'NOT_APPLICABLE' as UrgencyStatus, tier: 'info' as UrgencyTier, tone: 'neutral' as UrgencyTone, label: '', isCritical: false };

    // Track critical tiles for above-fold constraint
    if (urgencyResult.isCritical) {
      criticalTileCount++;
    }

    // Determine stroke color based on Calm Urgency tier/tone
    const getStrokeColorWithUrgency = () => {
      if (status === 'complete') return Colors.green;
      if (nextUp) {
        if (status === 'partial' || status === 'missing') return Colors.toneNeutralBorder;
        return Colors.toneNeutralBorder;
      }
      if (urgencyResult.tone === 'danger') return Colors.toneDanger;
      if (urgencyResult.tone === 'warn') return Colors.toneWarn;
      if (status === 'partial' || status === 'missing') return Colors.toneWarn;
      return Colors.toneNeutralBorder;
    };

    const strokeColor = getStrokeColorWithUrgency();

    // Determine display text based on status and Calm Urgency tier
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
        statText = '—';
        statusLabel = 'not tracked';
        break;
    }

    const isTappable = status !== 'inactive';

    // Get urgency-based tile styling
    const getTileUrgencyStyle = () => {
      if (nextUp) {
        if (status === 'complete') return null;
        return null;
      }
      if (urgencyResult.tone === 'danger') return styles.checkinItemOverdue;
      if (urgencyResult.tone === 'warn') return styles.checkinItemDueSoon;
      return null;
    };

    return (
      <TouchableOpacity
        key={label}
        style={[
          styles.checkinItem,
          !isTappable && styles.checkinItemInactive,
          getTileUrgencyStyle(),
        ]}
        onPress={isTappable ? onPress : undefined}
        activeOpacity={isTappable ? 0.7 : 1}
        accessible={true}
        accessibilityRole={isTappable ? "button" : "text"}
        accessibilityLabel={`${label}. ${statText} ${statusLabel}`}
        accessibilityHint={isTappable ? `Tap to log ${label.toLowerCase()}` : undefined}
      >
        <View style={styles.ringContainer}>
          <Svg width={50} height={50} style={styles.progressRing}>
            <Circle
              cx={25}
              cy={25}
              r={21}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={4}
              fill="none"
            />
            <Circle
              cx={25}
              cy={25}
              r={21}
              stroke={strokeColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              fill="none"
              rotation={-90}
              origin="25, 25"
            />
          </Svg>
          <Text style={styles.ringIcon}>{icon}</Text>
        </View>
        <Text style={styles.checkinLabel}>{label}</Text>
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
        {(enabledBuckets.length === 0 || enabledBuckets.includes('meds' as BucketType)) &&
          renderProgressRing('💊', 'Meds', todayStats.meds, () => onTileTap('meds'), 'medication')}
        {(enabledBuckets.length === 0 || enabledBuckets.includes('vitals' as BucketType)) &&
          renderProgressRing('📊', 'Vitals', todayStats.vitals, () => onTileTap('vitals'), 'vitals')}
        {(enabledBuckets.length === 0 || enabledBuckets.includes('mood' as BucketType)) &&
          renderProgressRing('😊', 'Mood', todayStats.mood, () => onTileTap('mood'), 'mood')}
        {(enabledBuckets.length === 0 || enabledBuckets.includes('meals' as BucketType)) &&
          renderProgressRing('🍽️', 'Meals', todayStats.meals, () => onTileTap('meals'), 'nutrition')}
      </View>
    </View>
  );
}

// Helper functions
function getProgressPercent(completed: number, total: number) {
  return total > 0 ? (completed / total) * 100 : 0;
}

function getProgressStatus(completed: number, total: number): 'complete' | 'partial' | 'missing' | 'inactive' {
  if (total === 0) return 'inactive';
  if (completed === total) return 'complete';
  if (completed > 0) return 'partial';
  return 'missing';
}

function calculateStrokeDashoffset(percent: number) {
  const circumference = 2 * Math.PI * 21;
  return circumference * (1 - percent / 100);
}

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
  ringContainer: {
    width: 50,
    height: 50,
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
    fontSize: 10,
    fontWeight: '500',
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
