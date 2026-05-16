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

const ORB_SIZE = 64;
const ORB_RADIUS = (ORB_SIZE / 2) - 1; // 0.5px stroke fits inside the bounding box

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
            <Svg width={ORB_SIZE} height={ORB_SIZE} viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`}>
              <Defs>
                {/* Radial gradient — lavender wash at center, sage faint at the
                    edge. Same alpha ladder the rest of the You-lane uses. */}
                <RadialGradient
                  id="orbGradient"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor={colors.caregiverAccent} stopOpacity={0.35} />
                  <Stop offset="100%" stopColor={colors.sageFaint || colors.caregiverAccentBg} stopOpacity={0.06} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_RADIUS}
                fill="url(#orbGradient)"
                stroke={colors.caregiverAccentBorder}
                strokeWidth={0.5}
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
      width: ORB_SIZE,
      height: ORB_SIZE,
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
