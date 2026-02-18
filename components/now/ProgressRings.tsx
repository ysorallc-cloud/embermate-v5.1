// ============================================================================
// PROGRESS RINGS - Care Plan Progress Dashboard (View-Only)
// Provides fast reassurance: "Are we generally okay?"
// Pure visual — no tap interaction
// Paginated carousel when >4 items enabled
// ============================================================================

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
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
  itemType: string; // care task itemType for urgency lookup
}

const BUCKET_RING_MAP: Record<string, Omit<RingItem, 'bucket'>> = {
  meds:      { icon: '💊', label: 'Meds',     statKey: 'meds',     itemType: 'medication' },
  vitals:    { icon: '📊', label: 'Vitals',   statKey: 'vitals',   itemType: 'vitals' },
  meals:     { icon: '🍽️', label: 'Meals',    statKey: 'meals',    itemType: 'nutrition' },
  water:     { icon: '💧', label: 'Water',    statKey: 'water',    itemType: 'hydration' },
  sleep:     { icon: '😴', label: 'Sleep',    statKey: 'sleep',    itemType: 'sleep' },
  activity:  { icon: '🚶', label: 'Activity', statKey: 'activity', itemType: 'activity' },
  wellness:  { icon: '🌅', label: 'Wellness', statKey: 'wellness', itemType: 'wellness' },
};

// Default buckets shown when none are enabled (backwards compat)
const DEFAULT_BUCKETS: BucketType[] = ['meds', 'vitals', 'meals', 'wellness'];

const ITEMS_PER_PAGE = 4;

// ============================================================================
// PROPS
// ============================================================================

interface ProgressRingsProps {
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  nextUp: any | null;
  instances: any[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProgressRings({ todayStats, enabledBuckets, nextUp, instances }: ProgressRingsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Build dynamic ring items from enabled buckets
  const ringItems: RingItem[] = useMemo(() => {
    const buckets = enabledBuckets.length > 0 ? enabledBuckets : DEFAULT_BUCKETS;
    return buckets
      .filter(b => BUCKET_RING_MAP[b]) // skip appointments etc. that have no ring
      .map(b => ({ bucket: b, ...BUCKET_RING_MAP[b] }));
  }, [enabledBuckets]);

  const totalPages = Math.ceil(ringItems.length / ITEMS_PER_PAGE);
  const showCarousel = ringItems.length > ITEMS_PER_PAGE;

  // Track how many critical tiles we've rendered (for above-fold cap)
  let criticalTileCount = 0;

  // Compute if Next Up is critical (shared across all rings)
  const nextUpIsCritical = useMemo(() => {
    if (!nextUp) return false;
    const nextUpUrgency = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);
    return nextUpUrgency.tier === 'critical';
  }, [nextUp]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth === 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
    setCurrentPage(page);
  }, [containerWidth]);

  const goToPage = useCallback((page: number) => {
    if (scrollRef.current && containerWidth > 0) {
      scrollRef.current.scrollTo({ x: page * containerWidth, animated: true });
      setCurrentPage(page);
    }
  }, [containerWidth]);

  // ============================================================================
  // RENDER SINGLE RING
  // ============================================================================

  const renderProgressRing = (item: RingItem) => {
    const stat: StatData = todayStats[item.statKey] ?? { completed: 0, total: 0 };
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(stat.completed, stat.total);
    const radius = 24;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - percent / 100);

    // Get urgency status using Calm Urgency system with above-fold constraint
    const urgencyResult = getCategoryUrgencyStatus(instances, item.itemType, stat, {
      hasCriticalNextUp: nextUpIsCritical,
      criticalTileCount,
    });

    // Track critical tiles for above-fold constraint
    if (urgencyResult.isCritical) {
      criticalTileCount++;
    }

    // Determine stroke color
    const getStrokeColor = () => {
      if (status === 'complete') return Colors.green;
      if (urgencyResult.tone === 'danger') return Colors.red;
      if (urgencyResult.tone === 'warn') return Colors.amber;
      if (status === 'partial') return Colors.blue;
      return Colors.textDisabled;
    };

    const strokeColor = getStrokeColor();

    // Determine display text
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

    const svgSize = (radius + strokeWidth) * 2;
    const center = svgSize / 2;

    return (
      <View
        key={item.bucket}
        style={[
          styles.checkinItem,
          status === 'inactive' && styles.checkinItemInactive,
          getTileUrgencyStyle(),
        ]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${item.label}. ${statText} ${statusLabel}`}
      >
        <View style={[styles.ringContainer, { width: svgSize, height: svgSize }]}>
          <Svg width={svgSize} height={svgSize} style={styles.progressRing}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={Colors.glassActive}
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
      </View>
    );
  };

  // ============================================================================
  // RENDER PAGE
  // ============================================================================

  const renderPage = (pageIndex: number) => {
    const start = pageIndex * ITEMS_PER_PAGE;
    const pageItems = ringItems.slice(start, start + ITEMS_PER_PAGE);

    // Pad with empty flex spacers so items keep consistent width
    const empties = ITEMS_PER_PAGE - pageItems.length;

    return (
      <View
        key={pageIndex}
        style={[styles.progressGrid, containerWidth > 0 && { width: containerWidth }]}
      >
        {pageItems.map(item => renderProgressRing(item))}
        {empties > 0 && Array.from({ length: empties }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.checkinItemEmpty} />
        ))}
      </View>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!showCarousel) {
    // Simple layout — no carousel needed
    return (
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>CARE PLAN PROGRESS</Text>
        <View style={styles.progressGrid}>
          {ringItems.map(item => renderProgressRing(item))}
        </View>
      </View>
    );
  }

  // Carousel layout
  return (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>CARE PLAN PROGRESS</Text>
      <View onLayout={handleLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {Array.from({ length: totalPages }).map((_, i) => renderPage(i))}
        </ScrollView>
      </View>

      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => goToPage(i)}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Page ${i + 1} of ${totalPages}`}
          >
            <View
              style={[
                styles.dot,
                i === currentPage && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProgressPercent(completed: number, total: number) {
  return total > 0 ? Math.min((completed / total) * 100, 100) : 0;
}

function getProgressStatus(completed: number, total: number): 'complete' | 'partial' | 'missing' | 'inactive' {
  if (total === 0) return 'inactive';
  if (completed >= total) return 'complete';
  if (completed > 0) return 'partial';
  return 'missing';
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
    color: Colors.textHalf,
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
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  checkinItemEmpty: {
    flex: 1,
    // Invisible spacer to maintain 4-column layout on partial last page
  },
  checkinItemInactive: {
    opacity: 0.6,
  },
  checkinItemOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: Colors.redFaint,
  },
  checkinItemDueSoon: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
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
    color: Colors.textPrimary,
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
    color: Colors.green,
  },
  stat_partial: {
    color: Colors.amber,
  },
  stat_missing: {
    color: Colors.amber,
  },
  stat_inactive: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
  stat_overdue: {
    color: Colors.red,
  },
  stat_due_soon: {
    color: Colors.amber,
  },
  stat_later: {
    color: Colors.textHalf,
  },

  // Carousel dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.glassStrong,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
