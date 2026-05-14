// ============================================================================
// END OF SHIFT CARD — Evening-only handoff prompt with caregiver-purple identity
// Returns null before 18:00. Reads new Date().getHours() at render time.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
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

  // Phase 23.1 Fix 4 — fallback prose softened to match the composer's
  // witness voice ("Today's care is wrapping up. Review before handing
  // off."). The legacy "Log anything you missed before bed" framing read
  // as a chore prompt; "Review before handing off" matches the rest of
  // the End-of-Shift surface.
  const body = outcomes
    ? composeEndOfShiftBody(outcomes, alerts ?? [])
    : completedCount > 0
      ? `${completedCount} item${completedCount !== 1 ? 's' : ''} logged today. Review before handing off.`
      : "Today's care is wrapping up. Review before handing off.";

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
        // Phase 2.6.7 — visual padding dropped to make the CTA a ghost
        // text link; tap area carried by hitSlop to clear HIG 44pt min.
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="View today's journal"
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>View journal →</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // Phase 4.6 — margin discipline + card-edge weight normalization.
  // marginTop stays 0 because the sibling card above (NowFooter's
  // journalPreviewCard) now carries marginBottom: Spacing.xs as the
  // inter-card gap. borderWidth drops 1 → 0.5 to match the card-edge
  // contract elsewhere on the page; padding/radius migrate to tokens.
  card: {
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentStrong,
    borderRadius: Sizing.cardRadius,
    padding: Sizing.cardInternalPadding,
    marginTop: 0,
    marginBottom: Spacing.xs,
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
    // v6.7 visual-consistency: canonical lavender token, not the brighter
    // caregiverAccentText. The card is a soft suggestion, not an alert.
    color: c.caregiverAccent,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    // v6.7 visual-consistency: locked secondary copy color (#c4c1b3),
    // not textWarmSecondary which read at lower contrast on the
    // lavender-tinted card.
    color: c.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  // Phase 2.6.7 — ghost text link. The card itself is dimmed (Phase 2),
  // and a filled lavender pill drew the eye to "View journal →" as a
  // primary action — fighting the card's reduced-emphasis treatment.
  // No bg, no border, no visual padding; tap area handled by hitSlop on
  // the TouchableOpacity. The link peers with the card's title visually.
  cta: {
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '500',
    // Canonical lavender (vs the brighter caregiverAccentText) so the
    // link reads as a peer of the title, not a separate emphasis level.
    color: c.caregiverAccent,
  },
});
