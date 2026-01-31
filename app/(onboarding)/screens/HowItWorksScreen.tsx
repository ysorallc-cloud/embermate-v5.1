// ============================================================================
// HOW IT WORKS SCREEN - Simple 3-step workflow
// Slide 5: "Simple Daily Workflow"
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { num: '1', title: 'Quick Check-In', desc: 'Log vitals & meds in 2 minutes', time: 'Morning' },
  { num: '2', title: 'AI Analyzes', desc: 'Patterns spotted automatically', time: 'Ongoing' },
  { num: '3', title: 'Share Insights', desc: 'Reports ready for doctors', time: 'Anytime' },
];

export const HowItWorksScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Header emoji */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.emojiContainer}
        >
          <Text style={styles.emoji}>📱</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          Simple Daily Workflow
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          3 steps to better care
        </Animated.Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(500 + index * 200).duration(400)}
              style={styles.stepCard}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.num}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
                <Text style={styles.stepTime}>{step.time}</Text>
              </View>
              {index < STEPS.length - 1 && (
                <View style={styles.connector} />
              )}
            </Animated.View>
          ))}
        </View>

        {/* CTA hint */}
        <Animated.Text
          entering={FadeInDown.delay(1200).duration(600)}
          style={styles.ctaHint}
        >
          See it in action →
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
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 56,
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
  stepsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: Spacing.xl,
  },
  stepCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    position: 'relative',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  stepTime: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
  },
  connector: {
    position: 'absolute',
    left: 33,
    bottom: -16,
    width: 2,
    height: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
  },
  ctaHint: {
    fontSize: 14,
    color: Colors.accent,
    textAlign: 'center',
  },
});

export default HowItWorksScreen;
