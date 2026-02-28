// ============================================================================
// WELCOME SCREEN - What this app does
// Screen 1 of 3: Value proposition with key features
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VALUE_POINTS = [
  { icon: '\u{1F48A}', title: 'Medication tracking', desc: 'Smart reminders so nothing is missed' },
  { icon: '\u{1F4CA}', title: 'Health insights', desc: 'Patterns that reveal what matters' },
  { icon: '\u{1F512}', title: 'Private by design', desc: 'Your data stays on your device' },
];

export const WelcomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.emoji}>
          {'\u{1F525}'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(300)} style={styles.title}>
          Track care. Spot patterns.{'\n'}Stay organized.
        </Animated.Text>
        <View style={styles.pointsContainer}>
          {VALUE_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 100).duration(300)}
              style={styles.pointRow}
            >
              <Text style={styles.pointIcon}>{point.icon}</Text>
              <View style={styles.pointContent}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointDesc}>{point.desc}</Text>
              </View>
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
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 34,
  },
  pointsContainer: {
    width: '100%',
    gap: 20,
    marginTop: Spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pointIcon: {
    fontSize: 32,
  },
  pointContent: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pointDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default WelcomeScreen;
