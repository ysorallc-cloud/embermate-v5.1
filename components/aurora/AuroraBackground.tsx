import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AuroraVariant = 'today' | 'now' | 'journal' | 'hub' | 'log' | 'care' | 'reports' | 'settings' | 'family' | 'insights' | 'connect';

interface Props {
  variant?: AuroraVariant;
}

const AURORA_CONFIGS: Record<AuroraVariant, {
  colors: [string, string, string];
}> = {
  today: {
    colors: [
      'rgba(20, 120, 100, 0.5)',   // Teal
      'rgba(40, 80, 100, 0.25)',   // Blue-teal
      'transparent',
    ],
  },
  now: {
    colors: [
      'rgba(20, 120, 100, 0.5)',   // Teal (alias for today)
      'rgba(40, 80, 100, 0.25)',
      'transparent',
    ],
  },
  journal: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  hub: {
    colors: [
      'rgba(60, 60, 140, 0.45)',   // Purple-blue
      'rgba(40, 80, 100, 0.2)',    // Teal-blue
      'transparent',
    ],
  },
  log: {
    colors: [
      'rgba(100, 80, 30, 0.4)',    // Amber/orange
      'rgba(40, 80, 60, 0.2)',     // Green-teal
      'transparent',
    ],
  },
  care: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
  reports: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  settings: {
    colors: [
      'rgba(50, 60, 80, 0.3)',     // Blue-gray
      'rgba(40, 50, 70, 0.15)',    // Darker blue-gray
      'transparent',
    ],
  },
  family: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple (same as care)
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
  insights: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple (same as reports)
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  connect: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
};

export const AuroraBackground: React.FC<Props> = ({ variant = 'today' }) => {
  // Safety check: fallback to 'today' if invalid variant
  const config = AURORA_CONFIGS[variant] || AURORA_CONFIGS.today;

  // Subtle animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(20, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    translateY.value = withRepeat(
      withTiming(-15, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Cleanup animations on unmount
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Primary gradient - top glow */}
      <Animated.View style={[styles.primaryLayer, animatedStyle]}>
        <LinearGradient
          colors={config.colors}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.primaryGradient}
        />
      </Animated.View>

      {/* Secondary gradient - side accent */}
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

const styles = StyleSheet.create({
  primaryLayer: {
    position: 'absolute',
    top: -50,
    left: '-15%',
    right: '-15%',
    height: 450,
  },
  primaryGradient: {
    flex: 1,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  secondaryLayer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 300,
  },
  secondaryGradient: {
    flex: 1,
    opacity: 0.6,
  },
});

export default AuroraBackground;
