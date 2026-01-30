// ============================================================================
// FEATURES SCREEN - Key features with benefit context
// Slide 4: "Everything You Need"
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  { icon: '💊', title: 'Medication Tracking', desc: 'Never miss a dose', color: '#fbbf24' },
  { icon: '🫀', title: 'Health Monitoring', desc: 'Vitals, symptoms, patterns', color: '#fb7185' },
  { icon: '📊', title: 'AI Insights', desc: 'Understand what affects health', color: '#8b5cf6' },
  { icon: '👥', title: 'Care Coordination', desc: 'Share with family & doctors', color: '#14B8A6' },
];

export const FeaturesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Header emoji */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.emojiContainer}
        >
          <Text style={styles.emoji}>⚡</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          Everything You Need
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          Purpose-built for caregivers
        </Animated.Text>

        {/* Features grid */}
        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(500 + index * 150).duration(400)}
              style={[
                styles.featureCard,
                {
                  backgroundColor: `${feature.color}15`,
                  borderColor: `${feature.color}40`,
                }
              ]}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </Animated.View>
          ))}
        </View>
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
  featuresGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default FeaturesScreen;
