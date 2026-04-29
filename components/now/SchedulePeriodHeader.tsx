// ============================================================================
// SCHEDULE PERIOD HEADER
//
// The MORNING / AFTERNOON / EVENING / NIGHT pill row at the top of each
// timeline group. Owns the disclosure chevron + its rotation animation +
// the one-time first-launch nudge. Expand state itself is owned by the
// parent (`TimelineSection`) so multiple groups stay in sync with the
// page-level "all collapsed by default" rule.
// ============================================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import type { PeriodStatus } from '../../utils/scheduleStatus';

const HINT_STORAGE_KEY = 'nowTabChevronHintShown';

export interface SchedulePeriodHeaderProps {
  label: string;
  icon: string;
  remainingCount: number;
  completedCount: number;
  isCollapsed: boolean;
  /** True when this is the period that contains "now" — chevron lights up. */
  isActiveWindow: boolean;
  /** Parent flag: when true and this is the active window, play the one-time
      hint and persist the storage flag. Parent decides whether the user has
      already interacted; this component just executes. */
  hintEnabled: boolean;
  onToggle: () => void;
  /** Optional Start button. Only renders when status?.kind === 'current-active'
   *  (or, in the legacy fallback path, when the period is collapsed with
   *  pending items). */
  onStart?: () => void;
  /** Caregiver-warm status. When supplied, drives the metadata label, the
   *  metadata color, and Start button visibility. When omitted, the header
   *  falls back to the count-only legacy text. */
  status?: PeriodStatus;
}

export function SchedulePeriodHeader({
  label,
  icon,
  remainingCount,
  completedCount,
  isCollapsed,
  isActiveWindow,
  hintEnabled,
  onToggle,
  onStart,
  status,
}: SchedulePeriodHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Rotate the chevron with a 180ms ease when expand state flips.
  // Collapsed → 0deg, expanded → 180deg.
  const rotation = useRef(new Animated.Value(isCollapsed ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: isCollapsed ? 0 : 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isCollapsed, rotation]);

  // First-launch hint: 15° rotation pulse over 600ms, easeInOut, once.
  // Persists `nowTabChevronHintShown=true` so it never replays.
  const hint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!hintEnabled || !isActiveWindow) return;
    // Persist the "hint shown" flag synchronously so a rapid remount or
    // crash mid-animation can't queue a replay tomorrow. The animation
    // itself is delayed 1.2s so the page has time to settle.
    Promise.resolve(AsyncStorage.setItem(HINT_STORAGE_KEY, 'true')).catch(() => {});
    const t = setTimeout(() => {
      Animated.sequence([
        Animated.timing(hint, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(hint, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);
    return () => clearTimeout(t);
  }, [hintEnabled, isActiveWindow, hint]);

  const baseRotateDeg = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const hintRotateDeg = hint.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  const chevronColor = isActiveWindow ? colors.accent : colors.textTertiary;

  // Caregiver-warm metadata. When the parent supplies a `status`, take the
  // pre-computed label + colour from there (single source of truth in
  // utils/scheduleStatus.ts). Otherwise fall back to the legacy count text
  // so older callers don't break.
  let metaLabel: string;
  let statusMetaColor: string | undefined;
  let showStart: boolean;
  if (status) {
    metaLabel = status.label;
    showStart = status.kind === 'current-active';
    switch (status.kind) {
      case 'past-incomplete':
      case 'current-active':
        statusMetaColor = colors.warning;
        break;
      case 'current-caughtup':
        statusMetaColor = colors.accent;
        break;
      case 'past-complete':
      case 'future':
      default:
        statusMetaColor = colors.textTertiary;
    }
  } else {
    metaLabel = remainingCount > 0 ? `${remainingCount} to go` : 'caught up';
    statusMetaColor = undefined;
    showStart = isCollapsed && remainingCount > 0;
  }

  const a11yMeta = status?.label ?? metaLabel;
  const a11yLabel = `${label}, ${a11yMeta}, ${isCollapsed ? 'collapsed' : 'expanded'}`;
  const a11yHint = `Double tap to ${isCollapsed ? 'expand' : 'collapse'} this period.`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      accessibilityState={{ expanded: !isCollapsed }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{label}</Text>
      <Text
        testID="period-meta"
        style={[styles.count, statusMetaColor && { color: statusMetaColor }]}
      >
        {metaLabel}
      </Text>

      {showStart && onStart && (
        <TouchableOpacity
          onPress={onStart}
          style={styles.startButton}
          activeOpacity={0.7}
          accessibilityLabel={`Start ${label} items`}
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      )}

      <Animated.Text
        testID="period-chevron"
        style={[
          styles.chevron,
          { color: chevronColor, transform: [{ rotate: baseRotateDeg }, { rotate: hintRotateDeg }] },
        ]}
      >
        {'▾'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  count: {
    flex: 1,
    fontSize: 11,
    color: c.textSecondary,
    textAlign: 'right',
  },
  startButton: {
    backgroundColor: c.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  startButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
  chevron: {
    fontSize: 12,
    paddingLeft: 4,
  },
});

export default SchedulePeriodHeader;
