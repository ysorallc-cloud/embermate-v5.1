// ============================================================================
// BREATHING ORB CARD — Phase 29 F3 (Batch A.fix lift).
//
// Self-contained card on the You tab that frames a "take a breath" moment
// with a small SVG orb at rest, an invitation prompt, and a quiet 60-second
// disclaimer. Tap invokes the `onTap` prop — the parent (support.tsx) owns
// the single shared BreathingExercise modal and decides what to do with the
// tap (open the modal with autoStart=true).
//
// Position: between AffirmationHeader and ReflectionCard in support.tsx,
// inside the You-lane lavender encoding the rest of the tab carries.
//
// Lift history (Batch A.fix): the orb card USED to own its own visible
// state and mount its own BreathingExercise modal internally. That
// produced TWO Modal mounts in the support.tsx tree (orb's + the legacy
// QuickResetPills.onBreathe mount at the screen root). On iOS this
// confused the keyboard-window responder chain — even with both Modals
// at visible=false, the dual UIViewController allocation suppressed
// keyboard presentation when the user tapped ReflectionCard's TextInput
// below. Lifting the orb's modal state up to the parent collapses to one
// BreathingExercise mount shared between both entry points, with an
// autoStart state variable tracking which entry source fired.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

export interface BreathingOrbCardProps {
  /** Fired when the user taps the orb. The parent opens the shared
   *  BreathingExercise mount with autoStart=true. */
  onTap: () => void;
}

// Phase 29 Batch A.1 F1 — canvas grows 64 → 100 to fit four concentric
// rings radiating outside the orb core. The core itself stays at 64
// diameter (radius 32); rings sit between radius 36 and 45 with a 3px
// gap between each, leaving a small margin to the canvas edge for the
// 1.5px ring stroke.
const CANVAS_SIZE = 100;
const CORE_RADIUS = 32;
const RING_STROKE_WIDTH = 1.5;

// Ring alpha progression — outermost faded, innermost brightest. The
// gradient is the gesture: the rings appear to radiate from the core.
// Order (outermost first) is the render order: outer rings paint first
// so the inner / brighter ring lands on top.
const RINGS: ReadonlyArray<{ radius: number; alpha: number }> = [
  { radius: 45, alpha: 0.05 }, // outermost
  { radius: 42, alpha: 0.10 },
  { radius: 39, alpha: 0.18 },
  { radius: 36, alpha: 0.28 }, // innermost
];

function ringStroke(alpha: number): string {
  // caregiverAccent base — #aa8adc → rgb(170, 138, 220).
  return `rgba(170, 138, 220, ${alpha.toFixed(2)})`;
}

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
            <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
              <Defs>
                {/* Phase 29 Batch A.1 F1 — gradient strengthened. Center alpha
                    0.35 → 0.75; edge alpha 0.06 → 0.35. Both stops use the same
                    caregiverAccent hex; the previous `sageFaint` outer stop was
                    a misleadingly-named lavender at 0.06, so swapping to
                    caregiverAccent at 0.35 keeps the gradient monochromatic
                    while bumping saturation. */}
                <RadialGradient
                  id="orbGradient"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor={colors.caregiverAccent} stopOpacity={0.75} />
                  <Stop offset="100%" stopColor={colors.caregiverAccent} stopOpacity={0.35} />
                </RadialGradient>
              </Defs>
              {/* Rings — render outermost first so the brighter inner rings
                  paint on top. Static at rest; animation is out of scope
                  per Batch A.1 (filed as v1.1 polish). */}
              {RINGS.map((r) => (
                <Circle
                  key={r.radius}
                  cx={CANVAS_SIZE / 2}
                  cy={CANVAS_SIZE / 2}
                  r={r.radius}
                  fill="none"
                  stroke={ringStroke(r.alpha)}
                  strokeWidth={RING_STROKE_WIDTH}
                />
              ))}
              {/* Core — gradient fill + 1.5px caregiverAccentStrong border
                  (existing 0.25-alpha token, no new tokens added per Batch
                  A.1 D1). */}
              <Circle
                cx={CANVAS_SIZE / 2}
                cy={CANVAS_SIZE / 2}
                r={CORE_RADIUS}
                fill="url(#orbGradient)"
                stroke={colors.caregiverAccentStrong}
                strokeWidth={1.5}
              />
            </Svg>
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
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
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
