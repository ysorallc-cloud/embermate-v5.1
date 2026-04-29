// ============================================================================
// HANDOFF CARD
//
// Bottom-of-Journal CTA: "Share summary" opens HandoffSheet; "Done for
// today" marks the day complete and dismisses the End of Shift card on Now.
//
// Hides automatically on empty days (nothing to hand off) and on days
// already marked complete. The journal page tracks day-content signals and
// hands them in as boolean props so this component stays trivial to test.
// ============================================================================

import React, { useMemo, forwardRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface HandoffCardProps {
  hasNotes: boolean;
  hasMissed: boolean;
  hasPending: boolean;
  hasLogged: boolean;
  dayComplete: boolean;
  onShare: () => void;
  onDoneForToday: () => void;
  /** Optional Animated.Value for the one-time pulse on scrollTo arrival. */
  pulse?: Animated.Value;
}

export function HandoffCard({
  hasNotes,
  hasMissed,
  hasPending,
  hasLogged,
  dayComplete,
  onShare,
  onDoneForToday,
  pulse,
}: HandoffCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (dayComplete) return null;
  if (!hasNotes && !hasMissed && !hasPending && !hasLogged) return null;

  const scale = pulse ?? null;
  const Container = scale ? Animated.View : View;

  return (
    <Container style={[styles.card, scale ? { transform: [{ scale }] } : null]}>
      <Text style={styles.title}>{'✦ Ready to hand off?'}</Text>
      <Text style={styles.subtitle}>
        {"Share today's notes and what's pending for the next caregiver."}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onShare}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Share summary — open the handoff sheet"
        >
          <Text style={styles.primaryButtonText}>{'Share summary'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onDoneForToday}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Done for today — mark the day complete"
        >
          <Text style={styles.secondaryButtonText}>{'Done for today'}</Text>
        </TouchableOpacity>
      </View>
    </Container>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: c.textSecondary,
    lineHeight: 14,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: c.accent,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    // Spec called for 10pt; the project's a11y guard (interactive-label
    // minimum) sets the floor at 11pt. Deferred to the a11y rule — visually
    // indistinguishable.
    fontSize: 11,
    fontWeight: '500',
    color: c.textPrimary,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: c.textPrimary,
  },
});

export default HandoffCard;
