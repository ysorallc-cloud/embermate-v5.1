// ============================================================================
// SCHEDULE CARD — Single card surface with one row per time window
// Internal 0.5px dividers separate Morning / Afternoon / Evening / Night.
// Active (current, not-yet-complete) row is accent-tinted; dim rows are flat.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
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
            style={[s.windowRow, idx > 0 && s.windowRowDivider, w.isActive && s.windowRowActive]}
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
            <Text style={s.windowStatus}>{statusText}</Text>
            {w.isActive && (
              <TouchableOpacity
                style={s.windowStartBtn}
                onPress={() => onStart(w.window)}
                activeOpacity={0.7}
                accessibilityLabel={`Start ${w.name} routine`}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.windowStartText}>Start</Text>
              </TouchableOpacity>
            )}
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
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  windowRowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  windowRowActive: {
    backgroundColor: c.accentFaint,
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
    color: c.textHalf,
  },
  windowStartBtn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  windowStartText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
