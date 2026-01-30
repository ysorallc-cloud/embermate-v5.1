import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../app/_theme/theme-tokens';

interface QuickAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface Props {
  actions: QuickAction[];
}

export const QuickActionGrid: React.FC<Props> = ({ actions }) => (
  <View style={styles.container}>
    {actions.map((action, i) => (
      <TouchableOpacity
        key={i}
        style={[
          styles.button,
          action.color && {
            backgroundColor: `${action.color}10`,
            borderColor: `${action.color}25`,
          },
        ]}
        onPress={action.onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{action.icon}</Text>
        <Text style={styles.label}>{action.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

export default QuickActionGrid;
