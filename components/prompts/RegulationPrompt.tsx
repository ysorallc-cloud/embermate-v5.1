import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface RegulationPromptProps {
  message: string;
  onDismiss: () => void;
}

export const RegulationPrompt: React.FC<RegulationPromptProps> = ({
  message,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismissButton}
        accessibilityLabel="Dismiss regulation prompt"
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.purpleMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dismissButton: {
    alignSelf: 'flex-end',
  },
  dismissText: {
    fontSize: 13,
    color: Colors.accent,
  },
});
