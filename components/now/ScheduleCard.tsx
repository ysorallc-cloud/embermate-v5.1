// ============================================================================
// SCHEDULE CARD — Single card surface with one row per time window
// Internal 0.5px dividers separate Morning / Afternoon / Evening / Night.
// Active (current, not-yet-complete) row is accent-tinted; dim rows are flat.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { TimeWindow } from '../../utils/nowHelpers';

const WINDOW_EMOJI: Record<string, string> = {
  morning: '☀️',
  afternoon: '🌤️',
  evening: '🌙',
  night: '🌑',
};

export interface ScheduleWindow {
  window: TimeWindow;
  name: string;
  status: 'complete' | 'pending';
  remaining: number;
  isActive: boolean;
}

export interface ScheduleCardProps {
  windows: ScheduleWindow[];
  onStart: (window: TimeWindow) => void;
  onRowPress?: () => void;
}

export function ScheduleCard({ windows, onStart, onRowPress }: ScheduleCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (windows.length === 0) return null;

  return (
    <View style={s.card}>
      {windows.map((w, idx) => {
        const statusText = w.status === 'complete'
          ? 'Complete ✓'
          : `${w.remaining} remaining`;
        return (
          <TouchableOpacity
            key={w.window}
            // v6.7 May 1 sizing pass — Phase 3b: no card-in-card fill on
            // the active row. Active state is conveyed by the sage label
            // colour + sage status + sage Start › text-link, all on the
            // same row geometry as the inactive rows.
            style={[s.windowRow, idx > 0 && s.windowRowDivider]}
            onPress={onRowPress}
            activeOpacity={0.7}
            accessibilityLabel={`${w.name}, ${w.status === 'complete' ? 'complete' : `${w.remaining} remaining`}. Tap to expand schedule.`}
            accessibilityRole="button"
            accessibilityState={{ expanded: false }}
          >
            <Text style={s.windowEmoji}>{WINDOW_EMOJI[w.window] ?? '⭐'}</Text>
            <Text style={[s.windowLabel, w.isActive && s.windowLabelActive]}>
              {w.name}
            </Text>
            {/* UX-2 pre-launch — "Start ›" affordance retired from active
                rows. One status per row is the new contract: the active
                row reads in sage with the same "X remaining" text as the
                inactive rows; tapping the row still expands the timeline
                via onRowPress, which is the canonical entry into a
                window's items. */}
            <Text style={[s.windowStatus, w.isActive && s.windowStatusActive]}>
              {statusText}
            </Text>
            <Text style={s.windowChevron}>{'▾'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14,
    padding: 12,
    // Phase 3.5 — sibling-card gap on Spacing.md (20pt, was literal 16).
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  // v6.7 May 1 sizing pass — Phase 3b set paddingVertical: 6 so active and
  // inactive rows share row geometry. Phase 4 lifts that to 8 to match
  // the canonical row-height rhythm and give every row a slightly
  // taller tap target without changing the active / inactive height
  // parity (still colour-only differentiation).
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // UX-2 pre-launch — bumped from 8 to 15 for the new period-row
    // rhythm. The visual height was the thinnest tappable surface on
    // Now; 15 gives the row noticeable air without growing the card.
    paddingVertical: 15, // allow: UX-2 period-row pad
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  windowRowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: c.hairlineInset,
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
  windowLabelActive: {
    color: c.accent,
  },
  windowStatus: {
    flex: 1,
    fontSize: 13,
    color: c.textTertiary,
  },
  windowStatusActive: {
    color: c.accent,
  },
  // Text-link Start affordance — no fill, just sage text. Replaces the
  // prior filled mint pill; reads as a tap target without visually
  // out-weighing the row label next to it.
  windowStartLink: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  windowStartLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  // Inactive rows show a chevron ▾ to indicate "tap to expand".
  windowChevron: {
    fontSize: 14,
    color: c.textTertiary,
    paddingHorizontal: 4,
  },
});
