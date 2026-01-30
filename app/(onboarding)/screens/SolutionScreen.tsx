// ============================================================================
// SOLUTION SCREEN - Clear value proposition with quantified benefits
// Slide 2: "One App. Complete Care."
// ============================================================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Typography, Spacing } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BENEFITS = [
  { icon: '✓', text: 'Never miss a medication', value: '98% adherence' },
  { icon: '✓', text: 'Spot health patterns instantly', value: 'AI insights' },
  { icon: '✓', text: 'Keep everyone in sync', value: 'Real-time' },
  { icon: '✓', text: 'Ready for doctor visits', value: '1-tap reports' },
];

export const SolutionScreen: React.FC = () => {
  const fireScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    fireScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const fireAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Animated fire emoji with glow */}
        <View style={styles.emojiContainer}>
          <Animated.View style={[styles.glow, glowAnimatedStyle]} />
          <Animated.View style={fireAnimatedStyle}>
            <Text style={styles.emoji}>🔥</Text>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          One App. Complete Care.
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          EmberMate brings everything together so nothing falls through the cracks
        </Animated.Text>

        {/* Benefits list */}
        <View style={styles.benefitsContainer}>
          {BENEFITS.map((benefit, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(600 + index * 150).duration(400)}
              style={styles.benefitCard}
            >
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitText}>{benefit.text}</Text>
                <Text style={styles.benefitValue}>{benefit.value}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Closing tagline */}
        <Animated.Text
          entering={FadeInDown.delay(1200).duration(600)}
          style={styles.tagline}
        >
          Everything you need. Nothing overwhelming.
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(232, 155, 95, 0.3)',
  },
  emoji: {
    fontSize: 64,
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
  benefitsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  benefitIcon: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '600',
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  benefitValue: {
    fontSize: 12,
    color: '#6ee7b7',
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SolutionScreen;
