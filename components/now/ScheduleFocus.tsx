// ============================================================================
// ScheduleFocus — the calm, re-toned default view of TODAY'S SCHEDULE (Part 2).
//
// Replaces the wall of orange "N overdue" cards with:
//   • ONE "START HERE" hero showing the single next action (topAction from
//     computeNowFocus) — calm sage framing ("here's where to pick up"), never
//     alarm-orange, never "you're behind".
//   • A single quiet folded line for the rest — "N more open · M coming up →" —
//     tappable to expand the full timeline.
// When the day is done, the hero becomes a calm wrapped-day state instead.
//
// This is presentational: it reads the shared nowFocus state and calls back to
// the Now tab's existing handlers (complete / open / expand). The completion
// logic itself is untouched.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts, Spacing, BorderRadius, Sizing } from '../../theme/theme-tokens';
import type { DailyCareInstance } from '../../types/carePlan';
import type { NowDayState } from '../../utils/nowFocus';

export interface ScheduleFocusProps {
  topAction: DailyCareInstance | null;
  dayState: NowDayState;
  /** Overdue (open-now) count from computeNowFocus. */
  openCount: number;
  /** Upcoming (later-today) count from computeNowFocus. */
  upcomingCount: number;
  /** Mark the hero's topAction done (the check affordance). */
  onCompleteTop: (instance: DailyCareInstance) => void;
  /** Open the hero's topAction detail/log. */
  onOpenTop: (instance: DailyCareInstance) => void;
  /** Expand to the full timeline (the folded-line tap). */
  onExpand: () => void;
  /** Header "Care Plan →" affordance. */
  onCarePlan: () => void;
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

export function ScheduleFocus({
  topAction,
  dayState,
  openCount,
  upcomingCount,
  onCompleteTop,
  onOpenTop,
  onExpand,
  onCarePlan,
}: ScheduleFocusProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // The hero shows one item. When there's an overdue item it's the hero (so the
  // "rest" of open = openCount - 1); otherwise the hero is the first upcoming.
  const heroIsOverdue = openCount > 0;
  const restOpen = heroIsOverdue ? Math.max(0, openCount - 1) : openCount;
  const restUpcoming = heroIsOverdue ? upcomingCount : Math.max(0, upcomingCount - 1);

  const foldedParts: string[] = [];
  if (restOpen > 0) foldedParts.push(`${restOpen} more open`);
  if (restUpcoming > 0) foldedParts.push(`${restUpcoming} coming up`);
  const foldedLabel = foldedParts.join(' · ');

  return (
    <View testID="schedule-focus">
      {/* Header — caps eyebrow (gold: scheduled/due lane) + Care Plan link,
          mirroring the TODAY'S SCHEDULE header the full timeline uses. */}
      <View style={s.headerRow}>
        <Text style={s.headerEyebrow}>TODAY'S SCHEDULE</Text>
        <TouchableOpacity
          onPress={onCarePlan}
          accessibilityRole="button"
          accessibilityLabel="Open Care Plan"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.headerAction}>Care Plan →</Text>
        </TouchableOpacity>
      </View>

      {dayState === 'done' || !topAction ? (
        // Wrapped-day state — calm, not celebratory-loud. The reflection zone
        // owns the celebration; this is just "nothing left on the schedule".
        <View style={s.doneCard} testID="schedule-focus-done">
          <Text style={s.doneCopy}>You're all caught up for today.</Text>
        </View>
      ) : (
        <>
          {/* START HERE hero — calm sage, framed as "pick up here", not alarm. */}
          <TouchableOpacity
            style={s.heroCard}
            onPress={() => onOpenTop(topAction)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Start here: ${topAction.itemName}`}
            testID="schedule-focus-hero"
          >
            <Text style={s.heroEyebrow}>START HERE</Text>
            <View style={s.heroRow}>
              <Text style={s.heroEmoji}>{topAction.itemEmoji ?? '•'}</Text>
              <View style={s.heroTextBlock}>
                <Text style={s.heroName} numberOfLines={1}>{topAction.itemName}</Text>
                {(() => {
                  const detail = topAction.itemDosage || timeLabel(topAction.scheduledTime);
                  return detail ? <Text style={s.heroDetail}>{detail}</Text> : null;
                })()}
              </View>
              <TouchableOpacity
                style={s.heroCheck}
                onPress={() => onCompleteTop(topAction)}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${topAction.itemName} done`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="schedule-focus-hero-check"
              >
                <Text style={s.heroCheckGlyph}>{'○'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Folded line — the rest, quiet. Tap to expand the full timeline. */}
          {foldedLabel.length > 0 && (
            <TouchableOpacity
              onPress={onExpand}
              accessibilityRole="button"
              accessibilityLabel={`Show the rest of today's schedule: ${foldedLabel}`}
              hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              testID="schedule-focus-folded"
            >
              <Text style={s.foldedLine}>{`${foldedLabel} →`}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14, // allow: eyebrow-to-content rhythm matches the timeline header
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    // Gold = scheduled/due lane (matches the full timeline's TODAY'S SCHEDULE).
    color: c.amber,
  },
  headerAction: {
    fontSize: 12,
    color: c.textTertiary,
  },
  doneCard: {
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Sizing.cardInternalPadding,
    backgroundColor: c.glass,
  },
  doneCopy: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: c.textSecondary,
  },
  heroCard: {
    // Calm sage framing — soft accent border + faint accent fill, NOT the
    // alarm-orange overdue card. "Here's where to pick up", not "you're behind".
    borderWidth: 1,
    borderColor: c.accentBorder,
    backgroundColor: c.accentFaint,
    borderRadius: BorderRadius.lg,
    padding: Sizing.cardInternalPadding,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: c.accent,
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroName: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  heroDetail: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  heroCheck: {
    marginLeft: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheckGlyph: {
    fontSize: 24,
    color: c.accent,
  },
  foldedLine: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: c.textTertiary,
    marginTop: 12,
    paddingLeft: 2,
  },
});

export default ScheduleFocus;
