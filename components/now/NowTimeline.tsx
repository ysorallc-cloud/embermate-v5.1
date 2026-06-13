// ============================================================================
// NOW TIMELINE — Today's Schedule section (collapsed windows + expanded view)
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import { navigate } from '../../lib/navigate';
import { BucketType } from '../../types/carePlanConfig';
import { type TodayStats, type TimeWindow } from '../../utils/nowHelpers';
// Phase 15.3 — MorningMedsBanner lifted to app/(tabs)/now.tsx so it
// renders ABOVE StatRings rather than nested inside the schedule
// section card. The banner consumes pendingCount/pendingInstanceIds
// derived from allPending; both the derivation and the render moved
// to now.tsx. onBatchMedConfirm stays in NowTimeline's prop surface
// because TimelineSection's filtered-meds path still consumes it
// for its own batch-confirm CTA inside the schedule.
import { TimelineSection } from './TimelineSection';
import { ScheduleCard, type ScheduleWindow } from './ScheduleCard';
import { FlatTimelineFeed } from './FlatTimelineFeed';

// ============================================================================
// TYPES
// ============================================================================

export interface WindowSummaryItem {
  window: TimeWindow;
  label: string;
  total: number;
  completed: number;
  pending: number;
  allDone: boolean;
  isCurrent: boolean;
}

export interface NowTimelineProps {
  timelineCollapsed: boolean;
  onToggleCollapse: () => void;
  windowSummary: WindowSummaryItem[];
  allPending: any[];
  completed: any[];
  hasRegimenInstances: boolean;
  hasBucketCarePlan: boolean;
  hasCarePlan: boolean;
  selectedCategory: BucketType | null;
  onClearCategory: () => void;
  onItemPress: (instance: any) => void;
  onBatchMedConfirm: (ids: string[]) => Promise<void>;
  onQuickConfirm: (instance: any) => Promise<void>;
  /** v6.7 — trailing-edge inline-checkbox tap. Instant log + 5s LogToast. */
  onQuickLog?: (instance: any) => void;
  /** v6.7 — long-press skip menu choice. Persists skipReason on the log. */
  onQuickSkip?: (instance: any, reason: 'refused' | 'too-soon' | 'other') => void;
  /** Phase 35 Slice 3-D — long-press on a done row → immediate undo via
   *  the canonical undoInstanceCompletion + 5s Redo toast. Symmetric
   *  with the pending-row long-press skip gesture. */
  onUndoCompleted?: (instance: any) => void;
  /** v6.7 — hydration `+` button. Adds one cup via hydrationRepo. */
  onAddCup?: (instance: any) => void;
  /** v6.7 — wellness checkbox routes to silent-vitals capture. */
  onWellnessTap?: (instance: any) => void;
  onStartRoutine: (window: TimeWindow) => void;
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  waterGlasses: number;
  waterGoal: number;
  onWaterUpdate: (glasses: number) => void;
}

// ============================================================================
// SECTION HEADER ROW (inline component)
// ============================================================================

function SectionHeaderRow({
  title,
  action,
  onAction,
  collapsed,
  onToggleCollapse,
  iconAction,
  onIconAction,
  s,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  iconAction?: string;
  onIconAction?: () => void;
  s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={s.sectionHeaderRow}>
      {onToggleCollapse ? (
        <TouchableOpacity
          onPress={onToggleCollapse}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${collapsed ? 'collapsed, tap to expand' : 'expanded, tap to collapse'}`}
          accessibilityState={{ expanded: !collapsed }}
        >
          <Text style={s.sectionHeaderTitle}>{title}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.sectionHeaderTitle}>{title}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {iconAction && onIconAction && (
          <TouchableOpacity
            onPress={onIconAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Quick log"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.sectionHeaderIcon}>{iconAction}</Text>
          </TouchableOpacity>
        )}
        {action && onAction && (
          <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={action}>
            <Text style={s.sectionHeaderAction}>{action} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NowTimeline({
  timelineCollapsed,
  onToggleCollapse,
  windowSummary,
  allPending,
  completed,
  hasRegimenInstances,
  hasBucketCarePlan,
  hasCarePlan,
  selectedCategory,
  onClearCategory,
  onItemPress,
  onBatchMedConfirm,
  onQuickConfirm,
  onQuickLog,
  onQuickSkip,
  onUndoCompleted,
  onAddCup,
  onWellnessTap,
  onStartRoutine,
  todayStats,
  enabledBuckets,
  waterGlasses,
  waterGoal,
  onWaterUpdate,
}: NowTimelineProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <SectionHeaderRow
        // UX-2 pre-launch — header `+` retired. The QuickLogFAB on Now
        // is the canonical quick-add entry; the duplicate header icon
        // adds nothing and clutters the schedule chrome. Care Plan →
        // action stays as the bucket-config drilldown.
        title="Today's Schedule"
        action="Care Plan"
        onAction={() => navigate('/care-plan')}
        collapsed={timelineCollapsed}
        onToggleCollapse={onToggleCollapse}
        s={s}
      />
      {/* "Tap Start" helper removed — schedule card is self-evident */}

      {timelineCollapsed ? (
        <ScheduleCard
          windows={windowSummary.map<ScheduleWindow>(w => ({
            window: w.window,
            name: w.label,
            status: w.allDone ? 'complete' : 'pending',
            remaining: w.pending,
            isActive: w.isCurrent && !w.allDone,
          }))}
          onStart={onStartRoutine}
          onRowPress={onToggleCollapse}
        />
      ) : (
        // Post-F7 followup (2026-06-13) — schedule floats on page bg.
        // Wrapper carries ONLY the inter-section bottom rhythm
        // (Spacing.md, ~20pt) — no backgroundColor / no border / no
        // padding / no radius. The pre-fix `sectionCard` style carried
        // all of those plus the same marginBottom; the de-card retains
        // the rhythm in a chrome-less wrapper.
        <View style={s.timelineFloat}>
          <FlatTimelineFeed
            allPending={allPending}
            completed={completed}
            onItemPress={onItemPress}
          />

          {!hasRegimenInstances && !hasBucketCarePlan && !hasCarePlan && (
            <View style={s.emptyTimeline}>
              <Text style={s.emptyTimelineText}>No Care Plan set up yet</Text>
              <Text style={s.emptyTimelineSubtext}>Add medications or items to see your timeline</Text>
            </View>
          )}

          {!hasRegimenInstances && (hasBucketCarePlan || hasCarePlan) && (
            <View style={s.emptyTimeline}>
              <Text style={s.emptyTimelineText}>No items scheduled for today</Text>
              <Text style={s.emptyTimelineSubtext}>Check your Care Plan settings</Text>
            </View>
          )}

          {hasRegimenInstances && allPending.length === 0 && completed.length === 0 && (
            <View style={s.emptyTimeline}>
              <Text style={s.emptyTimelineText}>No items scheduled for today</Text>
            </View>
          )}
        </View>
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  sectionContext: {
    fontSize: 11,
    color: c.textWarmHint,
    marginTop: 3,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.textTertiary,
  },
  sectionHeaderAction: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500',
  },
  sectionHeaderIcon: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: c.accent,
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: 'center' as const,
    borderRadius: 13,
    backgroundColor: c.accentLight,
    overflow: 'hidden' as const,
  },
  timelineFloat: {
    marginBottom: Spacing.md,
  },
  emptyTimeline: {
    backgroundColor: c.glass,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: c.textHalf,
  },
  emptyTimelineSubtext: {
    fontSize: 12,
    color: c.textDisabled,
    marginTop: 4,
  },
});
