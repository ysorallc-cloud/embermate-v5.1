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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { OrbRings } from './OrbRings';

export interface BreathingOrbCardProps {
  /** Fired when the user taps the orb. The parent opens the shared
   *  BreathingExercise mount with autoStart=true. */
  onTap: () => void;
}

// Matches OrbRings' default canvas size. Kept local so the orbWrap
// dimensions stay in sync if the primitive ever takes an override
// (none today; flagged via comment if it grows).
const ORB_CANVAS_SIZE = 120;

export function BreathingOrbCard({ onTap }: BreathingOrbCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.outer}>
      <TouchableOpacity
        testID="breathing-orb-card-tap"
        onPress={onTap}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Take a breath"
        accessibilityHint="Opens a 60-second guided breathing exercise"
      >
        <LinearGradient
          colors={[colors.caregiverAccentLight, 'rgba(170, 138, 220, 0.03)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.card}
        >
          <View style={styles.orbWrap}>
            <OrbRings />
          </View>
          <Text style={styles.prompt}>{'Tap to take a breath'}</Text>
          <Text style={styles.subtitle}>{'60 seconds · stays on this screen'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    outer: {
      marginVertical: 12,
    },
    card: {
      borderWidth: 0.5,
      borderColor: c.caregiverAccentBorder,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center' as const,
    },
    orbWrap: {
      width: ORB_CANVAS_SIZE,
      height: ORB_CANVAS_SIZE,
      marginBottom: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    prompt: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 13,
      color: c.textPrimary,
      textAlign: 'center' as const,
      lineHeight: 18,
    },
    subtitle: {
      fontSize: 9,
      color: c.textTertiary,
      textAlign: 'center' as const,
      marginTop: 4,
      letterSpacing: 0.2,
    },
  });

export default BreathingOrbCard;
