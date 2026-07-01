// ============================================================================
// BREATHING ORB CARD — Phase 29 Batch A.2 F1 refactor.
//
// At-rest tap-trigger card on the You tab. Frames a 60-second breath
// invitation with a static SVG orb (OrbRings primitive — shared with the
// active BreathingExercise modal so visual continuity holds across the
// at-rest → active transition). Tap invokes `onTap`; the parent
// (support.tsx) opens the shared BreathingExercise mount with
// autoStart=true.
//
// Lift history (Batch A.fix): the card USED to own its own visible state
// and mount a second BreathingExercise modal internally. That dual-mount
// suppressed keyboard presentation on ReflectionCard's TextInput via the
// iOS responder-chain. Single-mount lift (parent-owned) was the fix.
//
// Geometry history:
//   Batch A.1 — added 4 rings + strengthened core at canvas 100×100
//   Batch A.2 F1 — rings + core extracted to OrbRings shared primitive;
//                  canvas grows 100 → 120; ring radii expand to
//                  44/47/50/53 to leave the innermost ring at radius 44
//                  ~2px clear of the core at peak inhale (scale 1.3 →
//                  radius ~41.6). At-rest renders OrbRings static; only
//                  the modal will animate the core (F2 + F3 wire that).
// ============================================================================

import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Fonts } from '../../theme/theme-tokens';

export interface BreathingOrbCardProps {
  /** Fired when the user taps the orb. The parent opens the shared
   *  BreathingExercise mount with autoStart=true. */
  onTap: () => void;
}

// You rebuild (S4) — de-carded to the mockup's inline "breath" row: a small
// SAGE orb (the mockup's blue orb gradient is the known You-blue error;
// §5 blue-never-on-You) + one line, on open fabric. The full animated OrbRings
// lives in the BreathingExercise modal that this row opens — this is the
// at-rest teaser, not the 120px focal card.
export function BreathingOrbCard({ onTap }: BreathingOrbCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      testID="breathing-orb-card-tap"
      onPress={onTap}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Take a breath"
      accessibilityHint="Opens a 60-second guided breathing exercise"
      style={styles.row}
    >
      {/* Sage orb — lit-sphere approximation via a diagonal sage gradient. */}
      <LinearGradient
        colors={[colors.accent, colors.accentMuted]}
        start={{ x: 0.35, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={styles.orb}
      />
      <Text style={styles.text}>
        <Text style={styles.textEmph}>Take a breath</Text>
        {'   ·   60 seconds, right here'}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
    },
    orb: {
      width: 34,
      height: 34,
      minWidth: 34,
      borderRadius: 17,
    },
    text: {
      fontFamily: Fonts.body,
      fontSize: 14,
      color: c.textSecondary,
    },
    textEmph: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      color: c.textPrimary,
    },
  });

export default BreathingOrbCard;
