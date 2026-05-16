// ============================================================================
// BREATHING EXERCISE — Full-screen guided 4-4-4 breathing
// Flow: Intro → Ready → 4 cycles of (Inhale 4s → Hold 4s → Exhale 4s) → Complete
// ============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { emitWellnessEvent } from '../../utils/eventEmitter';
import { updateStreak } from '../../utils/streakStorage';
import { logError } from '../../utils/devLog';

import { Spacing } from '../../theme/theme-tokens';
// ============================================================================
// TYPES
// ============================================================================

export type BreathingPhase = 'intro' | 'ready' | 'inhale' | 'hold' | 'exhale' | 'complete';

export const TOTAL_CYCLES = 4;
export const PHASE_DURATION_MS = 4000; // 4 seconds per phase
export const READY_DURATION_MS = 2500;

export const PHASE_LABELS: Record<BreathingPhase, string> = {
  intro: "Let's slow down",
  ready: 'Close your eyes',
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
  // Phase 29 Batch A.1 F2 — "Well done" → "That's it." Praise-coded
  // completion language ("Well done") departs from the witness voice
  // the rest of the You-lane carries (no comparative framing, no
  // performance rating). "That's it." is observational — names the
  // moment without scoring it. Pinned by
  // __tests__/components/breathingExercise.test.ts (existing pin
  // updated) + youTabMoment29.test.tsx absence pin (Batch A.1 F4).
  complete: "That's it.",
};

// ============================================================================
// COMPONENT
// ============================================================================

interface BreathingExerciseProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Phase 29 F2 — skip the "Let's slow down / Begin" intro gate when the
   * caller has already framed the entry (e.g. the You-tab orb card's
   * "Tap to take a breath" copy). When true and `visible` flips on, the
   * modal opens directly in the ready phase and auto-transitions to
   * inhale after READY_DURATION_MS. Default false preserves the pre-29
   * intro path for any other consumer.
   */
  autoStart?: boolean;
}

