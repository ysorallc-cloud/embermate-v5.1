// ============================================================================
// NOW TIMELINE — Today's Schedule section (collapsed windows + expanded view)
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { BucketType } from '../../types/carePlanConfig';
import { type TodayStats, type TimeWindow } from '../../utils/nowHelpers';
import { MorningMedsBanner } from './MorningMedsBanner';
import { TimelineSection } from './TimelineSection';

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
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>{collapsed ? '\u25B6' : '\u25BC'}</Text>
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
// WINDOW EMOJI MAP
// ============================================================================

const WINDOW_EMOJI: Record<string, string> = {
  morning: '\u2600\uFE0F',
  afternoon: '\uD83C\uDF24\uFE0F',
  evening: '\uD83C\uDF19',
  night: '\uD83C\uDF11',
};

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
        title="Today's Schedule"
        action="Care Plan"
        onAction={() => navigate('/care-plan')}
        iconAction="+"
        onIconAction={() => navigate('/quick-log-more')}
        collapsed={timelineCollapsed}
        onToggleCollapse={onToggleCollapse}
        s={s}
      />
      <Text style={s.sectionContext}>
        Tap Start when you're ready to begin a care window.
      </Text>

      {timelineCollapsed ? (
        windowSummary.length > 0 && (
          <View style={s.sectionCard}>
            {windowSummary.map((w) => (
              <TouchableOpacity
                key={w.window}
                style={[s.windowRow, w.isCurrent && !w.allDone && s.windowRowCurrent]}
                onPress={onToggleCollapse}
                activeOpacity={0.7}
                accessibilityLabel={`${w.label}, ${w.allDone ? 'complete' : `${w.pending} remaining`}. Tap to expand schedule.`}
                accessibilityRole="button"
                accessibilityState={{ expanded: false }}
              >
                <Text style={s.windowEmoji}>{WINDOW_EMOJI[w.window] ?? '\u2B50'}</Text>
                <Text style={[s.windowLabel, w.isCurrent && !w.allDone && s.windowLabelCurrent]}>
                  {w.label}
                </Text>
                <Text style={s.windowStatus}>
                  {w.allDone ? 'Complete \u2713' : `${w.pending} remaining`}
                </Text>
                {w.isCurrent && !w.allDone && (
                  <TouchableOpacity
                    style={s.windowStartBtn}
                    onPress={() => onStartRoutine(w.window)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Start ${w.label} routine`}
                    accessibilityRole="button"
                  >
                    <Text style={s.windowStartText}>Start</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <View style={s.sectionCard}>
          <MorningMedsBanner
            pendingCount={allPending.filter((i: any) => i.itemType === 'medication').length}
            pendingInstanceIds={allPending.filter((i: any) => i.itemType === 'medication').map((i: any) => i.id)}
            onConfirmAll={onBatchMedConfirm}
          />

          <TimelineSection
            allPending={allPending}
            completed={completed}
            hasRegimenInstances={hasRegimenInstances}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            onItemPress={onItemPress}
            onBatchMedConfirm={onBatchMedConfirm}
            onQuickConfirm={onQuickConfirm}
            todayStats={todayStats}
            enabledBuckets={enabledBuckets}
            waterGlasses={waterGlasses}
            waterGoal={waterGoal}
            onWaterUpdate={onWaterUpdate}
            onStartRoutine={onStartRoutine}
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
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.textTertiary,
    textTransform: 'uppercase',
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
  sectionCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  emptyTimeline: {
    backgroundColor: c.glass,
    borderRadius: 8,
    padding: 20,
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
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  windowRowCurrent: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 10,
    marginHorizontal: -4,
    paddingHorizontal: 18,
  },
  windowEmoji: {
    fontSize: 16,
  },
  windowLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: c.textSecondary,
  },
  windowLabelCurrent: {
    color: c.accent,
  },
  windowStatus: {
    flex: 1,
    fontSize: 13,
    color: c.textHalf,
  },
  windowStartBtn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  windowStartText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
