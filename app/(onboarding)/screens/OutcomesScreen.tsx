// ============================================================================
// OUTCOMES SCREEN - Social proof with quantified results
// Slide 3: "What You'll Achieve"
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OUTCOMES = [
  { emoji: '⏱️', title: 'Save 45 min/week', desc: 'No more hunting for information' },
  { emoji: '💊', title: '98% medication adherence', desc: 'Smart reminders that actually work' },
  { emoji: '🔍', title: 'Catch patterns early', desc: 'AI spots what you might miss' },
  { emoji: '👥', title: 'Better teamwork', desc: 'Everyone stays informed' },
];

export const OutcomesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Header emoji */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.emojiContainer}
        >
          <Text style={styles.emoji}>🎯</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          What You'll Achieve
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          Real caregivers, real results
        </Animated.Text>

        {/* Outcomes grid */}
        <View style={styles.outcomesContainer}>
          {OUTCOMES.map((outcome, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(500 + index * 150).duration(400)}
              style={styles.outcomeCard}
            >
              <Text style={styles.outcomeEmoji}>{outcome.emoji}</Text>
              <View style={styles.outcomeContent}>
                <Text style={styles.outcomeTitle}>{outcome.title}</Text>
                <Text style={styles.outcomeDesc}>{outcome.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Testimonial quote */}
        <Animated.View
          entering={FadeInDown.delay(1100).duration(600)}
          style={styles.testimonialCard}
        >
          <Text style={styles.testimonialQuote}>
            "EmberMate saved us hours and gave us peace of mind."
          </Text>
          <Text style={styles.testimonialAuthor}>
            — Sarah, daughter caregiver
          </Text>
        </Animated.View>
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
  outcomesContainer: {
    width: '100%',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  outcomeCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
  },
  outcomeEmoji: {
    fontSize: 32,
  },
  outcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  outcomeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  outcomeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  testimonialCard: {
    width: '100%',
    backgroundColor: Colors.greenTint,
    borderWidth: 1,
    borderColor: Colors.greenStrong,
    borderRadius: 12,
    padding: 16,
  },
  testimonialQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#d1d5db',
    marginBottom: 8,
    lineHeight: 22,
  },
  testimonialAuthor: {
    fontSize: 12,
    color: '#6ee7b7',
    fontWeight: '500',
  },
});

export default OutcomesScreen;
