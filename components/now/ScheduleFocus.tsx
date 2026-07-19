// ============================================================================
// ScheduleFocus — the conditional START HERE pointer (Direction C).
//
// Was the default schedule view (Part 2). Now DEMOTED to a compact pointer that
// the Now tab renders ONLY when there's a genuinely OVERDUE item
// (nowFocus.topActionOverdue). It sits ABOVE the full timeline (which is the
// default view) and points to the single most-important lapse — meds > vitals >
// meals/mood, oldest first (reused from computeNowFocus.topAction). On an
// on-track day the Now tab doesn't render it at all → just the calm timeline.
//
// Presentational: reuses the Now tab's existing complete/open handlers. The
// completion logic is untouched.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts, BorderRadius, Sizing } from '../../theme/theme-tokens';
import type { DailyCareInstance } from '../../types/carePlan';

export interface ScheduleFocusProps {
  /** The overdue item to point at. The Now tab only mounts this when overdue. */
  topAction: DailyCareInstance;
  /** Complete the item directly — ONE tap = mark taken, exactly like the
   *  timeline's check-circle (handleQuickConfirm → completeInstance). This is
   *  the card's PRIMARY action; it does NOT route to the detailed confirm/skip/
   *  side-effects page (which stays reachable from the timeline row below). */
  onComplete: (instance: DailyCareInstance) => void;
}

function timeLabel(scheduledTime: string): string | null {
  if (!scheduledTime) return null;
  let d = new Date(scheduledTime);
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    d = new Date(`2000-01-01T${scheduledTime}:00`);
  }
  if (isNaN(d.getTime())) return null;
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function ScheduleFocus({ topAction, onComplete }: ScheduleFocusProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const detail = topAction.itemDosage || timeLabel(topAction.scheduledTime);

  return (
    // Primary action = complete the item directly (one tap = mark taken), like
    // the timeline check-circle — NOT navigate to the detailed log page.
    <TouchableOpacity
      style={s.pointer}
      onPress={() => onComplete(topAction)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Start here — mark ${topAction.itemName} done`}
      testID="schedule-focus-pointer"
    >
      <Text style={s.eyebrow}>START HERE</Text>
      <View style={s.row}>
        <Text style={s.emoji}>{topAction.itemEmoji ?? '•'}</Text>
        <View style={s.textBlock}>
          <Text style={s.name} numberOfLines={1}>{topAction.itemName}</Text>
          {detail ? <Text style={s.detail}>{detail}</Text> : null}
        </View>
        <TouchableOpacity
          style={s.check}
          onPress={() => onComplete(topAction)}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${topAction.itemName} done`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="schedule-focus-pointer-check"
        >
          <Text style={s.checkGlyph}>{'○'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  pointer: {
    // Calm sage framing — soft accent border + faint accent fill, NOT alarm
    // orange. "Here's where to pick up", not "you're behind". Sits above the
    // timeline with a small bottom gap.
    borderWidth: 1,
    borderColor: c.accentBorder,
    backgroundColor: c.accentFaint,
    borderRadius: BorderRadius.lg,
    padding: Sizing.cardInternalPadding,
    marginBottom: 14, // allow: gap between the pointer and the timeline below
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: c.accent,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  detail: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  check: {
    marginLeft: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 24,
    color: c.accent,
  },
});

export default ScheduleFocus;
