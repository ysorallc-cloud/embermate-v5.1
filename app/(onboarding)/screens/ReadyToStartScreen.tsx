// ============================================================================
// READY TO START SCREEN - Exciting ending with clear next steps
// Slide 7: "Let's Care Together"
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReadyToStartScreenProps {
  onAccept: (seedData: boolean) => void;
}

const SETUP_STEPS = [
  { icon: '👤', text: 'Add patient info' },
  { icon: '💊', text: 'Import medications' },
  { icon: '✓', text: 'Start tracking' },
];

export const ReadyToStartScreen: React.FC<ReadyToStartScreenProps> = ({ onAccept }) => {
  const [seedData, setSeedData] = useState(false);

  const rocketScale = useSharedValue(1);

  useEffect(() => {
    rocketScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(rocketScale);
    };
  }, []);

  const rocketAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rocketScale.value }],
  }));

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Header emoji */}
        <Animated.View
          style={[styles.emojiContainer, rocketAnimatedStyle]}
        >
          <Text style={styles.emoji}>🚀</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          Let's Care Together
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          Get started in 2 minutes
        </Animated.Text>

        {/* Setup steps */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.stepsCard}
        >
          {SETUP_STEPS.map((step, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(700 + index * 100).duration(400)}
              style={styles.stepRow}
            >
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Sample data checkbox */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(600)}
          style={styles.checkboxContainer}
        >
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSeedData(!seedData)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, seedData && styles.checkboxChecked]}>
              {seedData && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Add sample data to explore (7 days of tracking)
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View
          entering={FadeInDown.delay(1100).duration(600)}
          style={styles.ctaContainer}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => onAccept(seedData)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Accept & Begin Your Journey</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom note */}
        <Animated.Text
          entering={FadeInDown.delay(1200).duration(600)}
          style={styles.bottomNote}
        >
          By continuing, you accept our terms and privacy policy
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
    paddingBottom: 40,
  },
  emojiContainer: {
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  stepIcon: {
    fontSize: 22,
  },
  stepText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  checkboxContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  ctaContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default ReadyToStartScreen;
