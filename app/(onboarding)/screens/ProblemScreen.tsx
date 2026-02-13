// ============================================================================
// PROBLEM SCREEN - Opens with pain point, validates struggle
// Slide 1: "Caregiving is Overwhelming"
// ============================================================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeInDown,
  cancelAnimation,
} from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Typography, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAIN_POINTS = [
  { icon: '×', text: 'Missed medications risk health' },
  { icon: '×', text: 'Scattered notes lose insights' },
  { icon: '×', text: 'Care team out of sync' },
  { icon: '×', text: 'Patterns go unnoticed' },
];

export const ProblemScreen: React.FC = () => {
  const heartScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0.8);

  useEffect(() => {
    // Subtle pulse animation for the heart
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    heartOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(heartScale);
      cancelAnimation(heartOpacity);
    };
  }, []);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Animated broken heart emoji */}
        <Animated.View style={[styles.emojiContainer, heartAnimatedStyle]}>
          <Text style={styles.emoji}>💔</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          Caregiving is Overwhelming
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          Tracking medications, appointments, and health patterns across notebooks, apps, and memory
        </Animated.Text>

        {/* Pain points card */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.painPointsCard}
        >
          {PAIN_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(800 + index * 150).duration(400)}
              style={[
                styles.painPointRow,
                index < PAIN_POINTS.length - 1 && styles.painPointBorder,
              ]}
            >
              <Text style={styles.painPointIcon}>{point.icon}</Text>
              <Text style={styles.painPointText}>{point.text}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Empathetic closing */}
        <Animated.Text
          entering={FadeInDown.delay(1400).duration(600)}
          style={styles.emotionalText}
        >
          You're doing your best. Let us help.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 100,
  },
  emojiContainer: {
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  painPointsCard: {
    width: '100%',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  painPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  painPointBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  painPointIcon: {
    fontSize: 18,
    color: Colors.red,
    fontWeight: '600',
  },
  painPointText: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  emotionalText: {
    fontSize: 16,
    color: Colors.accent,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ProblemScreen;