export function BreathingExercise({ visible, onClose, autoStart }: BreathingExerciseProps) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<BreathingPhase>('intro');
  const [cycle, setCycle] = useState(0); // 0-based current cycle
  const [count, setCount] = useState(1); // 1-4 within phase
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens. Phase 29 F2: when autoStart is true,
  // skip 'intro' entirely — init to 'ready' and queue the ready→inhale
  // transition that handleBegin would otherwise own.
  useEffect(() => {
    if (visible) {
      setCycle(0);
      setCount(1);
      if (autoStart) {
        setPhase('ready');
        timerRef.current = setTimeout(() => {
          startCount('inhale', 0);
        }, READY_DURATION_MS);
      } else {
        setPhase('intro');
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
    // startCount identity is stable (useCallback with empty deps); it's
    // safe to omit from the dep list and intentional to avoid re-firing
    // the ready timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoStart]);

  const startCount = useCallback((nextPhase: BreathingPhase, nextCycle: number) => {
    setPhase(nextPhase);
    setCycle(nextCycle);
    setCount(1);

    // Soft haptic pulse on phase entry — one per transition, not per second.
    // Selection feedback (lightest pulse) reads as a gentle cue without
    // pulling the user out of the slow-breath rhythm. Suppressed on
    // simulator (Haptics gracefully no-ops there).
    Haptics.selectionAsync().catch(() => {});

    // Count 1-4 over 4 seconds
    let c = 1;
    countRef.current = setInterval(() => {
      c++;
      if (c <= 4) {
        setCount(c);
      }
    }, 1000);

    // After 4 seconds, transition
    timerRef.current = setTimeout(() => {
      if (countRef.current) clearInterval(countRef.current);
      advancePhase(nextPhase, nextCycle);
    }, PHASE_DURATION_MS);
  }, []);

  const advancePhase = useCallback((currentPhase: BreathingPhase, currentCycle: number) => {
    if (currentPhase === 'inhale') {
      startCount('hold', currentCycle);
    } else if (currentPhase === 'hold') {
      startCount('exhale', currentCycle);
    } else if (currentPhase === 'exhale') {
      const nextCycle = currentCycle + 1;
      if (nextCycle >= TOTAL_CYCLES) {
        setPhase('complete');
        handleComplete();
      } else {
        startCount('inhale', nextCycle);
      }
    }
  }, [startCount]);

  const handleBegin = useCallback(() => {
    setPhase('ready');
    timerRef.current = setTimeout(() => {
      startCount('inhale', 0);
    }, READY_DURATION_MS);
  }, [startCount]);

  const handleComplete = useCallback(async () => {
    try {
      await emitWellnessEvent('morning', { type: 'breathing_exercise', cycles: TOTAL_CYCLES } as any, { source: 'dedicated_screen' });
      await updateStreak('wellnessCheck');
    } catch (err) {
      logError('BreathingExercise.handleComplete', err);
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
    setPhase('intro');
    onClose();
  }, [onClose]);

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleEnd}
    >
      <View style={styles.overlay}>
        {/* Cycle progress dots */}
        {phase !== 'intro' && phase !== 'complete' && (
          <View style={styles.dotsRow}>
            {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < cycle && styles.dotDone,
                  i === cycle && phase !== 'ready' && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Orb */}
        <View style={[
          styles.orb,
          { borderColor: colors.accent },
          phase === 'inhale' && styles.orbExpand,
          phase === 'hold' && styles.orbExpand,
          phase === 'exhale' && styles.orbContract,
        ]}>
          <View style={[styles.orbInner, { backgroundColor: colors.accent }]} />
          {/* Count digit lives outside orbInner so the disc's 30% opacity
              doesn't dim it — the digit itself reads at full contrast. */}
          {(phase === 'inhale' || phase === 'hold' || phase === 'exhale') && (
            <Text style={styles.orbCount}>{count}</Text>
          )}
        </View>

        {/* Phase label */}
        <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>

        {/* Intro: Begin button */}
        {phase === 'intro' && (
          <TouchableOpacity
            style={[styles.beginButton, { backgroundColor: colors.accent }]}
            onPress={handleBegin}
            accessibilityLabel="Start breathing exercise, 1 minute"
            accessibilityRole="button"
          >
            <Text style={styles.beginButtonText}>Begin</Text>
          </TouchableOpacity>
        )}

        {/* Complete: Done button */}
        {phase === 'complete' && (
          <TouchableOpacity
            style={[styles.beginButton, { backgroundColor: colors.accent }]}
            onPress={() => { setPhase('intro'); onClose(); }}
            accessibilityLabel="Done"
            accessibilityRole="button"
          >
            <Text style={styles.beginButtonText}>Done</Text>
          </TouchableOpacity>
        )}

        {/* End link (always available during exercise) */}
        {phase !== 'intro' && phase !== 'complete' && (
          <TouchableOpacity
            onPress={handleEnd}
            style={styles.endLink}
            accessibilityLabel="End exercise early"
            accessibilityRole="button"
          >
            <Text style={styles.endLinkText}>End</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 10,
      position: 'absolute',
      top: 80,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    dotDone: {
      backgroundColor: c.accent,
    },
    dotActive: {
      backgroundColor: c.accent,
      opacity: 0.6,
    },
    orb: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    orbExpand: {
      width: 200,
      height: 200,
      borderRadius: 100,
    },
    orbContract: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    orbInner: {
      width: '70%',
      height: '70%',
      borderRadius: 999,
      opacity: 0.3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Absolutely positioned over the orb so the orbInner's 30% opacity
    // doesn't multiply down to the digit. The orb container handles the
    // centering via alignItems/justifyContent.
    orbCount: {
      position: 'absolute',
      fontSize: 36,
      fontWeight: '200',
      color: '#fff',
      opacity: 1,
    },
    phaseLabel: {
      fontSize: 22,
      fontWeight: '300',
      color: '#fff',
      marginBottom: Spacing.lg,
      textAlign: 'center',
    },
    beginButton: {
      paddingHorizontal: 40,
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      borderRadius: 12,
    },
    beginButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    endLink: {
      position: 'absolute',
      bottom: 60,
      padding: 12,
    },
    endLinkText: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.5)',
    },
  });
}
