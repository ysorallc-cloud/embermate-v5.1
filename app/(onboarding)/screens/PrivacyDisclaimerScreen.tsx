// ============================================================================
// PRIVACY + DISCLAIMER SCREEN - Combined privacy & medical disclaimer
// Screen 2 of 3: Checkbox must be checked before parent enables Next
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Linking, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onDisclaimerAccepted: (accepted: boolean) => void;
}

const PRIVACY_POINTS = [
  { icon: '\u{1F4F1}', text: 'Stays on your device \u2014 no cloud required' },
  { icon: '\u{1F510}', text: 'AES-256 encrypted storage' },
  { icon: '\u{1F464}', text: 'You control what\'s shared' },
  { icon: '\u{1F6AB}', text: 'We never sell your data' },
];

export const PrivacyDisclaimerScreen: React.FC<Props> = ({ onDisclaimerAccepted }) => {
  const [accepted, setAccepted] = useState(false);

  const toggleAccepted = () => {
    const newValue = !accepted;
    setAccepted(newValue);
    onDisclaimerAccepted(newValue);
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.emoji}>
          {'\u{1F512}'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(300)} style={styles.title}>
          Before we start
        </Animated.Text>

        {/* Privacy points */}
        <View style={styles.privacyContainer}>
          {PRIVACY_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 80).duration(300)}
              style={styles.privacyRow}
            >
              <Text style={styles.privacyIcon}>{point.icon}</Text>
              <Text style={styles.privacyText}>{point.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Medical disclaimer */}
        <Animated.View entering={FadeInDown.delay(650).duration(300)} style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            EmberMate is a personal tracking tool, not a medical device. It is not a substitute for
            professional medical advice. You are responsible for your data and backups.
          </Text>
        </Animated.View>

        {/* Checkbox */}
        <Animated.View entering={FadeInDown.delay(750).duration(300)} style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={toggleAccepted}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="I understand this is not a medical device and accept the terms of use"
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand this is not a medical device and accept the{' '}
              <Text
                style={styles.link}
                onPress={() => Linking.openURL('https://ysorallc.org/terms')}
              >
                terms of use
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 120,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  privacyContainer: {
    width: '100%',
    gap: 16,
    marginBottom: Spacing.xxl,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIcon: {
    fontSize: 24,
  },
  privacyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    flex: 1,
  },
  disclaimerCard: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.amber,
    marginBottom: Spacing.sm,
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  checkboxContainer: {
    width: '100%',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.textPlaceholder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
});

export default PrivacyDisclaimerScreen;
