import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AuroraBackground } from '../components/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { Colors, Typography, Spacing } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UnderstandPatternsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="understand" />

      <View style={styles.content}>
        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Understand Patterns</Text>
          <Text style={styles.subtitle}>
            AI finds connections between medications, vitals, sleep, and symptoms
          </Text>
        </View>

        {/* Example correlation card */}
        <GlassCard style={styles.exampleCard} glow="rgba(140, 100, 200, 0.5)">
          <View style={styles.correlationHeader}>
            <Text style={styles.aiLabel}>✨ AI Insight</Text>
          </View>

          <View style={styles.correlationContent}>
            <View style={styles.correlationRow}>
              <Text style={styles.correlationIcon}>😴</Text>
              <View style={styles.correlationBar}>
                <View style={[styles.correlationBarFill, { width: '65%', backgroundColor: 'rgba(255, 150, 150, 0.8)' }]} />
              </View>
            </View>

            <Text style={styles.correlationText}>
              When sleep is under 6 hours
            </Text>

            <View style={styles.arrow}>
              <Text style={styles.arrowText}>↓</Text>
            </View>

            <View style={styles.correlationRow}>
              <Text style={styles.correlationIcon}>🫀</Text>
              <View style={styles.correlationBar}>
                <View style={[styles.correlationBarFill, { width: '85%', backgroundColor: 'rgba(255, 100, 100, 0.8)' }]} />
              </View>
            </View>

            <Text style={styles.correlationText}>
              Blood pressure is 12% higher
            </Text>
          </View>

          <Text style={styles.confidence}>92% confidence · 8 occurrences</Text>
        </GlassCard>

        {/* Description */}
        <Text style={styles.description}>
          Discover what matters for your loved one's health
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
  exampleCard: {
    marginBottom: Spacing.xxxl,
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  aiLabel: {
    ...Typography.caption,
    color: 'rgba(200, 150, 255, 1)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  correlationContent: {
    marginBottom: Spacing.lg,
  },
  correlationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  correlationIcon: {
    fontSize: 32,
  },
  correlationBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  correlationBarFill: {
    height: '100%',
    backgroundColor: 'rgba(150, 255, 200, 0.8)',
    borderRadius: 4,
  },
  correlationText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  arrow: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  arrowText: {
    fontSize: 24,
    color: 'rgba(200, 150, 255, 0.8)',
  },
  confidence: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UnderstandPatternsScreen;
