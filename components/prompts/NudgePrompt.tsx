import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';

interface NudgePromptProps {
  message: string;
  route: string;
  category: string;
}

export const NudgePrompt: React.FC<NudgePromptProps> = ({
  message,
  route,
  category,
}) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigate(route)}
      activeOpacity={0.7}
      accessibilityLabel={`${category} nudge: ${message}`}
      accessibilityRole="link"
    >
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.sageLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: Colors.accent,
    marginLeft: 8,
  },
});
