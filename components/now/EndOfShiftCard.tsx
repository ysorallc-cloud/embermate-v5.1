// ============================================================================
// END OF SHIFT CARD — Evening-only handoff prompt with caregiver-purple identity
// Returns null before 18:00. Reads new Date().getHours() at render time.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { composeEndOfShiftBody } from '../../utils/text/composers/endOfShiftBody';
import type { DailyOutcomes, Alert } from '../../utils/text/types';
import { isDayComplete } from '../../utils/dayComplete';
import { useDataListener } from '../../lib/events';

const EVENING_HOUR = 18;

export interface EndOfShiftCardProps {
  completedCount: number;
  /** Structured outcomes — when provided, drives the body via the composer. */
  outcomes?: DailyOutcomes;
  /** Active alerts, forwarded to the composer. */
  alerts?: Alert[];
  onDismiss?: () => void;
}

export function EndOfShiftCard({
  completedCount,
  outcomes,
  alerts,
  onDismiss,
}: EndOfShiftCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [dismissed, setDismissed] = useState(false);
  const [hiddenForDay, setHiddenForDay] = useState(false);

  // Day complete check on mount + on every WELLNESS event (markDayComplete
  // emits this so the card flips immediately when the user taps "Done for
  // today" on the Journal HandoffCard).
  React.useEffect(() => {
    isDayComplete().then(setHiddenForDay).catch(() => {});
  }, []);
  useDataListener(React.useCallback((category: string) => {
    if (category === 'wellness') {
      isDayComplete().then(setHiddenForDay).catch(() => {});
    }
  }, []));

  const hour = new Date().getHours();
  if (hour < EVENING_HOUR) return null;
  if (dismissed) return null;
  if (hiddenForDay) return null;

  const body = outcomes
    ? composeEndOfShiftBody(outcomes, alerts ?? [])
    : completedCount > 0
      ? `${completedCount} item${completedCount !== 1 ? 's' : ''} logged today. Review the journal before handing off.`
      : "Today's care is wrapping up. Log anything you missed before bed.";

  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.dismiss}
        onPress={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Dismiss end of shift card"
        accessibilityRole="button"
      >
        <Text style={s.dismissText}>×</Text>
      </TouchableOpacity>
      <Text style={s.title}>End of shift</Text>
      <Text style={s.body}>{body}</Text>
      <TouchableOpacity
        style={s.cta}
        onPress={() => navigate('/(tabs)/journal?scrollTo=handoff')}
        activeOpacity={0.7}
        accessibilityLabel="View today's journal"
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>View journal →</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 1,
    borderColor: c.caregiverAccentBorder,
    borderRadius: 14,
    padding: 14,
    marginTop: 0,
    marginBottom: 8,
  },
  dismiss: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 1,
  },
  dismissText: {
    fontSize: 18,
    color: c.caregiverAccentText,
    fontWeight: '300',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: c.caregiverAccentText,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: c.textWarmSecondary || c.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.caregiverAccentText,
  },
});
