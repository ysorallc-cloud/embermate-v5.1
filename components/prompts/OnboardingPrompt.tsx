import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface OnboardingPromptProps {
  onShowMeWhatMatters: () => void;
  onExploreOnMyOwn: () => void;
}

export const OnboardingPrompt: React.FC<OnboardingPromptProps> = ({
  onShowMeWhatMatters,
  onExploreOnMyOwn,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EmberMate</Text>
      <Text style={styles.subtitle}>How would you like to get started?</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onShowMeWhatMatters}
        accessibilityLabel="Show me what matters"
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Show me what matters</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onExploreOnMyOwn}
        accessibilityLabel="Explore on my own"
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Explore on my own</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
