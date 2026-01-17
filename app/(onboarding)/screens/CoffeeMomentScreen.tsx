import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { DisclaimerModal } from '../components/DisclaimerModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onAccept: (seedData: boolean) => void;
}

export const CoffeeMomentScreen: React.FC<Props> = ({ onAccept }) => {
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [sampleDataChecked, setSampleDataChecked] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Breathing orb animation
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    // Breathing effect
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <AuroraBackground variant="coffee" />

      <View style={styles.content}>
        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>One Last Thing...</Text>
          <Text style={styles.subtitle}>Before we begin</Text>
        </View>

        {/* Breathing orb */}
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.orb, orbAnimatedStyle]} />
          <Text style={styles.orbEmoji}>☕</Text>
        </View>

        {/* Disclaimer card */}
        <GlassCard style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Important Notice</Text>
          <Text style={styles.disclaimerText}>
            EmberMate is not HIPAA-compliant and is for personal tracking only,
            not medical diagnosis or treatment.
          </Text>

          {/* Checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
          >
            <View style={[styles.checkbox, disclaimerChecked && styles.checkboxChecked]}>
              {disclaimerChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand and accept these limitations
            </Text>
          </Pressable>

          {/* Read full disclaimer link */}
          <Pressable
            style={styles.readMoreButton}
            onPress={() => setShowDisclaimerModal(true)}
          >
            <Text style={styles.readMoreText}>Read Full Disclaimer</Text>
          </Pressable>

          {/* Sample data checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setSampleDataChecked(!sampleDataChecked)}
          >
            <View style={[styles.checkbox, sampleDataChecked && styles.checkboxChecked]}>
              {sampleDataChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Add sample data to explore the app (optional)
            </Text>
          </Pressable>

          {/* Accept button */}
          <Pressable
            style={[styles.acceptButton, !disclaimerChecked && styles.acceptButtonDisabled]}
            onPress={() => onAccept(sampleDataChecked)}
            disabled={!disclaimerChecked}
          >
            <Text style={[styles.acceptButtonText, !disclaimerChecked && styles.acceptButtonTextDisabled]}>
              Accept & Continue
            </Text>
          </Pressable>
        </GlassCard>
      </View>

      {/* Disclaimer modal */}
      <DisclaimerModal
        visible={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
      />
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
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: Spacing.xxxl,
  },
  orb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(200, 150, 100, 0.3)',
    shadowColor: 'rgba(200, 150, 100, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  orbEmoji: {
    fontSize: 48,
  },
  disclaimerCard: {
    marginBottom: Spacing.xl,
  },
  disclaimerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  disclaimerText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  readMoreButton: {
    marginBottom: Spacing.xl,
  },
  readMoreText: {
    ...Typography.body,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  acceptButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  acceptButtonText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  acceptButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

export default CoffeeMomentScreen;
