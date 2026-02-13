// ============================================================================
// PRIVACY SCREEN - Positive privacy framing, trust building
// Slide 6: "Your Data, Your Control"
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIVACY_POINTS = [
  { icon: '📱', title: 'Stays on your device', desc: 'No cloud storage required' },
  { icon: '🔐', title: 'Encrypted', desc: 'Bank-level security' },
  { icon: '👤', title: 'You control sharing', desc: 'Share only what you choose' },
  { icon: '🚫', title: 'No selling data', desc: 'Ever. Period.' },
];

export const PrivacyScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Header emoji */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.emojiContainer}
        >
          <Text style={styles.emoji}>🔒</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.title}
        >
          Your Data, Your Control
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.subtitle}
        >
          We take your trust seriously
        </Animated.Text>

        {/* Privacy points */}
        <View style={styles.privacyContainer}>
          {PRIVACY_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(500 + index * 150).duration(400)}
              style={styles.privacyRow}
            >
              <Text style={styles.privacyIcon}>{point.icon}</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>{point.title}</Text>
                <Text style={styles.privacyDesc}>{point.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Disclaimer note - positive framing */}
        <Animated.View
          entering={FadeInDown.delay(1100).duration(600)}
          style={styles.disclaimerCard}
        >
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            EmberMate is for personal tracking, not medical diagnosis. Always consult healthcare professionals for medical advice.
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
  privacyContainer: {
    width: '100%',
    gap: 16,
    marginBottom: Spacing.xl,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 28,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  disclaimerCard: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 10,
    padding: 14,
  },
  disclaimerIcon: {
    fontSize: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

export default PrivacyScreen;
