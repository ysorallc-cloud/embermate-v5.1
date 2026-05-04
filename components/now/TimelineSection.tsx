// ============================================================================
// TIMELINE SECTION - Two modes:
// A) Category expanded: inline items with Log buttons (when ring tapped)
// B) Flat "Coming Up Today" chronological list (default, no ring selected)
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_CONFIG } from '../../constants/categoryLabels';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { MedsBatchPanel } from './MedsBatchPanel';
import { WindowReceipt } from './WindowReceipt';
import { SchedulePeriodHeader } from './SchedulePeriodHeader';
import { InlineCheckbox, type InlineCheckboxState } from './InlineCheckbox';
import { SkipReasonSheet } from './SkipReasonSheet';
import { getPeriodStatus } from '../../utils/scheduleStatus';
import {
  isOverdue,
  groupByTimeWindow,
  getCurrentTimeWindow,
  type TodayStats,
  type StatData,
  type TimeWindow,
} from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel, getTimeDeltaString } from '../../utils/urgency';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET → ITEM TYPE MAPPING
// ============================================================================

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
  custom: 'custom',
};

const ITEM_TYPE_TO_LABEL: Record<string, string> = {
  medication: 'Meds',
  vitals: 'Vitals',
  nutrition: 'Meals',
  hydration: 'Water',
  sleep: 'Sleep',
  activity: 'Activity',
  wellness: 'Wellness',
  custom: 'Tasks',
};

const BUCKET_TO_ICON: Record<string, string> = {
  meds: '\uD83D\uDC8A',
  vitals: '\uD83D\uDCCA',
  meals: '\uD83C\uDF7D\uFE0F',
  water: '\uD83D\uDCA7',
  sleep: '\uD83D\uDE34',
  activity: '\uD83D\uDEB6',
  wellness: '\uD83C\uDF05',
  custom: '\uD83D\uDCCB',
};

const ITEM_TYPE_TO_DOT_COLOR: Record<string, string> = {
  medication: '#F59E0B',
  vitals: '#3B82F6',
  nutrition: '#10B981',
  hydration: '#38BDF8',
  sleep: Colors.accent,
  activity: '#F97316',
  wellness: '#EC4899',
  custom: '#A78BFA',
  errand: '#e5b04a',
  self_care: '#F472B6',
  shift: '#7DD3FC',
  appointment: Colors.accent,
};

// ============================================================================
// SUB-ITEM PROGRESS — Shows "1/3" with thin bar for grouped items (e.g. 3 med doses)
// ============================================================================

function getSubItemProgress(instance: any, allItems: any[]): { done: number; total: number } | null {
  // Group by itemName + itemType — multiple instances with the same name = sub-items
  if (!instance.itemName) return null;
  const siblings = allItems.filter(
    i => i.itemName === instance.itemName && i.itemType === instance.itemType
  );
  if (siblings.length <= 1) return null;
  const done = siblings.filter(
    i => i.status === 'completed' || i.status === 'skipped'
  ).length;
  return { done, total: siblings.length };
}

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const TIME_WINDOW_ICONS: Record<TimeWindow, string> = {
  morning: '\u2600\uFE0F',    // ☀️
  afternoon: '\uD83C\uDF24\uFE0F', // 🌤️
  evening: '\uD83C\uDF19',    // 🌙
  night: '\uD83C\uDF19',      // 🌙
};

// ============================================================================
// HELPERS
// ============================================================================

