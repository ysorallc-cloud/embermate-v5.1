import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface OrientationPromptProps {
  message: string;
  pendingCount: number;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  message,
  pendingCount,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
