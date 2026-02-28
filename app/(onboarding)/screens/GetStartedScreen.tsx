// ============================================================================
// GET STARTED SCREEN - Two-option choice to begin
// Screen 3 of 3: Start Fresh vs Explore with Sample Data
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onComplete: (seedData: boolean) => void;
}

export const GetStartedScreen: React.FC<Props> = ({ onComplete }) => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.title}>
          Let's set up in 2 minutes
        </Animated.Text>

        {/* Option A: Start Fresh */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => onComplete(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start fresh, add your own medications and care tasks"
          >
            <Text style={styles.optionEmoji}>{'\u2728'}</Text>
            <Text style={styles.optionTitle}>Start Fresh</Text>
            <Text style={styles.optionSubtitle}>Add your own medications and care tasks</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Option B: Sample Data */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardSecondary]}
            onPress={() => onComplete(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Explore with sample data, see 7 days of tracking to learn how it works"
          >
            <Text style={styles.optionEmoji}>{'\u{1F4CA}'}</Text>
            <Text style={styles.optionTitle}>Explore with Sample Data</Text>
            <Text style={styles.optionSubtitle}>See 7 days of tracking to learn how it works</Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  optionCard: {
    width: '100%',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  optionCardSecondary: {
    borderColor: Colors.accentHint,
  },
  optionEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default GetStartedScreen;
