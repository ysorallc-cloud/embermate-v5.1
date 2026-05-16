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
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { emitWellnessEvent } from '../../utils/eventEmitter';
import { updateStreak } from '../../utils/streakStorage';
import { logError } from '../../utils/devLog';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { OrbRings } from './OrbRings';

import { Spacing } from '../../theme/theme-tokens';

// Phase 29 Batch A.2 F2 — modal orb canvas size matches OrbRings'
// default (120). Kept local so the wrapper sizing stays in sync with
// the primitive without coupling through a prop.
const ORB_CANVAS_SIZE = 120;
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

  // Phase 29 Batch A.2 F3 — breath-synced core scale. The orb's core
  // grows on inhale and contracts on exhale; the rings hold position
  // (Q3a — breath fills the orb but rings hold it). Phase machine
  // already paces the cycle (PHASE_DURATION_MS = 4000 per phase via
  // setTimeout); withTiming runs an independent 4000ms animation on
  // the UI thread that completes when the next phase begins. No
  // chaining, no accumulation — each phase entry re-issues a fresh
  // withTiming from the current value.
  const coreScale = useSharedValue(1.0);

  // Phase 29 Batch A.2 F4 — Reduce Motion accessibility preference.
  // When the user has Reduce Motion enabled in iOS Settings, skip the
  // scale animation entirely. The countdown digit and phase labels
  // continue to pace the exercise so users who can't tolerate motion
  // still get the guided breath, just without the somatic orb cue.
  // Live-updating — a toggle mid-flow is honored on the next phase
  // transition via the [phase, reduceMotion] dep array below.
  const reduceMotion = useReduceMotion();

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

  // Phase 29 Batch A.2 F3 — breath-bound scale animation. On entry to
  // inhale, withTiming runs the core from its current value to 1.3
  // over PHASE_DURATION_MS with an easeInOutSine curve (the body's
  // breath isn't linear; the curve approximates the natural pace).
  // Exhale runs symmetrically back to 1.0. Hold phases issue no
  // withTiming call so the SharedValue persists at whatever the prior
  // phase left it (1.3 after inhale; 1.0 after exhale-or-reset). On
  // intro / ready / complete the scale resets synchronously to 1.0 —
  // this cancels any in-flight withTiming if the user taps End mid-
  // cycle (handleEnd sets phase to 'intro').
  //
  // Phase 29 Batch A.2 F4 — Reduce Motion guard. When the user has the
  // preference enabled, force scale to 1.0 unconditionally and skip the
  // withTiming calls. The reduceMotion dep keeps this live: a toggle
  // mid-flow snaps the orb back to scale 1.0 on the next render.
  useEffect(() => {
    if (reduceMotion) {
      coreScale.value = 1.0;
      return;
    }
    if (phase === 'inhale') {
      coreScale.value = withTiming(1.3, {
        duration: PHASE_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
      });
    } else if (phase === 'exhale') {
      coreScale.value = withTiming(1.0, {
        duration: PHASE_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
      });
    } else if (phase === 'intro' || phase === 'ready' || phase === 'complete') {
      coreScale.value = 1.0;
    }
    // 'hold' — no call. SharedValue persists.
    // coreScale is a stable SharedValue ref; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduceMotion]);

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

        <View style={styles.orbWrap}>
          <OrbRings coreScale={coreScale} />
          {/* Count digit lives over the orb center. Absolute-positioned
              so it doesn't shift while the core breathes. */}
          {(phase === 'inhale' || phase === 'hold' || phase === 'exhale') && (
            <Text style={styles.orbCount}>{count}</Text>
          )}
        </View>

        {/* Phase label */}
        <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>

        {/* Intro: Begin button */}
        {phase === 'intro' && (
          <TouchableOpacity
            style={[styles.beginButton, { backgroundColor: colors.caregiverAccent }]}
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
            style={[styles.beginButton, { backgroundColor: colors.caregiverAccent }]}
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
      backgroundColor: c.caregiverAccent,
    },
    dotActive: {
      backgroundColor: c.caregiverAccent,
      opacity: 0.6,
    },
    // Phase 29 Batch A.2 F2 — orb/orbExpand/orbContract/orbInner
    // styles retired with the View-based orb. The OrbRings SVG
    // primitive carries the visual structure now; orbWrap below is
    // the sized container that holds the SVG + absolutely-positioned
    // count overlay.
    orbWrap: {
      width: ORB_CANVAS_SIZE,
      height: ORB_CANVAS_SIZE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 32,
    },
    // Absolutely positioned over the orb so it stays centered when the
    // core eventually breathes via Reanimated scale (F3). The orbWrap
    // container handles centering via alignItems/justifyContent; the
    // count sits on top of the SVG.
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
