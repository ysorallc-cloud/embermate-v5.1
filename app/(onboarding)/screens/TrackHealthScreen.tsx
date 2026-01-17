import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AuroraBackground } from '../components/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { Colors, Typography, Spacing } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const features = [
  { icon: '🍼', title: 'Meals', color: 'rgba(100, 200, 150, 0.6)' },
  { icon: '💤', title: 'Sleep', color: 'rgba(120, 140, 200, 0.6)' },
  { icon: '🚽', title: 'Bathroom', color: 'rgba(200, 150, 100, 0.6)' },
  { icon: '🏃', title: 'Activity', color: 'rgba(150, 100, 200, 0.6)' },
];

export const TrackHealthScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="track" />

      <View style={styles.content}>
        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Track Health Simply</Text>
          <Text style={styles.subtitle}>
            Log meals, sleep, bathroom, and activity in seconds
          </Text>
        </View>

        {/* Feature grid */}
        <View style={styles.grid}>
          {features.map((feature, index) => (
            <GlassCard
              key={index}
              style={styles.featureCard}
              glow={feature.color}
              padding={Spacing.lg}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Quick, intuitive logging designed for sleep-deprived parents
        </Text>
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
    paddingHorizontal: Spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  featureCard: {
    width: (SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.lg) / 2,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  featureTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TrackHealthScreen;