// Compact time format for the left gutter: "7a", "8a", "12p", "7p".
// Minutes shown only when non-zero: "7:30a".
function parseTimeShort(scheduledTime: string): string | null {
  if (!scheduledTime) return null;
  let date = new Date(scheduledTime);
  if (isNaN(date.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = new Date().toISOString().slice(0, 10);
    date = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  if (isNaN(date.getTime())) return null;
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'p' : 'a';
  return minutes > 0 ? `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}` : `${hour12}${ampm}`;
}

// Subtitle for the pending-item row: dosage or instructions only.
// Time is no longer included — it's shown in the left gutter column.
function getItemSubtitle(instance: any): string {
  if (instance.instructions) return instance.instructions;
  if (instance.itemDosage) return instance.itemDosage;
  return '';
}

function getTimeDelta(scheduledTime: string): { text: string; tone: 'late' | 'soon' | 'later' } | null {
  if (!scheduledTime) return null;

  const now = new Date();
  let scheduled = new Date(scheduledTime);
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  if (isNaN(scheduled.getTime())) return null;

  const diffMs = now.getTime() - scheduled.getTime();

  if (diffMs > 30 * 60 * 1000) {
    return { text: 'overdue', tone: 'late' };
  }

  if (diffMs > 0) {
    return { text: 'due now', tone: 'soon' };
  }

  // Future within 30min
  const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
  if (diffMin <= 30) {
    return { text: 'coming up', tone: 'soon' };
  }

  return null;
}

function getDotColor(instance: any): string {
  const itemIsOverdue = isOverdue(instance.scheduledTime);
  if (itemIsOverdue) {
    const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
    if (urgencyInfo.tone === 'danger') return Colors.red;
    return Colors.amber;
  }

  // Check if due soon (within 30 min)
  const now = new Date();
  let scheduled = new Date(instance.scheduledTime);
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(instance.scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${instance.scheduledTime}:00`);
  }
  if (!isNaN(scheduled.getTime())) {
    const diffMin = (scheduled.getTime() - now.getTime()) / (1000 * 60);
    if (diffMin <= 30 && diffMin > 0) return Colors.amber;
  }

  // Later - use category color but muted
  return ITEM_TYPE_TO_DOT_COLOR[instance.itemType] || 'rgba(255, 255, 255, 0.25)';
}

// ============================================================================
// PROPS
// ============================================================================

interface TimelineSectionProps {
  allPending: any[];
  completed: any[];
  hasRegimenInstances: boolean;
  selectedCategory: BucketType | null;
  onClearCategory: () => void;
  onItemPress: (instance: any) => void;
  onBatchMedConfirm?: (instanceIds: string[]) => Promise<void>;
  /**
   * Inline one-tap confirm for routine items (e.g. medications). Implementations
   * should complete the instance without navigating away from the Now screen.
   * Called by the per-row "Confirm" button added in Phase 1.
   */
  onQuickConfirm?: (instance: any) => Promise<void>;
  /** v6.7 — trailing-edge inline-checkbox tap. Instant-log + 5s toast. */
  onQuickLog?: (instance: any) => void;
  /** v6.7 — long-press skip-menu choice. Caller persists the skipReason. */
  onQuickSkip?: (instance: any, reason: 'refused' | 'too-soon' | 'other') => void;
  /** v6.7 — hydration `+` button. Adds one cup via hydrationRepo. */
  onAddCup?: (instance: any) => void;
  /** v6.7 — wellness checkbox routes to silent-vitals capture. */
  onWellnessTap?: (instance: any) => void;
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  waterGlasses?: number;
  waterGoal?: number;
  onWaterUpdate?: (glasses: number) => void;
  onStartRoutine?: (window: TimeWindow) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TimelineSection({
  allPending,
  completed,
  hasRegimenInstances,
  selectedCategory,
  onClearCategory,
  onItemPress,
  onBatchMedConfirm,
  onQuickConfirm,
  onQuickLog,
  onQuickSkip,
  onAddCup,
  onWellnessTap,
  todayStats,
  enabledBuckets,
  waterGlasses = 0,
  waterGoal = 8,
  onWaterUpdate,
  onStartRoutine,
}: TimelineSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  if (!hasRegimenInstances && selectedCategory !== 'water') return null;
  if (allPending.length === 0 && completed.length === 0 && selectedCategory !== 'water') return null;

  // ============================================================================
  // MODE W — Water Inline Counter
  // ============================================================================

  if (selectedCategory === 'water') {
    const progressPercent = Math.min((waterGlasses / waterGoal) * 100, 100);

    return (
      <View style={[styles.categoryContainer, styles.categoryContainerDefault]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryIcon}>{'\uD83D\uDCA7'}</Text>
            <Text style={styles.categoryLabel}>Water</Text>
            <Text style={styles.categoryCount}>{waterGlasses}/{waterGoal} glasses</Text>
          </View>
          <TouchableOpacity
            onPress={onClearCategory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close Water details"
            accessibilityRole="button"
          >
            <Text style={styles.categoryClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waterCounterRow}>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => onWaterUpdate?.(Math.max(0, waterGlasses - 1))}
            disabled={waterGlasses === 0}
            accessibilityLabel="Remove one glass"
            accessibilityRole="button"
          >
            <Text style={[styles.waterButtonText, waterGlasses === 0 && { opacity: 0.3 }]}>{'\u2212'}</Text>
          </TouchableOpacity>

          <View style={styles.waterDisplay}>
            <Text style={styles.waterNumber}>{waterGlasses}</Text>
          </View>

          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => onWaterUpdate?.(waterGlasses + 1)}
            accessibilityLabel="Add one glass"
            accessibilityRole="button"
          >
            <Text style={styles.waterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waterProgressBar}>
          <View style={[styles.waterProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.waterProgressText}>
          {waterGlasses >= waterGoal ? '\u2713 Goal reached!' : `${waterGoal - waterGlasses} more to go`}
        </Text>
      </View>
    );
  }

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================

  if (selectedCategory !== null) {
    const itemType = BUCKET_TO_ITEM_TYPE[selectedCategory] || selectedCategory;
    const icon = BUCKET_TO_ICON[selectedCategory] || '\uD83D\uDD14';
    const label = ITEM_TYPE_TO_LABEL[itemType] || selectedCategory;
    const statKey = selectedCategory as keyof TodayStats;
    const stat: StatData = todayStats[statKey] ?? { completed: 0, total: 0 };
    const categoryPending = allPending.filter(i => i.itemType === itemType);
    const categoryCompleted = completed.filter(i => i.itemType === itemType);

    // Merge and sort chronologically for display
    const categoryAll = [...categoryPending, ...categoryCompleted].sort((a, b) => {
      const timeA = a.scheduledTime || '';
      const timeB = b.scheduledTime || '';
      return timeA.localeCompare(timeB);
    });

    // Meds batch panel
    if (selectedCategory === 'meds' && onBatchMedConfirm) {
      return (
        <MedsBatchPanel
          pendingMeds={categoryPending}
          completedMeds={categoryCompleted}
          onBatchConfirm={onBatchMedConfirm}
          onItemPress={onItemPress}
          stat={stat}
          onClose={onClearCategory}
        />
      );
    }

    return (
      <View style={[
        styles.categoryContainer,
        styles.categoryContainerDefault,
      ]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryIcon}>{icon}</Text>
            <Text style={styles.categoryLabel}>{label}</Text>
            <Text style={styles.categoryCount}>{stat.completed}/{stat.total}</Text>
          </View>
          <TouchableOpacity
            onPress={onClearCategory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Close ${label} details`}
            accessibilityRole="button"
          >
            <Text style={styles.categoryClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        {categoryPending.length === 0 && categoryCompleted.length === 0 && (
          <Text style={styles.categoryEmptyText}>No items for {label} today</Text>
        )}

        {categoryAll.map((instance) => {
          const timeDisplay = parseTimeShort(instance.scheduledTime);
          const isPending = instance.status === 'pending' || !instance.status;
          const isMissed = instance.status === 'missed';
          const isDone = instance.status === 'completed' || instance.status === 'skipped';
          const itemIsOverdue = isPending && isOverdue(instance.scheduledTime);

          // Overdue pending → render as missed
          if (itemIsOverdue || isMissed) {
            return (
              <TouchableOpacity
                key={instance.id}
                style={styles.categoryItemRow}
                onPress={() => onItemPress(instance)}
                activeOpacity={0.7}
                accessibilityLabel={`${instance.itemName}, Missed. Tap to log.`}
                accessibilityRole="button"
              >
                <View style={[styles.statusCircle, styles.statusCircleMissed]}>
                  <Text style={styles.statusCircleMissedText}>{'\u2014'}</Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemNameMissed}>{instance.itemName}</Text>
                  <Text style={styles.categoryItemTimeDone}>
                    {timeDisplay ? `${timeDisplay} \u00B7 Missed` : 'Missed'}
                  </Text>
                </View>
                <Text style={styles.logLateText}>Log</Text>
              </TouchableOpacity>
            );
          }

          // Pending (not overdue) → show Log button
          if (isPending) {
            const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
            const statusLabel = urgencyInfo.itemUrgency
              ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
              : urgencyInfo.label;
            const timeDelta = urgencyInfo.itemUrgency
              ? getTimeDeltaString(urgencyInfo.itemUrgency)
              : null;

            return (
              <View key={instance.id} style={styles.categoryItemRow}>
                <View style={[styles.statusCircle, styles.statusCirclePending]}>
                  <Text style={styles.statusCircleText}>{'\u25CB'}</Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemName}>{instance.itemName}</Text>
                  <Text style={styles.categoryItemTime}>
                    {timeDisplay ? `${timeDisplay} \u00B7 ${statusLabel}` : statusLabel}
                    {timeDelta ? ` \u00B7 ${timeDelta}` : ''}
                  </Text>
                </View>
                {(instance.itemType === 'medication' || instance.itemType === 'nutrition') && onQuickConfirm ? (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => onQuickConfirm(instance)}
                    onLongPress={() => onItemPress(instance)}
                    activeOpacity={0.7}
                    accessibilityLabel={
                      instance.itemType === 'medication'
                        ? `Confirm ${instance.itemName}. Long press for options.`
                        : `Log ${instance.itemName}. Long press for details.`
                    }
                    accessibilityRole="button"
                    accessibilityHint={
                      instance.itemType === 'medication'
                        ? 'Long press to add notes or skip'
                        : 'Long press to add appetite or food details'
                    }
                  >
                    <Text style={styles.confirmButtonText}>
                      {instance.itemType === 'medication' ? 'Confirm' : 'Logged'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={() => onItemPress(instance)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Log ${instance.itemName}`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to log this item"
                  >
                    <Text style={styles.logButtonText}>Log</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          // Done/skipped
          const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
          return (
            <View key={instance.id} style={styles.categoryItemRow}>
              <View style={[styles.statusCircle, styles.statusCircleDone]}>
                <Text style={styles.statusCircleDoneText}>{'\u2713'}</Text>
              </View>
              <View style={styles.categoryItemDetails}>
                <Text style={styles.categoryItemNameDone}>{instance.itemName}</Text>
                <Text style={styles.categoryItemTimeDone}>
                  {timeDisplay ? `${timeDisplay} \u00B7 ${statusText}` : statusText}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // ============================================================================
  // MODE B — Clean Timeline with collapsible time groups
  // ============================================================================

  return (
    <TimelineModeBContent
      allPending={allPending}
      completed={completed}
      onItemPress={onItemPress}
      onStartRoutine={onStartRoutine}
      onQuickLog={onQuickLog}
      onQuickSkip={onQuickSkip}
      onAddCup={onAddCup}
      onWellnessTap={onWellnessTap}
    />
  );
}

// ============================================================================
// MODE B — Collapsible Time-Grouped Timeline
// ============================================================================

function TimelineModeBContent({
  allPending,
  completed,
  onItemPress,
  onStartRoutine,
  onQuickLog,
  onQuickSkip,
  onAddCup,
  onWellnessTap,
}: {
  allPending: any[];
  completed: any[];
  onItemPress: (instance: any) => void;
  onStartRoutine?: (window: TimeWindow) => void;
  onQuickLog?: (instance: any) => void;
  onQuickSkip?: (instance: any, reason: 'refused' | 'too-soon' | 'other') => void;
  onAddCup?: (instance: any) => void;
  onWellnessTap?: (instance: any) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [skipMenuFor, setSkipMenuFor] = useState<any | null>(null);
  const allItems = [...allPending, ...completed];
  const grouped = groupByTimeWindow(allItems);

  const renderTrailingAction = (instance: any) => {
    const id = instance.id;
    const status = instance.status;
    const isCompleted = status === 'completed';
    const isSkipped = status === 'skipped';

    if (instance.itemType === 'hydration') {
      return (
        <TouchableOpacity
          testID={`inline-add-cup-${id}`}
          onPress={() => onAddCup?.(instance)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add one cup of water"
          style={styles.inlineActionPlus}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.inlineActionPlusText}>{'+'}</Text>
        </TouchableOpacity>
      );
    }

    const checkboxState: InlineCheckboxState = isCompleted
      ? 'logged'
      : isSkipped
        ? 'skipped'
        : 'pending';

    const handlePress = () => {
      if (instance.itemType === 'wellness') {
        onWellnessTap?.(instance);
        return;
      }
      if (checkboxState === 'pending') {
        onQuickLog?.(instance);
      }
    };

    const handleLongPress = checkboxState === 'pending'
      ? () => setSkipMenuFor(instance)
      : undefined;

    return (
      <InlineCheckbox
        testID={`inline-checkbox-${id}`}
        state={checkboxState}
        label={instance.itemName || ''}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    );
  };

  // Change 2: Default collapse based on completion status, not time-of-day
  const [collapsedWindows, setCollapsedWindows] = useState<Set<TimeWindow>>(() => {
    const allWindows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];
    const windowGroups = groupByTimeWindow([...allPending, ...completed]);
    return new Set(allWindows.filter(w => {
      const items = windowGroups[w];
      if (items.length === 0) return false;
      // Only collapse when truly done — missed items still need attention
      const allDone = items.every(i =>
        i.status === 'completed' || i.status === 'skipped'
      );
      return allDone; // collapse completed windows, NOT missed
    }));
  });

  // First-launch chevron hint orchestration. The hint plays exactly once,
  // on the active window's chevron, only if the user hasn't already toggled
  // any window before the 1.2s delay. The persistence flag lives in
  // SchedulePeriodHeader (single source of truth — see HINT_STORAGE_KEY).
  const [hintEnabled, setHintEnabled] = useState(false);
  const interactedRef = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem('nowTabChevronHintShown')
      .then((v) => {
        if (v !== 'true' && !interactedRef.current) setHintEnabled(true);
      })
      .catch(() => {});
  }, []);

  const toggleWindow = (window: TimeWindow) => {
    interactedRef.current = true;
    if (hintEnabled) setHintEnabled(false);
    setCollapsedWindows(prev => {
      const next = new Set(prev);
      if (next.has(window)) next.delete(window);
      else next.add(window);
      return next;
    });
  };

  const currentWindow = getCurrentTimeWindow();
  const windowOrder: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <>
      {windowOrder.map((window) => {
        const items = grouped[window];
        if (items.length === 0) return null;

        const isCollapsed = collapsedWindows.has(window);
        const completedCount = items.filter(i =>
          i.status === 'completed' || i.status === 'skipped'
        ).length;
        const remainingCount = items.length - completedCount;

        // Caregiver-warm metadata + Start gating come from the helper. The
        // 'night' bucket falls outside the spec'd morning/afternoon/evening
        // domain — we leave its header on the legacy fallback (no status
        // prop) so the existing copy still renders.
        const status = window === 'night'
          ? undefined
          : getPeriodStatus(window as any, items, new Date());

        return (
          <View key={window} style={styles.timeGroup}>
            {/* ── Period banner bar (with disclosure chevron) ── */}
            <SchedulePeriodHeader
              label={TIME_WINDOW_LABELS[window]}
              icon={TIME_WINDOW_ICONS[window]}
              remainingCount={remainingCount}
              completedCount={completedCount}
              isCollapsed={isCollapsed}
              isActiveWindow={currentWindow === window}
              hintEnabled={hintEnabled && currentWindow === window}
              onToggle={() => toggleWindow(window)}
              onStart={onStartRoutine ? () => onStartRoutine(window) : undefined}
              status={status}
            />

            {/* ── Expanded items with time gutter ── */}
            {!isCollapsed && (
              <View>
                {(() => {
                  return items.map((instance: any, index: number) => {
                    const shortTime = parseTimeShort(instance.scheduledTime);
                    // Every item shows its time in the left gutter — no dedup.

                    const isDone = instance.status === 'completed' || instance.status === 'skipped';
                    const isMissed = instance.status === 'missed';
                    const isFinished = isDone || isMissed;
                    const isCompleted = instance.status === 'completed';
                    const isSkipped = instance.status === 'skipped';
                    const timeStr = parseTimeShort(instance.scheduledTime);

                    // ── Build the item content (right of divider) ──
                    let itemContent: React.ReactNode;

                    if (isCompleted) {
                      itemContent = (
                        <View style={[styles.gutterContent, { opacity: 0.4 }]} accessibilityLabel={`${instance.itemName}, logged${timeStr ? ` at ${timeStr}` : ''}`}>
                          {CATEGORY_CONFIG[instance.itemType]?.label && (
                            <Text style={[styles.typeBadge, { color: CATEGORY_CONFIG[instance.itemType]?.color || colors.textMuted, opacity: 0.6 }]}>
                              {CATEGORY_CONFIG[instance.itemType]?.label}
                            </Text>
                          )}
                          <View style={styles.gutterItemRow}>
                            <Text style={styles.timelineNameDone} numberOfLines={1}>{instance.itemName}</Text>
                            <Text style={styles.timelineStatusText}>{'\u2713'}</Text>
                          </View>
                          <Text style={styles.timelineSubDone}>{timeStr ? `Logged at ${timeStr}` : 'Logged'}</Text>
                        </View>
                      );
                    } else if (isSkipped) {
                      itemContent = (
                        <View style={[styles.gutterContent, { opacity: 0.6 }]} accessibilityLabel={`${instance.itemName}, skipped`}>
                          {CATEGORY_CONFIG[instance.itemType]?.label && (
                            <Text style={[styles.typeBadge, { color: CATEGORY_CONFIG[instance.itemType]?.color || colors.textMuted, opacity: 0.6 }]}>
                              {CATEGORY_CONFIG[instance.itemType]?.label}
                            </Text>
                          )}
                          <View style={styles.gutterItemRow}>
                            <Text style={styles.timelineNameMissed} numberOfLines={1}>{instance.itemName}</Text>
                            <Text style={styles.timelineStatusSkipped}>Skipped</Text>
                          </View>
                        </View>
                      );
                    } else if (isMissed) {
                      itemContent = (
                        <TouchableOpacity
                          style={styles.gutterContent}
                          onPress={() => onItemPress(instance)}
                          activeOpacity={0.7}
                          accessibilityLabel={`${instance.itemName}, missed. Tap to log.`}
                          accessibilityRole="button"
                          accessibilityHint="Double tap to log this item"
                        >
                          {CATEGORY_CONFIG[instance.itemType]?.label && (
                            <Text style={[styles.typeBadge, { color: CATEGORY_CONFIG[instance.itemType]?.color || colors.textMuted }]}>
                              {CATEGORY_CONFIG[instance.itemType]?.label}
                            </Text>
                          )}
                          <View style={styles.gutterItemRow}>
                            <Text style={styles.timelineNameMissed} numberOfLines={1}>{instance.itemName}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    } else {
                      // Pending
                      const subtitle = getItemSubtitle(instance);
                      itemContent = (
                        <TouchableOpacity
                          style={styles.gutterContent}
                          onPress={() => onItemPress(instance)}
                          activeOpacity={0.7}
                          accessibilityLabel={`${instance.itemName}, ${subtitle}`}
                          accessibilityRole="button"
                          accessibilityHint="Double tap to log this item"
                        >
                          {CATEGORY_CONFIG[instance.itemType]?.label && (
                            <Text style={[styles.typeBadge, { color: CATEGORY_CONFIG[instance.itemType]?.color || colors.textMuted }]}>
                              {CATEGORY_CONFIG[instance.itemType]?.label}
                            </Text>
                          )}
                          <View style={styles.gutterItemRow}>
                            <Text style={styles.timelineName} numberOfLines={1}>{instance.itemName}</Text>
                          </View>
                          {subtitle ? <Text style={styles.timelineSub} numberOfLines={1}>{subtitle}</Text> : null}
                          {(() => {
                            const progress = getSubItemProgress(instance, allItems);
                            if (!progress) return null;
                            const pct = Math.round((progress.done / progress.total) * 100);
                            return (
                              <View style={styles.subProgress}>
                                <Text style={styles.subProgressText}>{progress.done}/{progress.total}</Text>
                                <View style={styles.subProgressBar}>
                                  <View style={[styles.subProgressFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
                                </View>
                              </View>
                            );
                          })()}
                        </TouchableOpacity>
                      );
                    }

                    const dimmed = isCompleted || isSkipped;
                    return (
                      <View key={instance.id} style={styles.gutterRow}>
                        <View style={[styles.timeGutter, dimmed && styles.dimmed]}>
                          {shortTime && <Text style={styles.gutterTime}>{shortTime}</Text>}
                        </View>
                        <View style={styles.gutterDivider} />
                        <View style={[styles.gutterContentWrap, index < items.length - 1 && styles.gutterContentBorder]}>
                          <View style={styles.gutterRowInner}>
                            <View style={[styles.gutterRowBody, dimmed && styles.dimmed]}>
                              {itemContent}
                            </View>
                            <View style={styles.gutterRowTrailing}>
                              {renderTrailingAction(instance)}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            )}
          </View>
        );
      })}

      <SkipReasonSheet
        visible={skipMenuFor !== null}
        itemName={skipMenuFor?.itemName ?? ''}
        onSelectReason={(reason) => {
          if (skipMenuFor) onQuickSkip?.(skipMenuFor, reason);
          setSkipMenuFor(null);
        }}
        onAddDetails={() => {
          if (skipMenuFor) onItemPress(skipMenuFor);
          setSkipMenuFor(null);
        }}
        onClose={() => setSkipMenuFor(null)}
      />
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.glassHover,
  },
  adjustTodayLink: {
    fontSize: 12,
    fontWeight: '500',
    color: c.accent,
  },

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================
  categoryContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  categoryContainerDefault: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  categoryContainerOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: c.redFaint,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  categoryClose: {
    fontSize: 16,
    color: c.textMuted,
    padding: 4,
  },
  categoryEmptyText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: c.glassHover,
    gap: 10,
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusCirclePending: {
    borderColor: c.textMuted,
    backgroundColor: 'transparent',
  },
  statusCircleOverdue: {
    borderColor: c.red,
    backgroundColor: c.redFaint,
  },
  statusCircleDone: {
    borderColor: c.green,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  statusCircleText: {
    fontSize: 12,
    color: c.textMuted,
  },
  statusCircleDoneText: {
    fontSize: 12,
    color: c.green,
    fontWeight: '600',
  },
  statusCircleMissed: {
    borderColor: c.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  statusCircleMissedText: {
    fontSize: 12,
    color: c.amber,
    fontWeight: '600',
  },
  categoryItemDetails: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  categoryItemNameDone: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textTertiary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  categoryItemNameMissed: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textTertiary,
    marginBottom: 2,
  },
  categoryItemTime: {
    fontSize: 12,
    color: c.textMuted,
  },
  categoryItemTimeOverdue: {
    color: c.red,
  },
  categoryItemTimeDone: {
    fontSize: 12,
    color: c.textMuted,
  },
  logButton: {
    backgroundColor: c.glassActive,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 7,
    borderRadius: 12,
  },
  // Inline one-tap confirm button (Phase 1B). Filled accent so it reads as
  // the primary action; long-press still opens the full log screen.
  confirmButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a0c0a',
  },
  logButtonOverdue: {
    backgroundColor: c.redMuted,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // ============================================================================
  // MODE B — Time Gutter Timeline
  // ============================================================================
  timeGroup: {
    marginBottom: 2,
  },
  // ── Period header banner ──
  windowBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: 'rgba(46, 125, 80, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 10,
    marginBottom: 2,
    marginTop: 8,
  },
  windowIcon: {
    fontSize: 14,
  },
  windowBannerTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: c.textPrimary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  windowBannerCount: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500' as const,
    color: c.textMuted,
  },
  startRoutineButton: {
    backgroundColor: c.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  startRoutineText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: c.background,
  },
  // ── Time gutter layout ──
  gutterRow: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    minHeight: 44,
  },
  timeGutter: {
    width: 52,
    paddingRight: 10,
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-end' as const,
    paddingTop: 10,
  },
  gutterTime: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: c.accent,
  },
  gutterDivider: {
    width: 1.5,
    backgroundColor: c.accent,
    opacity: 0.3,
  },
  gutterContentWrap: {
    flex: 1,
  },
  gutterContentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.hairlineInset,
  },
  gutterContent: {
    flex: 1,
    paddingLeft: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 8,
  },
  gutterRowInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  gutterRowBody: {
    flex: 1,
  },
  gutterRowTrailing: {
    paddingRight: 12,
    paddingLeft: 8,
  },
  // Logged / skipped time + body opacity per v6.7 spec — strikethrough is
  // applied separately on the name only (timelineNameDone above).
  dimmed: {
    opacity: 0.5,
  },
  inlineActionPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  inlineActionPlusText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: c.accent,
    lineHeight: 18,
  },
  gutterItemRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  // Timeline item (pending)
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  timelineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassFaint,
  },
  timelineDotWrap: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineItemBody: {
    flex: 1,
  },
  typeBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  // Sub-item progress (e.g., "1/3" with thin bar for meds with multiple doses)
  subProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  subProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
  },
  subProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: c.glassHover,
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 60,
  },
  subProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timelineName: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 1,
  },
  timelineSub: {
    fontSize: 10,
    color: c.textMuted,
  },

  // Log button for pending items in time windows
  timelineLogButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timelineLogButtonText: {
    // Bumped from 9 → 11 (a11y minimum on interactive labels). The pill's
    // paddingVertical/Horizontal absorb the slightly taller glyph.
    fontSize: 11,
    fontWeight: '600',
    color: c.accent,
  },

  // Timeline badges (right side)
  timelineBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassActive,
  },
  timelineBadgeLate: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  timelineBadgeSoon: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  timelineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  timelineBadgeTextLate: {
    color: '#FCA5A5',
  },
  timelineBadgeTextSoon: {
    color: c.amber,
  },

  // Timeline item (done/missed)
  timelineItemDone: {
    opacity: 0.5,
  },
  timelineDotDone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotMissed: {
    backgroundColor: 'rgba(245, 158, 11, 0.7)',
  },
  timelineDotDoneIcon: {
    fontSize: 0,
    fontWeight: '700',
    color: c.green,
  },
  timelineDotMissedIcon: {
    color: c.amber,
  },
  timelineNameDone: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    textDecorationLine: 'line-through',
    textDecorationColor: c.glassSubtle,
    marginBottom: 1,
  },
  timelineNameMissed: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    marginBottom: 1,
  },
  timelineSubDone: {
    fontSize: 10,
    color: c.textMuted,
  },
  timelineStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(16, 185, 129, 0.5)',
  },
  timelineStatusSkipped: {
    fontSize: 11,
    fontWeight: '600',
    color: c.amber,
  },
  timelineStatusMissed: {
    color: 'rgba(245, 158, 11, 0.6)',
  },
  logLateText: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: c.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // ============================================================================
  // Water Inline Counter
  // ============================================================================
  waterCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  waterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.glassBorder,
    borderWidth: 1,
    borderColor: c.glassSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: c.accent,
  },
  waterDisplay: {
    alignItems: 'center',
  },
  waterNumber: {
    fontSize: 48,
    fontWeight: '200',
    color: c.textPrimary,
  },
  waterProgressBar: {
    height: 6,
    backgroundColor: c.glassBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  waterProgressText: {
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'center',
  },
});
