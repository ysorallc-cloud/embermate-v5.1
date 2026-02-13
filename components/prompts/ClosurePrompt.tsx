import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface ClosurePromptProps {
  message: string;
}

export const ClosurePrompt: React.FC<ClosurePromptProps> = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✨</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.greenTint,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
