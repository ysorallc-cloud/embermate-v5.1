import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme/theme-tokens';

interface Props {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const SectionHeader: React.FC<Props> = ({ title, action }) => (
  <View style={styles.container} accessibilityRole="header">
    <Text style={styles.title} accessibilityRole="header">
      {title.toUpperCase()}
    </Text>
    {action && (
      <TouchableOpacity
        onPress={action.onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={`Tap to ${action.label.toLowerCase()}`}
      >
        <Text style={styles.action}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  action: {
    ...Typography.labelSmall,
    color: Colors.accent,
  },
});

export default SectionHeader;
