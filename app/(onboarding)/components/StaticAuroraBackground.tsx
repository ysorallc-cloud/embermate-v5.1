// ============================================================================
// StaticAuroraBackground — Reanimated-free variant of AuroraBackground.
//
// Phase 28 Batch B sidecar — workaround for the Reanimated 3.16.7 +
// Expo Go SDK 52 render failure where `<Animated.View>` renders blank
// across onboarding screens. The original AuroraBackground.tsx wraps
// the gradient in `<Animated.View>` for a slow translate-loop polish;
// this static variant drops the animation and renders the gradient via
// plain `<View>` + `<LinearGradient>` only.
//
// Variant API + color stops + layer geometry mirror AuroraBackground
// exactly, so screens can swap imports with no other change. The full
// animated version is preserved in AuroraBackground.tsx for v1.1+
// restoration once the Expo Go / Reanimated runtime stabilizes (or
// when the app moves to dev-build / production binary where Reanimated
// renders correctly).
// ============================================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type OnboardingAuroraVariant = 'welcome' | 'track' | 'understand' | 'connect' | 'coffee';

interface Props {
  variant: OnboardingAuroraVariant;
}

const AURORA_CONFIGS: Record<OnboardingAuroraVariant, {
  colors: [string, string, string];
}> = {
  welcome: {
    colors: [
      'rgba(20, 120, 100, 0.5)',
      'rgba(40, 80, 100, 0.25)',
      'transparent',
    ],
  },
  track: {
    colors: [
      'rgba(40, 100, 60, 0.45)',
      'rgba(30, 80, 70, 0.2)',
      'transparent',
    ],
  },
  understand: {
    colors: [
      'rgba(80, 60, 140, 0.45)',
      'rgba(60, 60, 100, 0.25)',
      'transparent',
    ],
  },
  connect: {
    colors: [
      'rgba(100, 60, 100, 0.4)',
      'rgba(60, 60, 100, 0.25)',
      'transparent',
    ],
  },
  coffee: {
    colors: [
      'rgba(100, 80, 30, 0.4)',
      'rgba(60, 50, 30, 0.2)',
      'transparent',
    ],
  },
};

export const StaticAuroraBackground: React.FC<Props> = ({ variant }) => {
  const config = AURORA_CONFIGS[variant];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.primaryLayer}>
        <LinearGradient
          colors={config.colors}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.primaryGradient}
        />
      </View>
      <View style={styles.secondaryLayer}>
        <LinearGradient
          colors={[config.colors[1], 'transparent']}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.secondaryGradient}
        />
      </View>
    </View>
  );
};

// Onboarding redesign layout pass — the fixed-height (450 / 300) layers
// + bottom borderRadius produced a visible curved-rectangle seam mid-
// screen. The primary layer now fills the full container (top: -50,
// bottom: 0) so the gradient's natural fade-to-transparent at 80%
// blends seamlessly into the screen's c.background. Secondary layer
// keeps its accent placement but extends to bottom too.
const styles = StyleSheet.create({
  primaryLayer: {
    position: 'absolute',
    top: -50,
    left: '-15%',
    right: '-15%',
    bottom: 0,
  },
  primaryGradient: {
    flex: 1,
  },
  secondaryLayer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
  },
  secondaryGradient: {
    flex: 1,
    opacity: 0.6,
  },
});

export default StaticAuroraBackground;
