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
  /** Retired in UX-2 follow-up — "Start" affordance per period row was
   *  dropped (one status per row contract). The prop stays in the API
   *  surface so existing callers (TimelineSection, NowTimeline) don't
   *  need to be re-plumbed; the handler is silently unused at render
   *  time. The full routine-batch entry now comes from inside the
   *  expanded timeline via the per-item rows. */
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
  //
  // UX-2 follow-up — the per-period "Start" affordance was retired; the
  // `showStart` derivation that used to live in this block went with it.
  let metaLabel: string;
  let statusMetaColor: string | undefined;
  if (status) {
    metaLabel = status.label;
    // Phase 3.8.2 — palette mapping:
    //   • current-active → sage (draws the eye to the period the user
    //     should focus on right now)
    //   • current-caughtup → sage (positive completion in the active window)
    //   • past-complete → sage (positive completion overall)
    //   • past-incomplete → textSecondary (warm cream, NOT amber —
    //     "N to go" reads as gentle nudge, not alarm)
    //   • future → textTertiary (quiet "not yet")
    // colors.warning retired from this file; the 3-accent budget
    // (sage / lavender / criticalAlert) is enforced from Phase 7
    // forward.
    switch (status.kind) {
      case 'current-active':
      case 'current-caughtup':
      case 'past-complete':
        statusMetaColor = colors.accent;
        break;
      case 'past-incomplete':
        statusMetaColor = colors.textSecondary;
        break;
      case 'future':
      default:
        statusMetaColor = colors.textTertiary;
    }
  } else {
    metaLabel = remainingCount > 0 ? `${remainingCount} to go` : 'caught up';
    statusMetaColor = undefined;
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

      {/* UX-2 follow-up — per-period "Start" button retired. One status
          per row contract: emoji + label + count meta + chevron only.
          The showStart / status?.kind === 'current-active' gate stays in
          the local logic above so the metadata color still tints the
          current-active row, but the button JSX is gone. */}

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
    padding: 12,
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
  chevron: {
    fontSize: 12,
    paddingLeft: 4,
  },
});

export default SchedulePeriodHeader;
